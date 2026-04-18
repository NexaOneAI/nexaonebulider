/**
 * Minimal shadcn/ui stubs — drop-in replacements for the most common
 * components, so AI-generated apps using `@/components/ui/*` work in the
 * preview iframe without bundling the full shadcn library.
 *
 * Each stub exports the same named exports as the real shadcn component
 * but with a slimmed-down implementation (no Radix primitives — those
 * would need to be loaded from esm.sh per-component, too heavy for a
 * preview).
 *
 * NOTE: keep these as JS source strings — they're injected into the
 * preview iframe as virtual modules.
 */

const button = `
import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};
const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", asChild, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    />
  );
});
export default Button;
`;

const card = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />;
});
export const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
});
export const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />;
});
export const CardDescription = React.forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
});
export const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
});
export const CardFooter = React.forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />;
});
`;

const input = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
export default Input;
`;

const label = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef(function Label({ className, ...props }, ref) {
  return <label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />;
});
export default Label;
`;

const textarea = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
export default Textarea;
`;

const badge = `
import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
  outline: "text-foreground",
};
export function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    />
  );
}
`;

const separator = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Separator = React.forwardRef(function Separator(
  { className, orientation = "horizontal", decorative = true, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)}
      {...props}
    />
  );
});
`;

const avatar = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return <div ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
});
export const AvatarImage = React.forwardRef(function AvatarImage({ className, ...props }, ref) {
  return <img ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />;
});
export const AvatarFallback = React.forwardRef(function AvatarFallback({ className, ...props }, ref) {
  return <span ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />;
});
`;

const switchStub = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef(function Switch({ className, checked, onCheckedChange, defaultChecked, ...props }, ref) {
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internal;
  return (
    <button
      ref={ref}
      role="switch"
      aria-checked={isChecked}
      onClick={() => { const v = !isChecked; if (checked === undefined) setInternal(v); onCheckedChange && onCheckedChange(v); }}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        isChecked ? "bg-primary" : "bg-input",
        className,
      )}
      {...props}
    >
      <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform", isChecked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
});
`;

const checkbox = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef(function Checkbox({ className, checked, onCheckedChange, defaultChecked, ...props }, ref) {
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internal;
  return (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={isChecked}
      onClick={() => { const v = !isChecked; if (checked === undefined) setInternal(v); onCheckedChange && onCheckedChange(v); }}
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background flex items-center justify-center",
        isChecked ? "bg-primary text-primary-foreground" : "bg-background",
        className,
      )}
      {...props}
    >
      {isChecked && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>}
    </button>
  );
});
`;

const progress = `
import * as React from "react";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef(function Progress({ className, value = 0, ...props }, ref) {
  return (
    <div ref={ref} className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
      <div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }} />
    </div>
  );
});
`;

const skeleton = `
import { cn } from "@/lib/utils";
export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
`;

const alert = `
import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-background text-foreground",
  destructive: "border-red-500/50 text-red-500 [&>svg]:text-red-500",
};
export const Alert = React.forwardRef(function Alert({ className, variant = "default", ...props }, ref) {
  return <div ref={ref} role="alert" className={cn("relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7", variants[variant] || variants.default, className)} {...props} />;
});
export const AlertTitle = React.forwardRef(function AlertTitle({ className, ...props }, ref) {
  return <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
});
export const AlertDescription = React.forwardRef(function AlertDescription({ className, ...props }, ref) {
  return <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
});
`;

/* ============================================================
   Radix-based components — implemented natively (no Radix dep)
   ============================================================ */

const dialog = `
import * as React from "react";
import { cn } from "@/lib/utils";

const DialogCtx = React.createContext({ open: false, setOpen: () => {} });

export function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (controlledOpen === undefined) setUncontrolled(v);
    onOpenChange && onOpenChange(v);
  };
  return <DialogCtx.Provider value={{ open, setOpen }}>{children}</DialogCtx.Provider>;
}
export function DialogTrigger({ asChild, children, ...props }) {
  const { setOpen } = React.useContext(DialogCtx);
  const child = React.Children.only(children);
  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, { onClick: (e) => { child.props.onClick && child.props.onClick(e); setOpen(true); } });
  }
  return <button {...props} onClick={(e) => { props.onClick && props.onClick(e); setOpen(true); }}>{children}</button>;
}
export function DialogPortal({ children }) { return <>{children}</>; }
export function DialogClose({ asChild, children, ...props }) {
  const { setOpen } = React.useContext(DialogCtx);
  const onClick = () => setOpen(false);
  if (asChild && React.isValidElement(children)) return React.cloneElement(children, { onClick });
  return <button {...props} onClick={onClick}>{children}</button>;
}
export function DialogOverlay({ className, ...props }) {
  const { open, setOpen } = React.useContext(DialogCtx);
  if (!open) return null;
  return <div onClick={() => setOpen(false)} className={cn("fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in", className)} {...props} />;
}
export function DialogContent({ className, children, ...props }) {
  const { open, setOpen } = React.useContext(DialogCtx);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <DialogOverlay />
      <div role="dialog" className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg", className)} {...props}>
        {children}
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label="Close">✕</button>
      </div>
    </>
  );
}
export function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
}
export function DialogFooter({ className, ...props }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
}
export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}
export function DialogDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
`;

const sheet = `
import * as React from "react";
import { cn } from "@/lib/utils";

const SheetCtx = React.createContext({ open: false, setOpen: () => {} });

export function Sheet({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (controlledOpen === undefined) setUncontrolled(v);
    onOpenChange && onOpenChange(v);
  };
  return <SheetCtx.Provider value={{ open, setOpen }}>{children}</SheetCtx.Provider>;
}
export function SheetTrigger({ asChild, children, ...props }) {
  const { setOpen } = React.useContext(SheetCtx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: (e) => { children.props.onClick && children.props.onClick(e); setOpen(true); } });
  }
  return <button {...props} onClick={() => setOpen(true)}>{children}</button>;
}
export function SheetClose({ asChild, children, ...props }) {
  const { setOpen } = React.useContext(SheetCtx);
  const onClick = () => setOpen(false);
  if (asChild && React.isValidElement(children)) return React.cloneElement(children, { onClick });
  return <button {...props} onClick={onClick}>{children}</button>;
}
const SIDES = {
  top: "inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top",
  bottom: "inset-x-0 bottom-0 border-t",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
};
export function SheetContent({ side = "right", className, children, ...props }) {
  const { open, setOpen } = React.useContext(SheetCtx);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/80" />
      <div className={cn("fixed z-50 gap-4 bg-background p-6 shadow-lg", SIDES[side] || SIDES.right, className)} {...props}>
        {children}
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label="Close">✕</button>
      </div>
    </>
  );
}
export function SheetHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
}
export function SheetFooter({ className, ...props }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
}
export function SheetTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}
export function SheetDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
`;

const popover = `
import * as React from "react";
import { cn } from "@/lib/utils";

const PopoverCtx = React.createContext({ open: false, setOpen: () => {}, anchorRef: null });

export function Popover({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (controlledOpen === undefined) setUncontrolled(v);
    onOpenChange && onOpenChange(v);
  };
  const anchorRef = React.useRef(null);
  return <PopoverCtx.Provider value={{ open, setOpen, anchorRef }}>{children}</PopoverCtx.Provider>;
}
export function PopoverTrigger({ asChild, children, ...props }) {
  const { open, setOpen, anchorRef } = React.useContext(PopoverCtx);
  const handleClick = () => setOpen(!open);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref: anchorRef, onClick: handleClick });
  }
  return <button ref={anchorRef} {...props} onClick={handleClick}>{children}</button>;
}
export function PopoverContent({ className, align = "center", sideOffset = 4, children, ...props }) {
  const { open, setOpen, anchorRef } = React.useContext(PopoverCtx);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  if (!open) return null;
  const alignClass = align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div ref={ref} className={cn("absolute z-50 mt-1 min-w-[8rem] rounded-md border bg-popover p-4 text-popover-foreground shadow-md", alignClass, className)} style={{ marginTop: sideOffset }} {...props}>
      {children}
    </div>
  );
}
`;

const tooltip = `
import * as React from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children, delayDuration }) { return <>{children}</>; }

const TooltipCtx = React.createContext({ open: false, setOpen: () => {} });

export function Tooltip({ children, defaultOpen = false, open: controlledOpen, onOpenChange }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (controlledOpen === undefined) setUncontrolled(v);
    onOpenChange && onOpenChange(v);
  };
  return (
    <TooltipCtx.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>{children}</span>
    </TooltipCtx.Provider>
  );
}
export function TooltipTrigger({ asChild, children, ...props }) {
  if (asChild && React.isValidElement(children)) return children;
  return <span {...props}>{children}</span>;
}
export function TooltipContent({ className, side = "top", sideOffset = 4, children, ...props }) {
  const { open } = React.useContext(TooltipCtx);
  if (!open) return null;
  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }[side] || "bottom-full";
  return (
    <span role="tooltip" className={cn("absolute z-50 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md border", sideClass, className)} {...props}>
      {children}
    </span>
  );
}
`;

const dropdownMenu = `
import * as React from "react";
import { cn } from "@/lib/utils";

const MenuCtx = React.createContext({ open: false, setOpen: () => {}, anchorRef: null });

export function DropdownMenu({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = (v) => {
    if (controlledOpen === undefined) setUncontrolled(v);
    onOpenChange && onOpenChange(v);
  };
  const anchorRef = React.useRef(null);
  return (
    <MenuCtx.Provider value={{ open, setOpen, anchorRef }}>
      <div className="relative inline-block">{children}</div>
    </MenuCtx.Provider>
  );
}
export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const { open, setOpen, anchorRef } = React.useContext(MenuCtx);
  const handleClick = () => setOpen(!open);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref: anchorRef, onClick: handleClick });
  }
  return <button ref={anchorRef} {...props} onClick={handleClick}>{children}</button>;
}
export function DropdownMenuContent({ className, align = "end", sideOffset = 4, children, ...props }) {
  const { open, setOpen, anchorRef } = React.useContext(MenuCtx);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!open) return null;
  const alignClass = align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div ref={ref} className={cn("absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", alignClass, className)} style={{ marginTop: sideOffset }} {...props}>
      {children}
    </div>
  );
}
export function DropdownMenuItem({ className, onSelect, onClick, inset, children, ...props }) {
  const { setOpen } = React.useContext(MenuCtx);
  return (
    <div
      role="menuitem"
      className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground", inset && "pl-8", className)}
      onClick={(e) => { onClick && onClick(e); onSelect && onSelect(e); setOpen(false); }}
      {...props}
    >{children}</div>
  );
}
export function DropdownMenuLabel({ className, inset, ...props }) {
  return <div className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />;
}
export function DropdownMenuSeparator({ className, ...props }) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}
export function DropdownMenuShortcut({ className, ...props }) {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
}
export function DropdownMenuGroup({ children }) { return <>{children}</>; }
export function DropdownMenuPortal({ children }) { return <>{children}</>; }
`;

const select = `
import * as React from "react";
import { cn } from "@/lib/utils";

const SelectCtx = React.createContext({ value: "", setValue: () => {}, open: false, setOpen: () => {}, items: new Map() });

export function Select({ value: controlledValue, defaultValue = "", onValueChange, children, disabled }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;
  const [open, setOpen] = React.useState(false);
  const itemsRef = React.useRef(new Map());
  const setValue = (v) => {
    if (controlledValue === undefined) setUncontrolled(v);
    onValueChange && onValueChange(v);
    setOpen(false);
  };
  return (
    <SelectCtx.Provider value={{ value, setValue, open, setOpen, items: itemsRef.current, disabled }}>
      <div className="relative">{children}</div>
    </SelectCtx.Provider>
  );
}
export function SelectGroup({ children }) { return <div role="group">{children}</div>; }
export function SelectValue({ placeholder, className }) {
  const { value, items } = React.useContext(SelectCtx);
  const label = items.get(value);
  return <span className={cn(className, !value && "text-muted-foreground")}>{label || value || placeholder}</span>;
}
export function SelectTrigger({ className, children, ...props }) {
  const { open, setOpen, disabled } = React.useContext(SelectCtx);
  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
      className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    >
      {children}
      <span className="ml-2 opacity-50">▼</span>
    </button>
  );
}
export function SelectContent({ className, children, position, ...props }) {
  const { open, setOpen } = React.useContext(SelectCtx);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  if (!open) return null;
  return (
    <div ref={ref} className={cn("absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props}>
      {children}
    </div>
  );
}
export function SelectLabel({ className, ...props }) {
  return <div className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />;
}
export function SelectItem({ className, children, value, ...props }) {
  const { value: selected, setValue, items } = React.useContext(SelectCtx);
  React.useEffect(() => { items.set(value, typeof children === "string" ? children : value); return () => { items.delete(value); }; }, [value, children]);
  const isSelected = selected === value;
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => setValue(value)}
      className={cn("relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground", className)}
      {...props}
    >
      {isSelected && <span className="absolute left-2">✓</span>}
      {children}
    </div>
  );
}
export function SelectSeparator({ className, ...props }) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}
export function SelectScrollUpButton({ className, ...props }) { return null; }
export function SelectScrollDownButton({ className, ...props }) { return null; }
`;

const tabs = `
import * as React from "react";
import { cn } from "@/lib/utils";

const TabsCtx = React.createContext({ value: "", setValue: () => {} });

export function Tabs({ value: controlledValue, defaultValue = "", onValueChange, children, className, ...props }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;
  const setValue = (v) => {
    if (controlledValue === undefined) setUncontrolled(v);
    onValueChange && onValueChange(v);
  };
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div className={className} {...props}>{children}</div>
    </TabsCtx.Provider>
  );
}
export function TabsList({ className, ...props }) {
  return <div role="tablist" className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />;
}
export function TabsTrigger({ className, value, children, ...props }) {
  const { value: active, setValue } = React.useContext(TabsCtx);
  const isActive = active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setValue(value)}
      className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", isActive ? "bg-background text-foreground shadow-sm" : "", className)}
      {...props}
    >{children}</button>
  );
}
export function TabsContent({ className, value, children, ...props }) {
  const { value: active } = React.useContext(TabsCtx);
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props}>
      {children}
    </div>
  );
}
`;

export const SHADCN_STUBS: Record<string, string> = {
  button,
  card,
  input,
  label,
  textarea,
  badge,
  separator,
  avatar,
  switch: switchStub,
  checkbox,
  progress,
  skeleton,
  alert,
  dialog,
  sheet,
  popover,
  tooltip,
  dropdown: dropdownMenu,
  'dropdown-menu': dropdownMenu,
  select,
  tabs,
};

