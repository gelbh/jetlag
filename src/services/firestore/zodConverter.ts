import { z } from "zod";

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function parseFirestoreDocument<T extends z.ZodType>(
  schema: T,
  data: unknown,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid ${label}: ${formatZodError(result.error)}`);
  }

  return result.data;
}
