import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        variant === "primary" && "bg-indigo-600 text-white shadow-indigo-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
        variant === "ghost" && "shadow-none text-slate-700 hover:bg-slate-100",
        variant === "danger" && "bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700",
        className
      )}
      {...props}
    />
  );
}
