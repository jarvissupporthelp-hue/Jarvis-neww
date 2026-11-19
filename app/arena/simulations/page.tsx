import type { Metadata } from "next";
import { ArenaWorkspace } from "./simulation-workspace";
import "../arena.css";
export const metadata: Metadata = {
  title: "JARVIS Arena Simulations",
  description: "Interactive academic simulations for ten university subjects.",
};
export default function ArenaSimulationsPage() {
  return <ArenaWorkspace />;
}
