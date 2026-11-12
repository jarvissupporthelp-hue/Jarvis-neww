import type { Metadata } from "next";
import { WorkspaceShell } from "./components/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS | Academic Workspace",
  description: "One connected academic workspace for the UFAR pilot.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><WorkspaceShell>{children}</WorkspaceShell></body></html>;
}
