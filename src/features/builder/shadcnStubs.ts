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
};
