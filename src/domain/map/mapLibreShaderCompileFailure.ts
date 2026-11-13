const SHADER_COMPILE_FAILURE = /Could not compile (?:fragment|vertex) shader/i;

export function isMapLibreShaderCompileFailure(errorOrMessage: unknown): boolean {
  if (typeof errorOrMessage === "string") {
    return SHADER_COMPILE_FAILURE.test(errorOrMessage);
  }
  if (errorOrMessage instanceof Error) {
    return SHADER_COMPILE_FAILURE.test(errorOrMessage.message);
  }
  return false;
}

export function attachMapLibreShaderCompileWindowListener(onFailure: () => void): () => void {
  const handler = (event: ErrorEvent) => {
    if (
      !isMapLibreShaderCompileFailure(event.message) &&
      !isMapLibreShaderCompileFailure(event.error)
    ) {
      return;
    }
    event.preventDefault();
    onFailure();
  };
  window.addEventListener("error", handler);
  return () => {
    window.removeEventListener("error", handler);
  };
}
