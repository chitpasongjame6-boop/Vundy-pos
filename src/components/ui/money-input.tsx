"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
};

export function MoneyInput({
  className,
  name,
  value,
  defaultValue = 0,
  onValueChange,
  ...props
}: MoneyInputProps) {
  const controlled = typeof value === "number";
  const [internalValue, setInternalValue] = useState(defaultValue);
  const numericValue = controlled ? value : internalValue;

  function updateValue(nextDisplayValue: string) {
    const nextValue = parseMoneyInput(nextDisplayValue);

    if (!controlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={numericValue} /> : null}
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatMoneyInput(numericValue)}
        onChange={(event) => updateValue(event.target.value)}
        className={cn(
          "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none",
          "focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200",
          className
        )}
      />
    </>
  );
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits ? Number(digits) : 0;
}

function formatMoneyInput(value: number) {
  const safeValue = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

  return safeValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
