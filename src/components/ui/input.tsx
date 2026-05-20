import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200",
        className
      )}
      {...props}
    />
  );
}
