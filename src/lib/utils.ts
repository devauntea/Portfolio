import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Map x from [a,b] to [c,d], clamped to the output range. */
export function mapRange(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number,
) {
  if (b === a) return c;
  const t = clamp((x - a) / (b - a), 0, 1);
  return c + t * (d - c);
}
