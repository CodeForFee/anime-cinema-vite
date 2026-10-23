import * as React from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/lib/utils";
import { useMenuPosition } from "@/shared/ui/dropdown-position";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hoverMode?: boolean;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined);

interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hoverMode?: boolean;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  hoverMode = false,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      } else if (onOpenChange) {
        const nextOpen = typeof value === "function" ? (value as (p: boolean) => boolean)(controlledOpen ?? false) : value;
        onOpenChange(nextOpen);
      }
    },
    [isControlled, onOpenChange, controlledOpen]
  );

  // Notify parent of uncontrolled state changes — outside state updaters to avoid Strict Mode issues
  React.useEffect(() => {
    if (!isControlled && onOpenChange) {
      onOpenChange(uncontrolledOpen);
    }
  }, [uncontrolledOpen, isControlled, onOpenChange]);

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open: open || false, setOpen, hoverMode, triggerRef, timeoutRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};


const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within a DropdownMenu");

  const { setOpen, hoverMode, triggerRef, timeoutRef } = context;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (hoverMode) {
      // In hover mode, click should only open (not toggle), to avoid
      // fighting with the hover timers on first interaction
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setOpen(true);
    } else {
      setOpen((prev) => !prev);
    }
    if (props.onClick) props.onClick(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (hoverMode) {
      // Always clear any pending timer (open or close)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Schedule open — setOpen(true) is idempotent if already open
      timeoutRef.current = setTimeout(() => setOpen(true), 150);
    }
    if (props.onMouseEnter) props.onMouseEnter(e as React.MouseEvent<HTMLButtonElement>);
  };

  const handleMouseLeaveTrigger = (e: React.MouseEvent<HTMLElement>) => {
    if (hoverMode) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setOpen(false), 200);
    }
    if (props.onMouseLeave) props.onMouseLeave(e as React.MouseEvent<HTMLButtonElement>);
  };

  const { onClick, onMouseEnter, onMouseLeave, ...otherProps } = props;

  return (
    <button
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeaveTrigger}
      {...otherProps}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const CONTENT = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";

interface DropdownMenuContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> {
  align?: "start" | "center" | "end";
  alignOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = "center", alignOffset = 0, side = "bottom", sideOffset = 4, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) throw new Error("DropdownMenuContent must be used within a DropdownMenu");

    const { open, setOpen, hoverMode, triggerRef } = context;
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = React.useState(false);
    const { position, positioned } = useMenuPosition(open, triggerRef, menuRef, { side, align, alignOffset, sideOffset });

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Close on click outside
    React.useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, setOpen, triggerRef]);

    if (!mounted) return null;

    return ReactDOM.createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={(node) => {
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
              menuRef.current = node;
            }}
            className={cn(CONTENT, "dropdown-scrollbar", className)}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 99999,
              maxHeight: "calc(90vh - 60px)",
              overflowY: "auto",
              transformOrigin: side === "bottom" ? "top center" : side === "top" ? "bottom center" : side === "left" ? "center right" : "center left",
            }}
            initial={{ opacity: 0, scale: 0.9, y: side === "bottom" ? -4 : side === "top" ? 4 : 0 }}
            animate={positioned ? { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" as const } : { opacity: 0, scale: 0.9, pointerEvents: "none" as const }}
            exit={{ opacity: 0, scale: 0.9, y: side === "bottom" ? -4 : side === "top" ? 4 : 0, transition: { duration: 0.15 }, pointerEvents: "none" as const }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
            onMouseEnter={(e) => {
              if (hoverMode && context.timeoutRef.current) {
                clearTimeout(context.timeoutRef.current);
              }
              if (props.onMouseEnter) props.onMouseEnter(e as any);
            }}
            onMouseLeave={(e) => {
              if (hoverMode) {
                context.timeoutRef.current = setTimeout(() => setOpen(false), 200);
              }
              if (props.onMouseLeave) props.onMouseLeave(e as any);
            }}
            data-lenis-prevent
            {...props}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
  asChild?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, asChild, disabled = false, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) throw new Error("DropdownMenuItem must be used within a DropdownMenu");
    const { setOpen } = context;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      setOpen(false);
      if (props.onClick) props.onClick(e);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex gap-1 cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          inset && "pl-8",
          className
        )}
        onClick={handleClick}
        data-disabled={disabled ? "" : undefined}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
  )
);
DropdownMenuGroup.displayName = "DropdownMenuGroup";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
};
