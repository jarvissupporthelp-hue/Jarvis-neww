import type { Metadata } from "next";
import { headers } from "next/headers";
import { WorkspaceShell } from "./components/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS | Academic Workspace",
  description: "One connected academic workspace for the UFAR pilot.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferred = (await headers()).get("x-jarvis-locale") ?? "en";
  const locale = ["hy","en","fr","ru"].includes(preferred) ? preferred : "en";
  return <html lang={locale} suppressHydrationWarning><body><WorkspaceShell initialLanguage={locale}>{children}</WorkspaceShell></body></html>;
}
