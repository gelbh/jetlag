import {
  Link,
  useNavigate,
  type LinkProps,
} from "react-router-dom";
import { useRouteTransition } from "../../navigation/useRouteTransition";

export function AppLink({
  to,
  onClick,
  target,
  replace,
  state,
  preventScrollReset,
  relative,
  reloadDocument,
  ...props
}: LinkProps) {
  const { beginTransition } = useRouteTransition();
  const navigate = useNavigate();

  const bypassTransition =
    reloadDocument === true || (target !== undefined && target !== "_self");

  if (bypassTransition) {
    return (
      <Link
        {...props}
        to={to}
        target={target}
        replace={replace}
        state={state}
        preventScrollReset={preventScrollReset}
        relative={relative}
        reloadDocument={reloadDocument}
        onClick={onClick}
      />
    );
  }

  const transitionOptions = {
    replace,
    state,
    preventScrollReset,
    relative,
  };

  return (
    <Link
      {...props}
      to={to}
      target={target}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
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

        event.preventDefault();
        void beginTransition(to, transitionOptions).catch(() => {
          navigate(to, { ...transitionOptions, viewTransition: false });
        });
      }}
    />
  );
}
