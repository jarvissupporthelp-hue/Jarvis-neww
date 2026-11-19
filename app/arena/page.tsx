import type { Metadata } from "next";
import { ArenaWorkspace } from "./arena-workspace";
import "./arena.css";

export const metadata: Metadata = {
  title: "JARVIS Arena | Interactive Learning",
  description: "Ten interactive educational practice games for mathematics, computing, science and economics.",
};

export default function ArenaPage() {
  return <ArenaWorkspace />;
}
