import { reactRouterBrowserTracingIntegration, wrapReactRouterRouting } from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

/** BrowserTracing + React Router SPA hooks for deferred `initSentry`. */
export function createSentryReactRouterIntegration() {
  return reactRouterBrowserTracingIntegration({
    useEffect,
    useLocation,
    useNavigationType,
    createRoutesFromChildren,
    matchRoutes,
    enableInp: true,
  });
}

export const SentryRoutes = wrapReactRouterRouting(Routes);
