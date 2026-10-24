import * as React from "react";

import { cn } from "@/shared/lib/utils";

/**
 * A text field. Focus shows as a still ring: the animated border beam it used to run moved `offset-distance` on
 * the main thread every frame while typing.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground/70",
      "transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:border-white/60 focus-visible:ring-1 focus-visible:ring-white/60",
      "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
