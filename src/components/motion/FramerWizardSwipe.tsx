import { useCallback, useRef, useState, type ReactNode } from "react";
import { motion, type PanInfo } from "motion/react";
import { shouldCommitWizardSwipe } from "../../hooks/useWizardSwipe";

interface FramerWizardSwipeProps {
  stepId: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
  className?: string;
}

export default function FramerWizardSwipe({
  stepId,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  children,
  className = "",
}: FramerWizardSwipeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((_event: Event, info: PanInfo) => {
    setDragX(info.offset.x);
  }, []);

  const handleDragEnd = useCallback(
    (_event: Event, info: PanInfo) => {
      setIsDragging(false);
      const width = containerRef.current?.offsetWidth ?? 320;
      const velocityPxMs = info.velocity.x / 1000;

      if (
        shouldCommitWizardSwipe(info.offset.x, width, velocityPxMs, "next") &&
        canGoNext
      ) {
        setDragX(0);
        onNext();
        return;
      }

      if (
        shouldCommitWizardSwipe(info.offset.x, width, velocityPxMs, "back") &&
        canGoBack
      ) {
        setDragX(0);
        onBack();
        return;
      }

      setDragX(0);
    },
    [canGoBack, canGoNext, onBack, onNext],
  );

  return (
    <div
      ref={containerRef}
      className={`wizard-swipe-surface touch-pan-y ${className}`.trim()}
    >
      <motion.div
        key={stepId}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX }}
        transition={isDragging ? { duration: 0 } : { duration: 0.22 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
