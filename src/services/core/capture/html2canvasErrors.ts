const HTML2CANVAS_UNSUPPORTED_COLOR =
  /Attempting to parse an unsupported color function/i;

export function isHtml2CanvasUnsupportedColorMessage(message: string): boolean {
  return HTML2CANVAS_UNSUPPORTED_COLOR.test(message);
}
