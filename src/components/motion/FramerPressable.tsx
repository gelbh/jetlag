import {
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { loadMotionModule } from "./lazyMotion";

type FramerPressableProps = ComponentPropsWithoutRef<"button"> & {
  as?: "button" | "div" | "a";
  children?: ReactNode;
  href?: string;
};

export default function FramerPressable({
  className = "",
  as = "button",
  children,
  ...rest
}: FramerPressableProps) {
  const [MotionTag, setMotionTag] = useState<ElementType | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadMotionModule().then((mod) => {
      if (!cancelled) {
        const tag =
          as === "div"
            ? mod.motion.div
            : as === "a"
              ? mod.motion.a
              : mod.motion.button;
        setMotionTag(() => tag);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [as]);

  const mergedClassName = `hud-pressable-css ${className}`.trim();

  if (!MotionTag) {
    if (as === "div") {
      return (
        <div className={mergedClassName} {...(rest as ComponentPropsWithoutRef<"div">)}>
          {children}
        </div>
      );
    }

    if (as === "a") {
      return (
        <a className={mergedClassName} {...(rest as ComponentPropsWithoutRef<"a">)}>
          {children}
        </a>
      );
    }

    return (
      <button className={mergedClassName} {...rest}>
        {children}
      </button>
    );
  }

  const Tag = MotionTag;
  return (
    <Tag
      className={mergedClassName}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}
