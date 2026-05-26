import type { Metadata } from "next";
import { Noto_Sans_Lao } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";

const notoSansLao = Noto_Sans_Lao({
  subsets: ["lao", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-lao",
  display: "swap"
});

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
      <body className={notoSansLao.variable}>
        <AppShell currentUser={currentUser}>{children}</AppShell>
      </body>
    </html>
  );
}
