import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with conflict resolution.
 *
 * `clsx` handles conditionals/arrays/objects; `twMerge` resolves conflicting
 * utilities (e.g. `px-2 px-4` → `px-4`). Use this everywhere you compose
 * className strings — both in React islands and in .astro files.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
