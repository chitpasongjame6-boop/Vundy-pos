import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getExpiryLabel, getExpiryStatus } from "@/lib/product-expiry";

export function ExpiryBadge({ expiryDate, today }: { expiryDate?: string | null; today: string }) {
  const expiry = getExpiryStatus(expiryDate, today);
  if (!expiry || expiry.status === "OK") return null;
  return (
    <Badge className={expiry.status === "SOON"
      ? "gap-1 border-amber-200 bg-amber-100 text-amber-900"
      : "gap-1 border-rose-200 bg-rose-100 text-rose-800"}>
      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {getExpiryLabel(expiry)}
    </Badge>
  );
}
