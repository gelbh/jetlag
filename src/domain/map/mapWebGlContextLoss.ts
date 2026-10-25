export function attachMapWebGlContextLostListener(
  canvas: HTMLCanvasElement,
  onLost: () => void,
): () => void {
  const handler = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handler);
  return () => {
    canvas.removeEventListener("webglcontextlost", handler);
  };
}
