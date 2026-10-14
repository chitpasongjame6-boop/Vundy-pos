import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Connectivity } from "@/components/layout/connectivity";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vundy - POS",
  description: "Vundy - POS"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="lo">
      <body>
        <Connectivity />
        <AppShell currentUser={currentUser}>{children}</AppShell>
      </body>
    </html>
  );
}
