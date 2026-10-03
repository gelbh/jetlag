export function finalizePrerenderDom():
  | { ready: false }
  | { ready: true; boundaries: number; html: string };
