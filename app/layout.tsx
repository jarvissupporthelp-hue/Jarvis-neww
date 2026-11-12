import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS | Academic Workspace",
  description: "An academic workspace for the UFAR pilot.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-jarvis-locale") === "hy" ? "hy" : "en";
  return <html lang={locale}><body>{children}</body></html>;
}
