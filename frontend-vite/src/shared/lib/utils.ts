import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Tailwind classes joined, later ones winning over conflicting earlier ones */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
