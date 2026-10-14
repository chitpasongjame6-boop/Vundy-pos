import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  actions
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1 w-10 rounded-full bg-indigo-500" />
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions || (actionHref && actionLabel) ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end">
          {actions}
          {actionHref && actionLabel ? (
            <Link href={actionHref}>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" aria-hidden />
                {actionLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
