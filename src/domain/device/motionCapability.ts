export type MotionTier = "framer-enhanced" | "framer-standard" | "css" | "static";

export type MotionRenderer = "framer" | "css" | "static";

export interface DeviceSignals {
  deviceMemory: number | undefined;
  hardwareConcurrency: number;
  saveData: boolean;
  effectiveType: string | undefined;
  gpuScore: number;
  prefersReducedMotion: boolean;
  lowPowerMode: boolean;
}

export function scoreDeviceSignals(signals: DeviceSignals): number {
  if (signals.prefersReducedMotion || signals.lowPowerMode) {
    return 0;
  }

  let score = 50;

  const mem = signals.deviceMemory;
  if (mem === undefined) {
    score += 0;
  } else if (mem >= 6) {
    score += 15;
  } else if (mem >= 4) {
    score += 8;
  } else if (mem <= 2) {
    score -= 15;
  }

  if (signals.hardwareConcurrency >= 8) score += 12;
  else if (signals.hardwareConcurrency >= 6) score += 6;
  else if (signals.hardwareConcurrency <= 4) score -= 10;

  if (signals.saveData) score -= 20;

  const net = signals.effectiveType;
  if (net === "slow-2g" || net === "2g") score -= 25;
  else if (net === "3g") score -= 10;
  else if (net === "4g") score += 5;

  if (signals.gpuScore >= 55) score += 15;
  else if (signals.gpuScore >= 40) score += 5;
  else score -= 15;

  score = Math.max(0, Math.min(100, score));

  // Save-Data skips Framer load but keeps CSS motion (design: css tier floor).
  if (signals.saveData) {
    score = Math.max(score, 20);
  }

  return score;
}

export function tierFromScore(score: number): MotionTier {
  if (score === 0) return "static";
  if (score >= 72) return "framer-enhanced";
  if (score >= 45) return "framer-standard";
  if (score >= 20) return "css";
  return "static";
}

export function rendererFromTier(tier: MotionTier): MotionRenderer {
  if (tier === "framer-enhanced" || tier === "framer-standard") return "framer";
  if (tier === "css") return "css";
  return "static";
}

export function allowsViewTransitions(tier: MotionTier): boolean {
  return tier !== "static";
}

export function allowsSharedElements(tier: MotionTier): boolean {
  return tier === "framer-enhanced";
}

export function allowsDecorativeMotion(tier: MotionTier): boolean {
  return tier === "framer-enhanced";
}

export function allowsHaptics(tier: MotionTier): boolean {
  return tier === "framer-enhanced" || tier === "framer-standard";
}

export function downgradeTier(tier: MotionTier): MotionTier {
  switch (tier) {
    case "framer-enhanced":
      return "framer-standard";
    case "framer-standard":
      return "css";
    case "css":
      return "static";
    case "static":
      return "static";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export function upgradeTier(tier: MotionTier): MotionTier {
  switch (tier) {
    case "static":
      return "css";
    case "css":
      return "framer-standard";
    case "framer-standard":
      return "framer-enhanced";
    case "framer-enhanced":
      return "framer-enhanced";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}
