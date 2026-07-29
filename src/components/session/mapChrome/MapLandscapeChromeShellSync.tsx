import { useEffect } from "react";
import { useMapLandscapeChrome } from "./MapLandscapeChromeContext";

/** Mirrors landscape chrome mode on `.map-screen-shell` for map control inset CSS. */
export function MapLandscapeChromeShellSync() {
  const { mode } = useMapLandscapeChrome();

  useEffect(() => {
    const shell = document.querySelector(".map-screen-shell");
    if (!shell) {
      return;
    }

    if (mode === "portrait") {
      shell.removeAttribute("data-landscape-chrome");
      return;
    }

    shell.setAttribute("data-landscape-chrome", mode);
    return () => {
      shell.removeAttribute("data-landscape-chrome");
    };
  }, [mode]);

  return null;
}
