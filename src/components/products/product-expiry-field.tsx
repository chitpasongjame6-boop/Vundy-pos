"use client";

import { useId, useRef, useState } from "react";
import { CalendarClock, CalendarDays } from "lucide-react";
import { EXPIRY_DATE_ERROR, EXPIRY_WARNING_DAYS, formatExpiryDate, isValidExpiryDate, normalizeExpiryDateInput } from "@/lib/product-expiry";

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

export function ProductExpiryField({ defaultValue }: { defaultValue?: string | null }) {
  const id = useId();
  const textRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => defaultValue && isValidExpiryDate(defaultValue) ? formatExpiryDate(defaultValue) : "");
  const [touched, setTouched] = useState(false);
  const [calendarFallback, setCalendarFallback] = useState(false);
  const normalized = normalizeExpiryDateInput(value);
  const showError = touched && normalized === null;

  function updateValue(nextValue: string) {
    setValue(nextValue);
    textRef.current?.setCustomValidity(normalizeExpiryDateInput(nextValue) === null ? EXPIRY_DATE_ERROR : "");
  }

  function openCalendar() {
    try {
      if (calendarRef.current?.showPicker) {
        calendarRef.current.showPicker();
        return;
      }
    } catch {
      // Embedded or older browsers may disallow showPicker; expose the native field instead.
    }
    setCalendarFallback(true);
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
        <CalendarClock className="h-4 w-4 text-amber-600" aria-hidden />
        ວັນໝົດອາຍຸ
        <span className="text-xs font-normal text-slate-500">(ບໍ່ບັງຄັບ)</span>
      </label>
      <div className="relative">
        <input
          ref={textRef}
          id={id}
          name="variantExpiryDate"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          value={value}
          aria-invalid={showError}
          aria-describedby={`${id}-help${showError ? ` ${id}-error` : ""}`}
          className={`${inputClass} pr-14${showError ? " border-rose-400" : ""}`}
          onChange={(event) => updateValue(event.currentTarget.value)}
          onBlur={() => {
            setTouched(true);
            if (normalized !== null) updateValue(normalized ? formatExpiryDate(normalized) : "");
          }}
          onInvalid={() => setTouched(true)}
        />
        <button
          type="button"
          onClick={openCalendar}
          aria-label="ເລືອກວັນໝົດອາຍຸຈາກປະຕິທິນ"
          title="ເລືອກຈາກປະຕິທິນ"
          className="absolute right-0 top-0 flex h-11 w-12 items-center justify-center rounded-r-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <CalendarDays className="h-5 w-5" aria-hidden />
        </button>
        <input
          ref={calendarRef}
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          value={normalized ?? ""}
          tabIndex={calendarFallback ? 0 : -1}
          aria-label="ປະຕິທິນວັນໝົດອາຍຸ"
          className={calendarFallback ? `${inputClass} mt-2` : "sr-only"}
          onChange={(event) => {
            const selected = event.currentTarget.value;
            if (selected && !isValidExpiryDate(selected)) return;
            updateValue(selected ? formatExpiryDate(selected) : "");
            setTouched(false);
            setCalendarFallback(false);
          }}
        />
      </div>
      <p id={`${id}-help`} className="text-xs leading-5 text-slate-600">
        ພິມ ວັນ/ເດືອນ/ປີ (ຄ.ສ.) ເຊັ່ນ 31/12/2026 ຫຼື 31122026 ຫຼື ກົດປະຕິທິນ.
      </p>
      {showError ? <p id={`${id}-error`} role="alert" className="text-xs text-rose-600">{EXPIRY_DATE_ERROR}</p> : null}
      <p className="text-xs leading-5 text-slate-600">
        ແຈ້ງເຕືອນລ່ວງໜ້າ {EXPIRY_WARNING_DAYS} ມື້. ຖ້າມີຫຼາຍລັອດ ໃຫ້ໃສ່ວັນທີ່ໝົດອາຍຸໄວສຸດຂອງສິນຄ້າທີ່ຍັງເຫຼືອ.
      </p>
    </div>
  );
}
