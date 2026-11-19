"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { arenaGames, findArenaGame, type ArenaGame } from "@/lib/arena-games";

const disciplines = ["All", "Computer Science", "Mathematics", "Physics", "Chemistry", "Economics"];
type Result = { gameId:string; score:number; total:number; completedAt:string };

function Challenge({ game, onExit }:{game:ArenaGame;onExit:()=>void}) {
  const [round,setRound]=useState(0);
  const [choice,setChoice]=useState<number|null>(null);
  const [checked,setChecked]=useState(false);
  const [score,setScore]=useState(0);
  const [done,setDone]=useState(false);
  const [sound,setSound]=useState(false);
  const [level,setLevel]=useState("Beginner");
  const [saved,setSaved]=useState(false);
  const question=game.puzzles[(round+["Beginner","Intermediate","Advanced","Expert"].indexOf(level))%game.puzzles.length];
  function reset(next=level){setRound(0);setChoice(null);setChecked(false);setScore(0);setDone(false);setSaved(false);setLevel(next)}
  function check(){if(choice===null||checked)return;setChecked(true);const right=choice===question.answer;if(right)setScore(s=>s+1);
    if(sound)try{const ac=new AudioContext();const o=ac.createOscillator();const g=ac.createGain();o.frequency.value=right?700:250;g.gain.value=.025;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.1);void ac.close().catch(()=>{});}catch{/* optional sound */}}
  function next(){if(round<game.puzzles.length-1){setRound(r=>r+1);setChoice(null);setChecked(false);return;}
    const result:Result={gameId:game.id,score,total:game.puzzles.length,completedAt:new Date().toISOString()};
    try{const prev=JSON.parse(localStorage.getItem("jarvis-arena-practice-v1")||"[]");if(Array.isArray(prev)){localStorage.setItem("jarvis-arena-practice-v1",JSON.stringify([result,...prev].slice(0,50)));setSaved(true)}}catch{/* storage optional */}
    setDone(true);
  }
  return <section className="space-y-5" aria-label="Game challenge">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onExit} className="rounded-xl border border-slate-600 px-4 py-2">← All games</button>
      <span className="rounded-full border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300">PRACTICE · NO RANKED XP</span>
    </div>
    <article className="rounded-2xl border border-slate-700 bg-[#151b30] p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">{game.discipline}</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{game.symbol} {game.title}</h2>
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-300">
        <label>Difficulty <select aria-label="Difficulty" className="ml-2 rounded-lg border border-slate-600 bg-[#101625] p-2" value={level} onChange={e=>reset(e.target.value)}>
        {["Beginner","Intermediate","Advanced","Expert"].map(d=><option key={d}>{d}</option>)}</select></label>
        <button type="button" onClick={()=>setSound(v=>!v)} aria-pressed={sound} className="rounded-lg border border-slate-600 px-3 py-2">{sound?"Sound on":"Sound off"}</button>
        <button type="button" onClick={()=>reset()} className="rounded-lg border border-slate-600 px-3 py-2">Restart</button>
        <span>Correct: {score}/{game.puzzles.length}</span>
      </div>
      {done?<div role="status" className="mt-7 space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-600/10 p-5">
        <h3 className="text-xl font-bold">Challenge completed</h3>
        <p>{score} of {game.puzzles.length} correct.</p>
        <p className="text-sm text-slate-300">{saved?"Saved locally on this device.":"Local storage unavailable."} Competitive scores and XP are disabled until server verification is implemented.</p>
        <button type="button" onClick={()=>reset()} className="rounded-lg bg-violet-600 px-5 py-3 font-semibold">Play again</button>
      </div>:<div className="mt-7 space-y-5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-violet-500" style={{width:((round+1)/game.puzzles.length*100)+"%"}}/></div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question {round+1} of {game.puzzles.length}</p>
        <h3 className="text-lg font-semibold text-white">{question.prompt}</h3>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Select answer">
          {question.choices.map((answer,i)=><button key={i} type="button" role="radio" aria-checked={choice===i} disabled={checked}
            onClick={()=>setChoice(i)} className={"min-h-16 rounded-xl border p-4 text-left font-semibold "+(checked&&i===question.answer?"border-emerald-400 bg-emerald-400/10":checked&&i===choice?"border-rose-400 bg-rose-400/10":i===choice?"border-violet-400 bg-violet-500/20":"border-slate-700 bg-[#0e1424] hover:border-violet-400")}>
            {String.fromCharCode(65+i)}. {answer}</button>)}
        </div>
        {checked?<div role="status" className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className={choice===question.answer?"font-bold text-emerald-300":"font-bold text-rose-300"}>{choice===question.answer?"Correct!":"Not quite."}</p>
          <p className="mt-2 text-sm text-slate-300">{question.explanation}</p>
          <button type="button" onClick={next} className="mt-4 rounded-lg bg-violet-600 px-5 py-3 font-bold">{round===game.puzzles.length-1?"Finish challenge":"Next question →"}</button>
        </div>:<button type="button" onClick={check} disabled={choice===null} className="rounded-lg bg-violet-600 px-5 py-3 font-bold disabled:opacity-40">Check answer</button>}
      </div>}
    </article>
  </section>;
}

export function ArenaWorkspace({ initialGameId }:{initialGameId?:string}) {
  const [active,setActive]=useState(initialGameId&&findArenaGame(initialGameId)?initialGameId:"");
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const selected=active?findArenaGame(active):undefined;
  const games=useMemo(()=>arenaGames.filter(g=>(filter==="All"||g.discipline===filter)&&
    (g.title+" "+g.discipline).toLowerCase().includes(search.toLowerCase().trim())),[filter,search]);
  function open(id:string){setActive(id);window.history.replaceState(window.history.state,"","/arena?game="+encodeURIComponent(id));window.scrollTo({top:0,behavior:"smooth"})}
  function exit(){setActive("");window.history.replaceState(window.history.state,"","/arena")}
  return <main className="min-h-screen bg-[#0b101d] text-slate-100">
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-8">
      <nav className="text-xs font-bold uppercase tracking-widest text-slate-400"><Link href="/dashboard">University hub</Link> / Arena</nav>
      <header className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-[#24204f] to-[#111827] p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">JARVIS · INTERACTIVE LEARNING</p>
        <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">The Arena<span className="text-violet-400">.</span></h1>
        <p className="mt-3 max-w-2xl text-slate-300">Ten university learning challenges across five disciplines. Learn through short interactive practice rounds.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full border border-violet-400/40 px-3 py-2">10 games</span><span className="rounded-full border border-violet-400/40 px-3 py-2">5 subjects</span><span className="rounded-full border border-amber-400/40 px-3 py-2 text-amber-200">Unranked practice</span></div>
      </header>
      {selected?<Challenge key={selected.id} game={selected} onExit={exit}/>:<>
        <section className="rounded-xl border border-slate-700 bg-[#151b30] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Academic Game Library</h2>
            <input type="search" aria-label="Search games" placeholder="Search games…" value={search} onChange={e=>setSearch(e.target.value)} className="rounded-lg border border-slate-600 bg-[#0d1422] p-3 text-white"/>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{disciplines.map(d=><button type="button" key={d} aria-pressed={d===filter} onClick={()=>setFilter(d)}
            className={"rounded-full border px-3 py-2 text-sm "+(d===filter?"border-violet-400 bg-violet-600 text-white":"border-slate-600 text-slate-300")}>{d}</button>)}</div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Game library">
          {games.map(g=><article key={g.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-[#151b30] p-5">
            <div><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-2xl font-bold text-violet-300">{g.symbol}</span><span className="text-xs font-bold text-amber-300">PRACTICE</span></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-violet-300">{g.discipline}</p><h3 className="mt-1 text-lg font-bold">{g.title}</h3><p className="mt-2 text-sm text-slate-400">Three interactive exercises with feedback and explanations.</p></div>
            <button type="button" onClick={()=>open(g.id)} className="rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500">Play challenge →</button>
          </article>)}
          {!games.length&&<p role="status">No matching games.</p>}
        </section>
        <p className="text-sm text-slate-400">Practice scores stay on this device. XP, leagues, and server-backed leaderboards will be implemented in Step 4.</p>
      </>}
    </div>
  </main>;
}
