"use client";

import { useEffect, useState } from "react";

export function Connectivity() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[100] bg-amber-500 px-3 py-2 text-center text-sm font-bold text-amber-950 shadow-lg">
      ອອບລາຍ — ກະລຸນາຢ່າບັນທຶກບິນຈົນກວ່າອິນເຕີເນັດກັບຄືນ
    </div>
  );
}
