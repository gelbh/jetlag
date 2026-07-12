import { useCallback, useState, type ReactNode, type Ref } from "react";
import { motion, useDragControls, type PanInfo } from "motion/react";
import { shouldMinimizePanelDrag } from "../../hooks/usePanelDrag";
import type { PanelHandleProps } from "../../hooks/usePanelDrag";

interface FramerPanelDragProps {
  onMinimizedChange: (minimized: boolean) => void;
  outerClassName: string;
  outerRef?: Ref<HTMLDivElement>;
  children: (handleProps: PanelHandleProps) => ReactNode;
}

export default function FramerPanelDrag({
  onMinimizedChange,
  outerClassName,
  outerRef,
  children,
}: FramerPanelDragProps) {
  const dragControls = useDragControls();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((_event: Event, info: PanInfo) => {
    setDragY(Math.max(0, info.offset.y));
  }, []);

  const handleDragEnd = useCallback(
    (_event: Event, info: PanInfo) => {
      setIsDragging(false);
      const velocityPxMs = info.velocity.y / 1000;

      if (shouldMinimizePanelDrag(info.offset.y, velocityPxMs)) {
        setDragY(0);
        onMinimizedChange(true);
        return;
      }

      setDragY(0);
    },
    [onMinimizedChange],
  );

  const handleProps: PanelHandleProps = {
    onPointerDown: (event) => {
      dragControls.start(event);
    },
    onPointerMove: () => {},
    onPointerUp: () => {},
    onPointerCancel: () => {},
  };

  return (
    <motion.div
      ref={outerRef}
      className={outerClassName}
      drag="y"
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.35 }}
      dragListener={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={{ y: dragY }}
      transition={isDragging ? { duration: 0 } : { duration: 0.22 }}
    >
      {children(handleProps)}
    </motion.div>
  );
}
