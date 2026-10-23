import type React from "react"

import { cn } from "@/shared/lib/utils"

/** A horizontal menu bar: <nav>, its <ul> and <li> items; the header's dropdowns sit inside items */
export function NavigationMenu({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props} />
}

export function NavigationMenuList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)} {...props} />
}

export function NavigationMenuItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("relative", className)} {...props} />
}

/** The look of a menu entry, for links and dropdown triggers alike */
export const navigationMenuTriggerStyle = () =>
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
