"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BackupControls() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function restore() {
    if (!file || !window.confirm("ການກູ້ຄືນຈະແທນທີ່ຂໍ້ມູນທັງໝົດ. ຢືນຢັນຫຼືບໍ່?")) return;
    setBusy(true);
    setMessage("");
    try {
      const body = await file.text();
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      setMessage(result.message ?? (response.ok ? "ສໍາເລັດ" : "ກູ້ຄືນບໍ່ສໍາເລັດ"));
      if (response.ok) window.location.reload();
    } catch {
      setMessage("ບໍ່ສາມາດອ່ານ ຫຼື ກູ້ຄືນໄຟລ໌ນີ້ໄດ້");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 p-3">
      <a href="/api/backup" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
        <Download className="h-4 w-4" /> ດາວໂຫຼດ Backup JSON
      </a>
      <Input type="file" accept="application/json,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <Button type="button" variant="secondary" onClick={restore} disabled={!file || busy}>
        <Upload className="h-4 w-4" /> {busy ? "ກໍາລັງກູ້ຄືນ..." : "ກູ້ຄືນຈາກ Backup"}
      </Button>
      {message ? <p className="text-xs font-semibold text-slate-700">{message}</p> : null}
    </div>
  );
}
