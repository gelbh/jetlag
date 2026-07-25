import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyDocumentSeo } from "../domain/seo/applyDocumentSeo";

export function useRouteSeo(): void {
  const location = useLocation();
  useEffect(() => {
    applyDocumentSeo(location.pathname);
  }, [location.pathname]);
}
