import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS | Academic Workspace",
  description: "An academic workspace for the UFAR pilot.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
