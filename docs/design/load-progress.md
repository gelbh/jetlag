# Load Progress and ETA Design

Status: draft for review. Target: one PR.

## Problem

Every slow search in the app shows a spinner and a fixed sentence ("Finding nearest feature…"). The only escalation is in `LoadingReadout` (`src/components/tools/shared/readout/LoadingReadout.tsx`): after 10 seconds it adds "Map data is still loading". A matching question can sit behind that spinner for over a minute, and the user cannot tell whether the app is working, waiting, or stuck.

Three facts from the code make the wait longer than it needs to be and invisible:

1. Every Overpass request goes through one pool of 2 slots (`src/services/geo/overpass/requestQueue.ts`), and the background game-area preload (`src/services/session/gameAreaPreload.ts`) uses the same pool. A user question can queue behind preload jobs. One proxy request can hold a slot for 2 attempts of up to 80 seconds each.
2. `queryOverpassWithBboxSplit` (`src/services/geo/overpass/overpassBboxSplit.ts`) recursively splits a bbox into quadrants when Overpass reports the query as too expensive. The number of requests is not known up front.
3. Nothing can be cancelled. `useLatestRequest` and the generation refs drop stale results, but the network requests, retries, and backoff sleeps keep running and keep holding pool slots.

Some sites show no indicator at all: randomized auto-ask, the elimination-mask rebuild, the hider truth reveal after answering, preset boundary loading, and screenshot capture.

## Goals

- Every load that can exceed about 1 second shows a named stage, a percent bar that only moves forward, and a time estimate.
- A user's own question is never queued behind background preload.
- Searches the user started can be cancelled, and cancelling frees the network slot.
- One shared mechanism serves all sites; no site gets bespoke progress code beyond declaring its stages.

## Non-goals

- Server-side progress from Overpass or the Firebase proxy. Overpass exposes none.
- Moving main-thread geometry into workers. This design only yields so the UI can repaint between stages.
- Changing retry counts, timeouts, or cache TTLs.

## Decisions Already Made

| Question | Decision |
| --- | --- |
| Percent bar where work is not countable | Always show a percent bar. Uncountable stages use a time model learned from past durations. |
| Root cause | In scope: foreground priority in the Overpass pool, and `AbortSignal` through `queryOverpass`. |
| Rollout | One PR covering every site listed below. |

## Architecture Overview

```
site hook (useMatchingTool, …)
  └─ createLoadTask({ label, priority, stages })        services/core/progress/loadTask.ts
       ├─ task.signal  ──────────────► queryOverpass / fetch / elevation (abort)
       ├─ task.stage("fetch", …)      ──► ProgressTree node            domain/progress/progressTree.ts
       └─ task.subscribe()             ──► useLoadTask(task)             hooks/progress/useLoadTask.ts
                                             └─ <LoadingReadout task> (bar, stage, ETA, Cancel)
estimator (pure)                       domain/progress/estimator.ts
duration history (IndexedDB)           services/core/progress/durationHistory.ts
```

The pure parts (tree, estimator) live in `src/domain/progress/` and have no I/O. The task object, history store, and queue changes live in `src/services/`. React only reads snapshots.

## Reporter API

### LoadTask

```ts
type LoadPriority = "foreground" | "background";

interface LoadTaskOptions {
  /** Shown above the bar, e.g. "Finding nearest museum". */
  label: string;
  priority?: LoadPriority; // default "foreground"
  /** Parent signal, e.g. a component unmount controller. */
  signal?: AbortSignal;
}

interface LoadTask {
  readonly id: string;
  readonly label: string;
  readonly priority: LoadPriority;
  readonly signal: AbortSignal;
  /** Root node of this task's progress tree. */
  readonly root: ProgressNode;
  cancel(): void;
  /** Marks the task finished; the bar animates to 100% and the readout unmounts. */
  complete(): void;
  fail(error: unknown): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): LoadTaskSnapshot;
}

function createLoadTask(options: LoadTaskOptions): LoadTask;
```

The task is passed explicitly as an optional `task?: LoadTask` field on the options object each service function already takes (`MatchingFetchOptions`, `SeaLevelSamplingOptions`, and so on). Functions that take no options object gain a trailing `options?: { task?: LoadTask }`. Explicit threading was chosen over a module-level "current task" because loads run concurrently (preload, enrich, foreground) and a global would attribute work to the wrong task.

When `task` is absent, every call behaves exactly as today. Background callers (preload, warm caches) pass no task, or a task with `priority: "background"` when they need the background lane.

### ProgressNode

A task's progress is a tree. Each node is one stage.

```ts
type StageKind =
  | "queue"     // waiting for an Overpass or elevation slot
  | "fetch"     // network request, including retries
  | "download"  // body bytes with a known Content-Length
  | "parse"
  | "compute"   // main-thread geometry (Voronoi, union, simplify)
  | "refine";   // LOD refinement passes

interface StageSpec {
  kind: StageKind;
  /** Short user-facing text, e.g. "Waiting for map server", "Searching map data". */
  label: string;
  /** Key into duration history, e.g. "overpass:matching-point". */
  historyKey: string;
  /** Size bucket for history lookup, see Duration History. */
  sizeBucket?: number;
}

interface ProgressNode {
  /** Adds a child stage. Children run in the order added unless marked parallel. */
  stage(spec: StageSpec): ProgressNode;
  /** Countable progress, e.g. 120 of 600 elevation cells. */
  setCount(done: number, total: number): void;
  /** Replaces this unfinished node's remaining work with `n` equal children (bbox split). */
  split(n: number, spec: StageSpec): ProgressNode[];
  start(): void;
  finish(): void;
}
```

Sites declare their expected stages up front with `stage()` so the bar knows the full plan before work begins. A stage that turns out to be unnecessary (cache hit, bundle covers everything) is finished immediately and its share is credited at once, which moves the bar forward instead of back.

### Snapshot Consumed by React

```ts
interface LoadTaskSnapshot {
  label: string;
  stageLabel: string;      // label of the deepest running stage
  percent: number;         // 0..100, never decreases within a task
  etaMs: number | null;    // null while warming up
  elapsedMs: number;
  overdue: boolean;        // see ETA: elapsed > 1.5 × expected total
  status: "running" | "done" | "cancelled" | "failed";
  cancellable: boolean;
}
```

`useLoadTask(task)` wraps `useSyncExternalStore`. `getSnapshot()` returns the same cached object until the next emit; recomputing per call would loop renders. The task emits at most one change per animation frame and recomputes time-based progress on a 250 ms interval while running, so a stalled network request still advances the bar.

### Shared In-Flight Requests

`getOrFetchCached` (`src/services/geo/cache/index.ts`) deduplicates concurrent fetches of the same key. The first caller may be preload with no task, and the first caller may cancel while a second still waits. So no caller owns the shared fetch; the in-flight entry does:

```ts
interface InFlightEntry<T> {
  promise: Promise<T>;
  controller: AbortController;  // aborts the shared fetch
  node: ProgressNode;           // detached subtree, not part of any task
  priority: LoadPriority;       // mutable; highest priority among live subscribers
  subscribers: number;
}
```

- **Fetcher input.** The fetcher receives `{ signal, priority, node }` from the entry, never from a caller: `getOrFetchCached(key, (ctx) => …, options)`. Fetchers that ignore `ctx` keep working.
- **Progress.** Every subscriber, the first one included, adds a mirror stage to its own task that copies the entry node's fraction and time model. All bars on that key move together.
- **Cancellation.** Each subscriber gets its own promise that rejects with `AbortError` as soon as its own signal aborts, and that decrements `subscribers`. When the count reaches 0, the entry's controller aborts the shared fetch. A preload subscriber with no signal never aborts, which keeps the fetch alive. A cancelled fetch is never written to the cache.
- **Priority.** `priority` is the highest priority among live subscribers and is read on every slot acquisition (see Overpass Pool), so bbox split children issued after a foreground caller joins also use the foreground lane.

### Superseded Requests

Cancel is not only a button. `useLatestRequest` (`src/hooks/forms/useLatestRequest.ts`) gains an `AbortController` per request: `beginRequest()` aborts the previous controller and returns `{ id, signal }`, and `cancelRequests()` aborts the current one. The generation refs in the measuring loaders get the same treatment. A changed anchor, a changed category, or the 400 ms re-resolve in `useMatchingTool` therefore releases the slot held by the request it replaces. Refcounting keeps this safe when the old and new requests share a cache key.

## Estimator Algorithm

### Progress per Node

A node's fraction `f` in [0, 1] comes from one of three models:

1. **Counted.** After `setCount(done, total)`, `f = done / total`.
2. **Timed.** For uncountable work (one Overpass request, a parse, a compute pass), `f` follows the expected duration `E` from duration history:

   ```
   t = elapsed in stage
   f(t) = 0.9 * (t / E)                         for t <= E
   f(t) = 0.9 + 0.09 * (1 - exp(-(t - E) / E))  for t > E
   ```

   The curve reaches 90% at the expected time, then approaches 99% asymptotically. A stage only reaches 100% when `finish()` is called, so a timed stage can never show 100% before the work is done, and it never stops moving. `E` is floored at 50 ms. A queue stage whose slot is free at once is finished immediately instead of timed.
3. **Composite.** A node with children: `f = sum(w_i * f_i) / sum(w_i)`, where each child's weight `w_i` is its expected duration `E_i` from history. Expected time, not a hand-picked percentage, decides how much of the bar each stage owns. A 6-second Overpass request then takes most of the bar and a 50 ms parse takes almost none.

The task percent is the root fraction times 100.

### Monotonic Display

The displayed percent is `max(previousDisplayed, computed)`. Computed progress can drop in three cases: a stage is added late, a bbox split grows the plan, or a countable total grows. In each case the display holds its value until computed progress passes it again. The bar may pause but never moves backwards.

A bbox split is handled structurally so pauses stay short. When an unfinished fetch node with fraction `f0` splits into `n` children, the node keeps `f0` as a frozen credit and divides the remaining `1 - f0` equally among the children. The split children are then timed against the history for the smaller bbox size bucket.

### ETA

Remaining time for the task is the sum of remaining time over unfinished leaves:

- **Timed leaf:** `E - t` while `t < E`. Past `E`, the leaf's remaining time decays as `E * exp(-(t - E) / E) * 0.5`, so the ETA keeps shrinking instead of freezing.
- **Counted leaf:** `(total - done) / rate`. `rate` is an exponential moving average (EMA) of items per millisecond, `rate = 0.3 * sample + 0.7 * rate`, updated on each `setCount`. When the producer has a known pacing, as elevation batches do (`requestGapMsForBatchSize` in `src/services/geo/elevation/rateLimit.ts`), that pacing seeds the rate before the first sample.
- **Unstarted leaf:** `E`.

Display rules keep the number readable and steady:

- No ETA (`etaMs: null`) for the first 1.5 seconds of a task, or until a counted leaf has 3 rate samples, whichever comes first.
- The shown value updates only when the new estimate differs from the shown one by more than 20% or 3 seconds.
- Text buckets: under 5 s "a few seconds", under 60 s rounded to 5 s ("about 25 s left"), otherwise rounded to the half minute ("about 1.5 min left").
- `overdue` is defined once, at task level: elapsed time exceeds 1.5 times the task's total expected duration at start. When `overdue`, the text reads "Taking longer than usual" instead of a number. The bar keeps creeping.

## Duration History

`durationHistory.ts` keeps one record per `(historyKey, sizeBucket)`. All records live in one blob under the single key `progress-history` in the existing IndexedDB store (`src/services/geo/cache/indexedDb.ts`). That store cannot list keys by prefix and expires entries per key, so one blob is simpler: it is read once at startup into memory, and writes are debounced by 2 seconds. `cacheTtlMsForKey` (`cache/memory.ts`) treats `progress-history` as stable. Each record:

```ts
interface DurationRecord {
  emaMs: number;   // alpha 0.3
  samples: number;
  updatedAt: number;
}
```

- **Writes.** On `finish()` of a timed stage, the stage's duration updates the record. Cancelled and failed stages are not recorded, and neither are stages under 30 ms (cache hits). A fetch node that split records its total wall time under its original bucket, including the failed attempt and all children. Otherwise a play area that always splits would never learn its real duration and every run would go overdue. Split children also record under their own smaller buckets.
- **Reads.** At `stage()` time from an in-memory mirror that is hydrated once at startup, so the estimator never awaits IndexedDB.
- **Size bucket.** `floor(log2(area))`, where area is bbox area in km² for network stages and the input count for compute stages (features for Voronoi, annotations for the mask).
- **Fallback.** With no record for the bucket, use the nearest bucket with data scaled linearly by area ratio. With no data for the key, use the prior from the table below.
- **Cap.** The blob keeps at most 64 records. The least recently updated record is evicted first.

## Priors and Stages per Site

The prior durations below are starting guesses, not measurements. They only matter for a device's first runs; history replaces them after one completed sample. During implementation each prior is checked against a local trace of the matching flow with a cold cache and adjusted if it is off by more than 2×.

In the tables, "Count" means the stage reports `setCount` and "Timed" means it uses the time model.

### 1. Matching Question

Files: `useMatchingTool.tsx`, `resolveMatchingAnchor.ts`, `matching/fetch.ts`.

| Stage | Kind | Model | Prior |
| --- | --- | --- | --- |
| Waiting for map server | queue | Count: queue position | 0 s when a slot is free, else 4 s per job ahead |
| Loading bundled places | fetch | Timed | 0.8 s |
| Searching map data | fetch | Timed, split tree | 6 s per request (`overpass:matching-point`) |
| Reading results | parse | Timed | 0.2 s |
| Working out nearest areas | compute | Timed, bucket = feature count | 0.5 s |
| Refining shape | refine | Count: LOD passes | 0.3 s per pass |

Resolver variants replace "Searching map data":

| Resolver | History key | Prior |
| --- | --- | --- |
| `reverseGeocodeAdmin` / `letterZone` | `overpass:admin-geom` | 10 s |
| `landmass` | `overpass:landmass` plus compute `landmass-union` | 10 s + 2 s |
| `streetPath`, `stationNameLength`, `stationFirstLetter`, `transitLine` | `overpass:transit` | 5 s |

When a bundle preview is shown first and Overpass enriches in the background, the foreground task completes on the preview. The enrich runs as a second, compact task ("Confirming with map data", bar only, no Cancel) in the same readout slot.

### 2. Measuring: Sea Level

Files: `useMeasuringAnchorLoaders.ts`, `seaLevel.ts`, `seaLevelProgressive.ts`.

| Stage | Kind | Model | Prior |
| --- | --- | --- | --- |
| Reading your elevation | fetch | Timed | 1.5 s |
| Sampling elevation across the play area | fetch | Count: `completedCells / targetCells` from `getSeaLevelSamplingProgress`; rate seeded from `requestGapMsForBatchSize` | derived |
| Refining near your position | fetch | Count: refine samples of 48 max | derived |
| Shading the play area | compute | Timed | 0.5 s |

If a background crawl is already running, the foreground task mirrors that crawl's cell count instead of waiting silently. This is the case `ensureSeaLevelSamplingComplete` currently awaits without feedback. The crawl is promoted the same way as an Overpass entry: while at least one foreground subscriber is attached, `fetchSamplingElevations` skips the background gaps (`BACKGROUND_BATCH_GAP_MS`, `BACKGROUND_PHASE_GAP_MS`) and uses the foreground retry profile. The rate-limit gap from `requestGapMsForBatchSize` still applies. Cancelling the foreground task detaches it and reverts the crawl to background pacing; it does not abort the crawl, because the crawl also fills the cache for later questions.

### 3. Measuring: Places, Linear, Coastline

| Site | Fetch stage key | Prior | Extra stages |
| --- | --- | --- | --- |
| All places (`measuringPlaces.ts`) | `overpass:measuring-places` | 6 s, split tree | parse 0.2 s |
| Linear (`measuringLinearFeatures.ts`) | `overpass:linear` | 8 s, split tree | segment prep, compute 0.5 s |
| Coastline (`coastline.ts`) | bundled pack 0.8 s, then `overpass:coastline` 8 s | split tree | segment prep 0.5 s |
| Measuring previews (`useMeasuringPreviews.ts`) | none | | compute `near-region` 0.5 s, refine passes counted |

### 4. Tentacle

Files: `useTentacleTool.tsx`, `tentacleOverpass.ts`. Stages are the same as matching: queue, bundle 0.8 s, `overpass:tentacle` 5 s with split tree, then parse. The size bucket is the radius bbox area.

### 5. Randomized Heavy Question

File: `resolveRandomizedHeavyQuestion.ts`. Today this site shows nothing. It becomes a task with `label: "Picking a random question"`. The stages are those of whichever resolver it calls, so it reuses the stage builders from sites 1 to 4. It renders in the `GlobalActivity` chip (`src/components/ui/feedback/GlobalActivity.tsx`), extended to show a compact bar and percent.

### 6. Hider Question Truths

File: `useHiderQuestionTruths.ts`. One parent stage counts resolved questions ("Checking 2 of 5 questions"). Each child is timed: `truth:matching` 1 s, `truth:measuring` 3 s, `truth:gtfs` 2 s. The post-answer reveal in `HiderMapScreen.tsx:422` uses the same task in the `GlobalActivity` chip.

### 7. Combined Elimination Mask

File: `useCombinedEliminationMask.ts`. Stages:

1. "Loading geometry engine": the lazy WASM import, timed at 0.6 s, finished at once when already loaded.
2. "Preparing clues": counted per annotation in `computeEliminationUnionInput`, with a yield between annotations.
3. "Combining shaded areas": the worker union, timed, bucket = annotation count.

The hook returns the task and the map refine chip (`selectMapRefineChip.ts`) shows its percent. There is no Cancel, because a newer mask request already supersedes an older one.

### 8. Join and Create Session

| Flow | Stages (timed) |
| --- | --- |
| Join (`useJoinSession.ts`) | Signing in 1 s, Joining session 1.5 s, Confirming hider role (polls, counted against `HIDER_ROLE_POLL_MAX_MS`) 2 s, Opening map 0.5 s |
| Create (`useCreateSession.ts`) | Verifying access 1 s (premium only), Building play area 0.3 s, Creating session 1.5 s, Loading matching areas 1.5 s |
| Apply preset (`useCreateSession.ts:263`) | Loading boundaries, `download` stage with byte count when `Content-Length` is present, else timed 1.5 s |

`EntryAsyncButton` shows the stage label as its busy label and a thin bar under the button.

### 9. Route Entry and Play-Area Boundaries

`RouteProgressChrome.tsx` already receives `steps[]` and `currentStepIndex` from `routeLoadingSteps.ts`. Each step becomes a timed stage. The boundary step (`regionPackBoundaries.ts`) becomes a `download` stage per GeoJSON file. It reads the body through `response.body.getReader()` with `Content-Length` when available, which needs a streaming `read` callback in `fetchAndReadWithTimeout`.

### 10. Smaller Sites

| Site | Treatment |
| --- | --- |
| Hider-zone stations (`useHiderZoneTool.ts`) | queue + `overpass:stations` 4 s, cancellable |
| Geocoding search (`geocoding/client.ts`) | Counted over its 2 to 4 parallel requests; `SearchField` shows the bar under the input |
| KMZ/KML import | Stages: loading importer 0.5 s, reading file (download-style count over bytes), converting 0.5 s |
| Photo upload (`photoStorage.ts`) | Switch `uploadBytes` to `uploadBytesResumable` for byte progress; compress stage timed 0.5 s |
| Screenshot share | Stages: loading capture tool 0.5 s, capturing 1 s |
| `preloadCriticalGameAreaCaches` | Recorded in `preloadStore` like the existing preload jobs, so the existing beacon and detail panel cover it |

Admin lists, leaderboard, friends, and game-over loads are short single Firestore reads. They keep their skeletons and spinners.

## Overpass Pool: Priority Lanes

`requestQueue.ts` changes from one FIFO to two lanes:

```ts
interface SlotRequest {
  priority: LoadPriority;
  signal?: AbortSignal;
  /** Called with the number of foreground waiters ahead, on every queue change. */
  onQueuePosition?: (position: number) => void;
}

function withOverpassConcurrencyLimit<T>(
  task: (slotSignal: AbortSignal) => Promise<T>,
  request?: SlotRequest,
): Promise<T>;
```

Rules:

1. `MAX_CONCURRENT` stays 2.
2. Background requests may hold at most 1 slot at a time. One slot is therefore always free of background work, and a foreground request waits for at most one other foreground request.
3. When a slot frees, the foreground lane is served before the background lane, FIFO within each lane.
4. A waiter whose signal aborts is removed from its lane and its promise rejects with the abort reason. It never takes a slot.
5. Priority is read live. A slot request carries a `getPriority()` getter bound to its in-flight entry, not a fixed value. When a foreground caller joins, a waiting request moves to the foreground lane. A request already holding a slot stops counting against the background cap. Later requests from the same fetcher (bbox split children) enter the foreground lane directly.

The preload queue (`gameAreaPreload.ts`) and `preloadCriticalGameAreaCaches` pass `priority: "background"`. Neither is awaited before navigation in `useJoinSession.ts` or `useCreateSession.ts` (both use `void`), so the background cap does not slow join or create. Everything else defaults to foreground.

## Abort Through queryOverpass

`queryOverpass(query, options?: { signal?: AbortSignal; priority?: LoadPriority; node?: ProgressNode })`.

The changes, in the order a request flows:

1. **Queue.** The signal is forwarded to the slot request (rule 4 above).
2. **Fetch.** `fetchAndReadWithTimeout` accepts an outer signal and combines it with its timeout controller. Because `vite.config.ts` targets `es2022`, combining uses a small `anySignal` helper instead of relying on `AbortSignal.any` (Safari 17.4+).
3. **Telling user aborts from timeouts.** Today an abort inside `fetchAndReadWithTimeout` becomes `FetchTimeoutError`. `throwIfOverpassQueryTooExpensive` then turns that into `OverpassQueryTooExpensiveError`, and the bbox split treats it as a reason to split. With a user abort, that chain would launch four more requests. The fix: when the outer signal is aborted, rethrow `signal.reason` (a `DOMException` named `AbortError`) and skip both conversions.
4. **Retries.** `isRetryableOverpassError` currently retries `AbortError`. It must return false when the outer signal is aborted. Backoff `sleep` becomes abortable.
5. **Bbox split.** `queryOverpassWithBboxSplit` checks `signal.aborted` before each child and never splits on an abort.
6. **Cache.** `getOrFetchCached` does not write, and does not serve stale data, when the fetch rejects because of an abort. It rethrows so the caller can reset its UI.
7. **Callers.** An abort is not an error state. Hooks catch `AbortError`, clear the loading state, and return to the previous step with no error message.

Elevation fetches (`fetchElevations`) get the same `signal` option. Abort releases their slot and skips retries, but rate-limit bookkeeping (`lastElevationRequestAt`) is still updated for any request that was actually sent.

## UI

### LoadingReadout

`LoadingReadout` gains an optional `task` prop. Without it, it renders exactly as today, which keeps the change safe for call sites that are not converted. With it, it renders:

```
Finding nearest museum
[███████████░░░░░░░░░]  54%
Searching map data · about 10 s left            [Cancel]
```

- The bar is the compound Mantine form, `Progress.Root` with one `Progress.Section value={percent}`. Mantine's range is fixed at 0 to 100. In the installed `@mantine/core`, `role="progressbar"` sits on `ProgressSection`, so `aria-label={label}` and `aria-valuetext` (such as "54 percent, about 10 seconds left") go on the section, not the root. The transition is disabled under `prefers-reduced-motion`.
- The `role="status"` live region contains only `label` and `stageLabel`, so screen readers hear stage changes, not every percent tick.
- Cancel is shown when `snapshot.cancellable` is true.
- The current 10-second stale message is replaced by the `overdue` text.

### Yielding for Paint

Main-thread compute stages (`buildSameNearestRegion`, `computeLandmassFeatures`, `computeEliminationUnionInput`, `dispatchKernel` calls) block rendering. `node.start()` on a `compute` or `refine` stage returns a promise that resolves after `yieldToMain()`. That helper uses `scheduler.yield()` when present, else a `MessageChannel` macrotask. Sites `await` it before heavy synchronous work. Counted compute loops (mask annotations, LOD passes) yield every 16 ms of work. This adds latency of about one frame per stage and makes the stage label visible.

### Compact Variants

- `GlobalActivity` chip: label plus a 4 px bar, used for sites 5 and 6.
- Map refine chip: appends the percent.
- `EntryAsyncButton`: stage label as busy text, thin bar below.
- `RouteProgressChrome`: renders "Step 2 of 4" and a bar.

## File Plan

| New file | Contents |
| --- | --- |
| `src/domain/progress/progressTree.ts` | Node model, split, composite fraction |
| `src/domain/progress/estimator.ts` | Timed curve, EMA rate, ETA, display hysteresis, text buckets |
| `src/services/core/progress/loadTask.ts` | `createLoadTask`, subscription, snapshot throttling |
| `src/services/core/progress/durationHistory.ts` | IndexedDB-backed records with in-memory mirror |
| `src/services/core/progress/yieldToMain.ts` | Yield helper |
| `src/services/core/network/anySignal.ts` | Signal combiner |
| `src/hooks/progress/useLoadTask.ts` | `useSyncExternalStore` wrapper |
| `src/components/ui/feedback/LoadProgress.tsx` | Bar + stage + ETA + Cancel, used by `LoadingReadout` and the compact variants |

Modified: `requestQueue.ts`, `overpassClient.ts`, `overpassBboxSplit.ts`, `fetchWithTimeout.ts`, `cache/index.ts`, `cache/memory.ts` (in-flight entry shape, `progress-history` TTL), `useLatestRequest.ts`, `seaLevelProgressive.ts`, `gameAreaPreload.ts`, the elevation fetch and rate-limit modules, every site in the tables above, and their readout components.

## Test Plan

### Unit (vitest, `unit` project)

`estimator.test.ts`:
- The timed curve hits 90% at `E`, stays under 99% for any `t`, and reaches 100% only on finish.
- Composite weights follow expected durations.
- Displayed percent never decreases across a scripted sequence of late stage adds, a split, and a growing count total.
- ETA stays null during warm-up, honours the 20% / 3 s hysteresis, buckets text correctly, keeps shrinking past `E`, and the task switches to overdue at 1.5 × its expected total.
- A zero prior is floored at 50 ms and does not divide by zero.
- The EMA rate converges on a steady producer and adapts within 5 samples to a rate change.

`progressTree.test.ts`:
- Splitting a node at `f0 = 0.4` into 4 keeps the root fraction unchanged at the moment of split.
- A nested split (child splits again) still sums correctly.

`durationHistory.test.ts` (fake-indexeddb):
- A record updates via EMA, and cancelled, failed, and under-30 ms stages are ignored.
- The nearest-bucket fallback scales by area, and the prior is used when no data exists.
- LRU eviction kicks in at 64 records, and writes are debounced into one blob.
- A split fetch records its total time under the original bucket.

`requestQueue.test.ts`:
- Foreground is served before background.
- Background never holds 2 slots.
- An aborted waiter is removed and never runs.
- Promotion moves a background waiter to the foreground lane, frees a held slot from the background cap, and routes later requests from the same entry to the foreground lane.
- Queue-position callbacks fire with correct values.

`overpassClient.test.ts`, with mocked `fetch`:
- A user abort during fetch rejects with `AbortError`, not `OverpassQueryTooExpensiveError`.
- No retry follows a user abort, and the slot is released.
- A user abort during a backoff sleep ends the sleep immediately.
- A timeout still maps to `OverpassQueryTooExpensiveError`, the current behaviour.

`overpassBboxSplit.test.ts`:
- No split on abort; an abort between children stops remaining children.
- The split reports `node.split(4)`.

`cache/index.test.ts`:
- Two subscribers share one fetch. Cancelling one rejects only its own promise and keeps the fetch alive; cancelling both aborts it.
- The first subscriber cancelling while a second waits leaves the second's progress mirror moving.
- A preload subscriber with no signal keeps the fetch alive after all foreground subscribers cancel.
- An aborted fetch is not cached and does not serve stale data.

`useLatestRequest.test.ts`:
- `beginRequest()` aborts the previous request's signal; `cancelRequests()` aborts the current one.

`seaLevelProgressive.test.ts` (fake timers):
- With a foreground subscriber attached, the crawl skips background gaps; after it detaches, gaps resume and the crawl continues.

`loadTask.test.ts` (fake timers):
- Snapshots are throttled to one per frame and time-based progress advances while a stage is pending.
- `cancel()` aborts `signal` and sets status.

### Component (Testing Library)

`LoadProgress.test.tsx`:
- Renders label, stage, percent, and ETA.
- The `role=status` text changes only on stage change.
- The bar has `aria-valuetext`, and Cancel calls `task.cancel`.
- Without `task`, `LoadingReadout` renders today's output (snapshot of current markup).

`MatchingPanel` test:
- With a stub task, the panel shows a bar.
- Cancelling returns to the category step with no error text.

### End to End (Playwright)

`e2e/features/load-progress.spec.ts`, using the context-level routing in `e2e/fixtures/network.ts`:
- Delay the Overpass proxy response by 4 s. Assert that the bar appears, increases, and the stage label reads "Searching map data", then that results render.
- Delay by 30 s and click Cancel. Assert that the panel returns to the category step and that the routed request was aborted (route handler sees the abort).
- Answer the first Overpass call with HTTP 504 and the quadrant calls with 200. Assert that the bar never decreases (sample `aria-valuenow` every 100 ms).

### Manual

- Cold cache, throttled to "Slow 4G" in DevTools: run a matching question, a sea-level measuring question, and join a session. Confirm stage labels are readable and the ETA does not jump around.
- Start a session (preload running), then immediately ask a matching question. Confirm the "Waiting for map server" stage is at most one request long.

## Risks

- **Wrong priors on first use.** Mitigated by the asymptotic curve, which keeps moving, and by the overdue text. History corrects them after one run per device.
- **Threading `task` through many signatures.** The option is optional and defaults to today's behaviour, so unconverted callers keep working. `tsc` catches mismatched shapes.
- **Background cap slows preload.** Preload already spaces jobs 100 to 400 ms apart and is not user-facing. One slot is enough.
- **One large PR.** Commits are ordered so each one builds and passes tests: pure domain, then services and queue, then the abort chain, then UI, then sites one by one.

## Sources

- Loading and progress indicators (uxdesign.cc): https://uxdesign.cc/loading-progress-indicators-ui-components-series-f4b1fc35339a
- Calcite design system, Progress: https://developers.arcgis.com/calcite-design-system/components/progress
- Progress indicator design (Lollypop, November 2025): https://lollypop.design/blog/2025/november/progress-indicator-design/
- progressbar2 SmoothingETA (EMA-based ETA): https://progressbar-2.readthedocs.io/en/latest/widgets/smoothing-eta.html
- OSM dev list, Overpass client vs server timeouts: https://lists.openstreetmap.org/pipermail/dev/2017-May/029870.html
- Mantine Progress (ARIA, fixed 0 to 100 range): https://mantine.dev/core/progress

## Implementation Notes

The first implementation differs from this spec in these places:

- **Named tasks.** The hider truth check, hider station search and mask rebuild publish their task through `setNamedLoadTask` (`src/services/core/progress/namedTasks.ts`) instead of threading a prop through every layer. The readouts that show them (`HiderAnswerPicker`, `TransitStationPicker`, `MapScreenChromeBanners`) read it with `useNamedLoadTask`.
- **Enrich tasks.** Matching shows the background Overpass enrich inline. Tentacle, measuring places and coastline show it in the global activity chip.
- **Matching compute.** The matching task ends when features are resolved. Voronoi and LOD refinement keep using the existing map refine chip.
- **Queue stage.** Waiting for an Overpass slot is a `queued` state on the fetch stage (label "Waiting for map server") rather than a separate stage, so queue time never enters duration history.
- **Route entry.** `RouteProgressChrome` shows "Step i of n" with a stepped bar. On the "load-boundaries" step it blends in the play area task (`PACK_PLAY_AREA_TASK`, published by `resolveSessionPlayArea`) and shows its ETA.
- **Boundary downloads.** `readTextWithProgress` (`fetchWithTimeout.ts`) counts bytes against `Content-Length` inside the `fetchAndReadWithTimeout` read callback. Under a non-identity `Content-Encoding` the header is the compressed size, so the stage stays timed. `regionPackBoundaries.ts` creates one download stage per uncached asset before the first fetch.
- **Geocoding.** `searchPlaces` counts its Nominatim requests: two per pass, and with a location bias an unbiased and a biased pass run as a parallel group. The bar shows under `SearchField` and the inset place search.
- **Critical preload.** `preloadCriticalGameAreaCaches` has its own `critical` slice in `preloadStore`, so the map screen's main `reset(key, total)` cannot wipe it; the banner sums both. It also runs as a global background task for the ETA.
- **Photo upload.** `uploadPhotoAnswer` uses `uploadBytesResumable` and takes an optional progress node and signal. No UI calls it today: `PhotoAnswerUploader` only offers "sent externally" and "cannot answer" while in-app upload is disabled.
