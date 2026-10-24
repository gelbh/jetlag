import {
  clampExpectedMs,
  emptyRateState,
  RATE_WARMUP_SAMPLES,
  type RateState,
  seedRate,
  timedFraction,
  timedRemainingMs,
  updateRate,
} from "./estimator";

export type LoadPriority = "foreground" | "background";

export type StageKind = "queue" | "fetch" | "download" | "parse" | "compute" | "refine" | "group";

export interface StageSpec {
  kind: StageKind;
  /** Short user-facing text, e.g. "Searching map data". */
  label: string;
  /** Duration history key, e.g. "overpass:matching-point". */
  historyKey: string;
  /** History size bucket (log2 of area or input count). */
  sizeBucket?: number;
  /** Overrides the history lookup, e.g. a duration derived from a known rate limit. */
  expectedMs?: number;
  /** Children run concurrently: remaining time is the max, not the sum. */
  parallel?: boolean;
}

export type StageOutcome = "done" | "cancelled";

export interface ProgressTreeOptions {
  now: () => number;
  /** Expected duration for a stage, from history or priors. */
  expectedMs: (spec: StageSpec) => number;
  onChange?: () => void;
  onStageFinish?: (spec: StageSpec, durationMs: number) => void;
}

type NodeStatus = "pending" | "queued" | "running" | "done" | "cancelled";

export class ProgressNode {
  readonly spec: StageSpec;
  readonly children: ProgressNode[] = [];
  private readonly tree: ProgressTreeOptions;
  private readonly parent: ProgressNode | null;
  private status: NodeStatus = "pending";
  private startedAt: number | null = null;
  private finishedAt: number | null = null;
  private expected: number;
  private count: { done: number; total: number } | null = null;
  private rate: RateState = emptyRateState();
  private frozenCredit = 0;
  /** Time already spent when the node split; the parts' work comes on top of it. */
  private splitElapsedMs = 0;
  private splitCount = 0;
  private mirrorSource: ProgressNode | null = null;
  private labelOverride: string | null = null;
  private queueLabel: string | null = null;
  private queueWaitMs = 0;

  constructor(spec: StageSpec, tree: ProgressTreeOptions, parent: ProgressNode | null) {
    this.spec = spec;
    this.tree = tree;
    this.parent = parent;
    this.expected = clampExpectedMs(spec.expectedMs ?? tree.expectedMs(spec));
  }

  get isSplit(): boolean {
    return this.splitCount > 0;
  }

  get isFinished(): boolean {
    return this.status === "done" || this.status === "cancelled";
  }

  /** Running or waiting for a slot; either way it is the stage the user is waiting on. */
  get isRunning(): boolean {
    return this.status === "running" || this.status === "queued";
  }

  get parentNode(): ProgressNode | null {
    return this.parent;
  }

  get label(): string {
    if (this.status === "queued" && this.queueLabel !== null) {
      return this.queueLabel;
    }
    return this.labelOverride ?? this.spec.label;
  }

  /** Adds a child stage. Children are expected to run in the order added. */
  stage(spec: StageSpec): ProgressNode {
    const child = new ProgressNode(spec, this.tree, this);
    this.children.push(child);
    this.notify();
    return child;
  }

  /**
   * Marks the stage as waiting for a concurrency slot. Its own timer does not
   * start until {@link start}, so queue time never pollutes duration history.
   */
  queue(label: string, expectedWaitMs: number): void {
    if (this.status !== "pending" && this.status !== "queued") {
      return;
    }
    this.status = "queued";
    this.queueLabel = label;
    this.queueWaitMs = Math.max(0, expectedWaitMs);
    this.parent?.start();
    this.notify();
  }

  start(): this {
    if (this.status === "pending" || this.status === "queued") {
      this.status = "running";
      this.startedAt = this.tree.now();
      this.parent?.start();
      this.notify();
    }
    return this;
  }

  setLabel(label: string | null): void {
    this.labelOverride = label;
    this.notify();
  }

  /** Overrides the expected duration, e.g. once a queue position is known. */
  setExpectedMs(expectedMs: number): void {
    this.expected = clampExpectedMs(expectedMs);
    this.notify();
  }

  seedRate(itemsPerMs: number): void {
    this.rate = seedRate(this.rate, itemsPerMs);
  }

  setCount(done: number, total: number): void {
    this.start();
    const safeTotal = Math.max(1, total);
    const safeDone = Math.min(Math.max(0, done), safeTotal);
    this.count = { done: safeDone, total: safeTotal };
    this.rate = updateRate(this.rate, safeDone, this.tree.now());
    this.notify();
  }

  /** Follows another node's progress, e.g. a shared in-flight fetch. */
  mirror(source: ProgressNode): void {
    this.mirrorSource = source;
    this.start();
    this.notify();
  }

  /**
   * Replaces this unfinished node's remaining work with `n` equal children.
   * Progress already shown is frozen so the bar does not move backwards.
   */
  split(n: number, spec: StageSpec): ProgressNode[] {
    if (this.isFinished || n <= 0) {
      return [];
    }
    this.start();
    this.frozenCredit = this.fraction();
    this.splitElapsedMs = this.durationMs() ?? 0;
    this.splitCount += n;
    const created: ProgressNode[] = [];
    for (let index = 0; index < n; index += 1) {
      const child = new ProgressNode(spec, this.tree, this);
      this.children.push(child);
      created.push(child);
    }
    this.notify();
    return created;
  }

  finish(): void {
    this.end("done");
  }

  cancel(): void {
    for (const child of this.children) {
      child.cancel();
    }
    this.end("cancelled");
  }

  private end(outcome: StageOutcome): void {
    if (this.isFinished) {
      return;
    }
    const now = this.tree.now();
    const startedAt = this.startedAt ?? now;
    this.status = outcome;
    this.finishedAt = now;
    if (outcome === "done") {
      for (const child of this.children) {
        if (!child.isFinished) {
          child.finish();
        }
      }
      if (this.mirrorSource === null && this.spec.kind !== "group") {
        this.tree.onStageFinish?.(this.spec, now - startedAt);
      }
    }
    this.notify();
  }

  /** Expected total duration, used as this node's weight inside its parent. */
  weight(): number {
    if (this.mirrorSource) {
      return this.mirrorSource.weight();
    }
    if (this.children.length > 0 && !this.isSplit) {
      const weights = this.children.map((child) => child.weight());
      return this.spec.parallel ? Math.max(...weights) : weights.reduce((a, b) => a + b, 0);
    }
    if (this.isSplit) {
      // A split adds real work: the expected total grows so the ETA and overdue
      // check track the remaining parts instead of the original single query.
      const parts = this.children.slice(-this.splitCount);
      const partsWeight = parts.reduce((sum, child) => sum + child.weight(), 0);
      return Math.max(this.expected, this.splitElapsedMs + partsWeight);
    }
    return this.expected;
  }

  fraction(): number {
    if (this.status === "done") {
      return 1;
    }
    if (this.status === "cancelled") {
      return 0;
    }
    if (this.mirrorSource) {
      return this.mirrorSource.fraction();
    }
    if (this.children.length > 0) {
      const children = this.isSplit ? this.children.slice(-this.splitCount) : this.children;
      const totalWeight = children.reduce((sum, child) => sum + child.weight(), 0);
      const childFraction =
        totalWeight > 0
          ? children.reduce((sum, child) => sum + child.weight() * child.fraction(), 0) /
            totalWeight
          : 0;
      return this.isSplit
        ? this.frozenCredit + (1 - this.frozenCredit) * childFraction
        : childFraction;
    }
    if (this.count) {
      return this.count.done / this.count.total;
    }
    if (this.status === "running" && this.startedAt !== null) {
      return timedFraction(this.tree.now() - this.startedAt, this.expected);
    }
    return 0;
  }

  remainingMs(): number {
    if (this.isFinished) {
      return 0;
    }
    if (this.mirrorSource) {
      return this.mirrorSource.remainingMs();
    }
    if (this.children.length > 0) {
      const remaining = this.children.map((child) => child.remainingMs());
      return this.spec.parallel ? Math.max(0, ...remaining) : remaining.reduce((a, b) => a + b, 0);
    }
    if (this.count) {
      const left = this.count.total - this.count.done;
      if (this.rate.rate !== null && this.rate.rate > 0) {
        return left / this.rate.rate;
      }
      return this.expected * (1 - this.count.done / this.count.total);
    }
    if (this.status === "running" && this.startedAt !== null) {
      return timedRemainingMs(this.tree.now() - this.startedAt, this.expected);
    }
    if (this.status === "queued") {
      return this.queueWaitMs + this.expected;
    }
    return this.expected;
  }

  /** True once a counted stage in this subtree has enough rate samples to trust. */
  hasWarmRate(): boolean {
    if (this.mirrorSource) {
      return this.mirrorSource.hasWarmRate();
    }
    if (this.rate.samples >= RATE_WARMUP_SAMPLES) {
      return true;
    }
    return this.children.some((child) => child.hasWarmRate());
  }

  /** Deepest running stage, whose label is shown to the user. */
  activeLeaf(): ProgressNode {
    if (this.mirrorSource) {
      const mirrored = this.mirrorSource.activeLeaf();
      return mirrored === this.mirrorSource ? this : mirrored;
    }
    const running = this.children.find((child) => child.isRunning);
    return running ? running.activeLeaf() : this;
  }

  durationMs(): number | null {
    if (this.startedAt === null) {
      return null;
    }
    return (this.finishedAt ?? this.tree.now()) - this.startedAt;
  }

  private notify(): void {
    this.tree.onChange?.();
  }
}

export function createProgressRoot(label: string, options: ProgressTreeOptions): ProgressNode {
  return new ProgressNode({ kind: "group", label, historyKey: "task" }, options, null);
}
