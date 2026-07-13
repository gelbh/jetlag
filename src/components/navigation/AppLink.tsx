import {
  Link,
  type LinkProps,
} from "react-router-dom";
import { useRouteTransition } from "../../navigation/useRouteTransition";

export function AppLink({ to, onClick, target, ...props }: LinkProps) {
  const { beginTransition } = useRouteTransition();

  return (
    <Link
      {...props}
      to={to}
      target={target}
      viewTransition={false}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        if (target === "_blank") {
          return;
        }

        event.preventDefault();
        void beginTransition(to);
      }}
    />
  );
}
