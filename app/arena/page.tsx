import type { Metadata } from "next";
import { ArenaWorkspace } from "./arena-workspace";
import { findArenaGame } from "@/lib/arena-games";
export const metadata:Metadata={title:"JARVIS Arena | Interactive Learning",description:"Ten interactive academic practice games"};
export default async function ArenaPage({searchParams}:PageProps<"/arena">){const q=await searchParams;const game=typeof q.game==="string"?q.game:"";return <ArenaWorkspace initialGameId={findArenaGame(game)?.id}/>}
