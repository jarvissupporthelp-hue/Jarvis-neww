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
  const locale = (await headers()).get("x-jarvis-locale") === "hy" ? "hy" : "en";
  return <html lang={locale} suppressHydrationWarning><body><WorkspaceShell>{children}</WorkspaceShell></body></html>;
}
