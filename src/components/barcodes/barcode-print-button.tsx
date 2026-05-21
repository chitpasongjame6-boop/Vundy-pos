"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BarcodePrintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button type="button" onClick={() => window.print()} disabled={disabled}>
      <Printer className="h-4 w-4" aria-hidden />
      ພິມສະຕິກເກີ
    </Button>
  );
}
