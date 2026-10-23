import * as React from "react";
import * as ReactDOM from "react-dom";
import { haptic } from "@/platform/haptics";
import { cn } from "@/shared/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence, HTMLMotionProps, useDragControls } from "framer-motion";

// Helper for cn if not provided
const dummyCn = (...inputs: any[]) => {
    return inputs.filter(Boolean).join(' ');
};
const cnFunction = typeof cn !== 'undefined' ? cn : dummyCn;


interface DialogContextType {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const Dialog: React.FC<DialogProps> = ({
    children,
    defaultOpen = false,
    open: controlledOpen,
    onOpenChange,
}) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
        if (!isControlled) {
            setUncontrolledOpen(value);
        }
        if (onOpenChange) {
            const newValue = typeof value === "function" ? value(open) : value;
            onOpenChange(newValue);
        }
    }, [isControlled, onOpenChange, open]);

    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    );
};

interface DialogTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLDivElement, DialogTriggerProps & React.HTMLAttributes<HTMLDivElement>>(
    ({ children, asChild = false, ...props }, ref) => {
        const context = React.useContext(DialogContext);
        if (!context) {
            throw new Error("DialogTrigger must be used within a Dialog");
        }

        const { setOpen } = context;

        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            setOpen(true);

            if (props.onClick) {
                props.onClick(e);
            }
        };

        const { onClick, ...otherProps } = props;

        if (asChild) {
            return (
                <div
                    ref={ref}
                    onClick={handleClick}
                    {...otherProps}
                >
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child)) {
                            const element = child as React.ReactElement<any>;
                            return React.cloneElement(element, {
                                ...element.props
                            });
                        }
                        return child;
                    })}
                </div>
            );
        }

        return (
            <div
                ref={ref}
                onClick={handleClick}
                {...otherProps}
            >
                {children}
            </div>
        );
    }
);
DialogTrigger.displayName = "DialogTrigger";

type OmittedDialogContentHTMLAttributes = Omit<React.HTMLAttributes<HTMLDivElement>,
    'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' |
    'onTransitionEnd' | 'onDrag' | 'onDragEnd' | 'onDragEnter' |
    'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDragStart' |
    'onDrop' | 'onMouseDown' | 'onMouseEnter' | 'onMouseLeave' |
    'onMouseMove' | 'onMouseOut' | 'onMouseOver' | 'onMouseUp' |
    'onTouchCancel' | 'onTouchEnd' | 'onTouchMove' | 'onTouchStart' |
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' |
    'onPointerEnter' | 'onPointerLeave' | 'onPointerOver' | 'onPointerOut' |
    'onGotPointerCapture' | 'onLostPointerCapture'
>;

// Define Props Interface
interface DialogContentProps extends OmittedDialogContentHTMLAttributes {
    hideCloseButton?: boolean;
    /** On phone-width screens, slide up from the bottom edge as a sheet that can be dragged down to close */
    sheetOnMobile?: boolean;
}

// Tailwind's "sm" breakpoint: below it the dialog may turn into a sheet
export const isPhoneWidth = () => window.matchMedia("(max-width: 639px)").matches;

/** A phone sheet's closing slide, fixed (not a spring) so what follows it can start right after (InfoModal play) */
export const SHEET_EXIT_MS = 280;

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
    ({ className, children, hideCloseButton, sheetOnMobile, ...props }, ref) => {
        const context = React.useContext(DialogContext);
        if (!context) {
            throw new Error("DialogContent must be used within a Dialog");
        }

        const { open, setOpen } = context;

        const [mounted, setMounted] = React.useState(false);
        const dragControls = useDragControls();

        React.useEffect(() => {
            setMounted(true);
        }, []);

        React.useEffect(() => {
            if (open) {
                document.body.style.overflow = "hidden";
            } else {
                document.body.style.overflow = "";
            }
            return () => {
                document.body.style.overflow = "";
            };
        }, [open]);

        if (!mounted) return null;

        const sheet = Boolean(sheetOnMobile) && isPhoneWidth();

        return ReactDOM.createPortal(
            <AnimatePresence>
                {open && (
                    <div className={cnFunction("fixed inset-0 z-[9999] flex justify-center", sheet ? "items-end" : "items-center p-4")}>
                        {/* Backdrop Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            // no blur behind a phone sheet: blurring the whole page every frame of the slide stutters
                            className={cnFunction("absolute inset-0", sheet ? "bg-black/60" : "bg-background/80 backdrop-blur-sm")}
                            onClick={() => setOpen(false)}
                        />

                        {/* Dialog Content */}
                        <motion.div
                            ref={ref}
                            initial={sheet ? { y: "100%" } : { opacity: 0, scale: 0.3 }}
                            animate={sheet ? { y: 0 } : { opacity: 1, scale: 1 }}
                            exit={
                                sheet
                                    ? { y: "100%", transition: { type: "tween", duration: SHEET_EXIT_MS / 1000, ease: [0.32, 0.72, 0, 1] } }
                                    : { opacity: 0, scale: 0.3 }
                            }
                            transition={
                                sheet
                                    ? { type: "spring", damping: 32, stiffness: 320, mass: 0.9 }
                                    : { type: "spring", damping: 25, stiffness: 400, opacity: { duration: 0.2 } }
                            }
                            // The sheet is dragged by its grabber or a [data-sheet-handle] area only, so the rest
                            // of its content keeps scrolling normally
                            drag={sheet ? "y" : false}
                            dragControls={dragControls}
                            dragListener={false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onPointerDown={(event: React.PointerEvent) => {
                                const target = event.target as Element;
                                if (sheet && target.closest("[data-sheet-handle]") && !target.closest("button, a, input"))
                                    dragControls.start(event);
                            }}
                            onDragEnd={(_event, info) => {
                                if (info.offset.y > 120 || info.velocity.y > 600) {
                                    haptic();
                                    setOpen(false);
                                }
                            }}
                            className={cnFunction(
                                `relative z-[9999] w-full max-w-lg rounded-2xl border 
                bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto`,
                                className
                            )}
                            role="dialog"
                            aria-modal="true"
                            data-lenis-prevent
                            {...props as HTMLMotionProps<'div'>}
                        >
                            {sheet && (
                                <div
                                    aria-hidden
                                    onPointerDown={(event) => dragControls.start(event)}
                                    className="sticky top-0 z-40 -mb-7 flex h-7 w-full cursor-grab touch-none items-center justify-center"
                                >
                                    <span className="h-1.5 w-10 rounded-full bg-white/45 shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
                                </div>
                            )}
                            {children}
                            {!hideCloseButton && (
                                <button
                                    onClick={() => setOpen(false)}
                                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                                    aria-label="Close dialog"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Close</span>
                                </button>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>,
            document.body
        );
    }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cnFunction("flex flex-col space-y-1.5 text-center sm:text-left", className)}
            {...props}
        />
    )
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h2
            ref={ref}
            className={cnFunction(
                "text-lg font-semibold leading-none tracking-tight",
                className
            )}
            {...props}
        />
    )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cnFunction("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cnFunction(
                "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
                className
            )}
            {...props}
        />
    )
);
DialogFooter.displayName = "DialogFooter";

const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, ...props }, ref) => {
        const context = React.useContext(DialogContext);
        const setOpen = context ? context.setOpen : () => { };

        return (
            <button
                ref={ref}
                type="button"
                className={className}
                onClick={(e) => {
                    setOpen(false);
                    props.onClick?.(e);
                }}
                {...props}
            />
        );
    }
);
DialogClose.displayName = "DialogClose";

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
};
