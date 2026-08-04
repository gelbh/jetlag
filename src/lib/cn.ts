import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional classNames with Tailwind conflict merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
