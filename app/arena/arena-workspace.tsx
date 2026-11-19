"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { arenaGames, type ArenaGame } from "@/lib/arena-catalog";

function GameAction({ children, onClick, disabled = false }: {children: React.ReactNode;onClick: () => void; disabled?: boolean}) {
  return <button className="arena-action" type="button" disabled={disabled} onClick={onClick}>{children}</button>;
}

function Readout({ label, children }: {label:string;children:React.ReactNode}) {
  return <div className="arena-readout"><span>{label}</span><strong>{children}</strong></div>;
}

function LogicGame({ win }: { win: () => void }) {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [gate, setGate] = useState("AND");
  const output = gate === "AND" ? a && b : gate === "OR" ? a || b : gate === "XOR" ? a !== b : !(a && b);
  return <div className="arena-play"><div className="arena-controls">
    <GameAction onClick={() => setA(!a)}>Input A: {Number(a)}</GameAction>
    <GameAction onClick={() => setB(!b)}>Input B: {Number(b)}</GameAction>
    <label>Logic gate <select value={gate} onChange={e => setGate(e.target.value)}>{["AND","OR","XOR","NAND"].map(g => <option key={g}>{g}</option>)}</select></label>
  </div><Readout label="Output" >{Number(output)}</Readout>
  <GameAction onClick={win} disabled={!output}>Validate output 1</GameAction></div>;
}
function ProjectileGame({ win }: { win: () => void }) {
  const [angle, setAngle] = useState(35), [speed,setSpeed] = useState(24);
  const range = speed ** 2 * Math.sin(2 * angle * Math.PI / 180) / 9.81;
  const target = 50;
  return <div className="arena-play">
    <label>Launch angle: {angle}° <input type="range" min="5" max="85" value={angle} onChange={e => setAngle(+e.target.value)}/></label>
    <label>Speed: {speed} m/s <input type="range" min="10" max="35" value={speed} onChange={e => setSpeed(+e.target.value)}/></label>
    <div className="arena-trajectory" role="img" aria-label="Illustration of projectile trajectory">
      <svg viewBox="0 0 480 145" preserveAspectRatio="xMidYMid meet"><path d="M15 124 H465" stroke="currentColor" opacity=".3" strokeWidth="2"/><path d={"M15 124 Q "+(15+Math.min(range,100)*3.8/2)+" "+(18-Math.min(90,range))+" "+(15+Math.min(range,100)*3.8)+" 124"} fill="none" stroke="#ab8cff" strokeWidth="4" strokeDasharray="7 5"/><path d="M205 100v25" stroke="#61d5c3" strokeWidth="4"/><text x="210" y="95" fill="#61d5c3" fontSize="13">Target 50 m</text></svg>
    </div>
    <Readout label="Calculated range">{range.toFixed(1)} m / 50 m</Readout><GameAction disabled={Math.abs(range-target)>2} onClick={win}>Land within 2 meters</GameAction></div>;
}
function MatrixGame({win}:{win:()=>void}) {
  const [matrix,setMatrix]=useState("identity");
  const choices=[{id:"identity",label:"Identity",vals:[2,1]},{id:"rotate",label:"90° rotation",vals:[-1,2]},{id:"reflect",label:"Reflect X",vals:[2,-1]},{id:"scale",label:"Double scale",vals:[4,2]}];
  const selected=choices.find(x=>x.id===matrix)!;
  return <div className="arena-play"><div className="arena-controls">{choices.map(x=><GameAction key={x.id} onClick={()=>setMatrix(x.id)}>{x.label}</GameAction>)}</div>
    <Readout label="Original vector">(2, 1)</Readout><Readout label="Transformed vector">({selected.vals.join(", ")})</Readout>
    <GameAction onClick={win} disabled={matrix!=="rotate"}>Match target (-1, 2)</GameAction></div>;
}
function SortingGame({win}:{win:()=>void}) {
  const [values,setValues]=useState([5,2,4,1,3]), [swaps,setSwaps]=useState(0);
  const sorted=values.every((v,i)=>i===0||v>=values[i-1]);
  function swap(i:number){setValues(prev=>{const next=[...prev];[next[i],next[i+1]]=[next[i+1],next[i]];return next;});setSwaps(s=>s+1);}
  return <div className="arena-play"><div className="arena-number-line">{values.map((v,i)=><span key={i}>{v}</span>)}</div><div className="arena-controls">
    {values.slice(0,-1).map((_,i)=><GameAction key={i} disabled={sorted} onClick={()=>swap(i)}>Swap {i+1} ↔ {i+2}</GameAction>)}
    </div><Readout label="Adjacent swaps">{swaps}</Readout><GameAction disabled={!sorted} onClick={win}>Validate sorted array</GameAction></div>;
}
function ChemicalGame({win}:{win:()=>void}) {
  const [coeff,setCoeff]=useState([1,1,1]);
  const Hleft=2*coeff[0], Hright=2*coeff[2], Oleft=2*coeff[1], Oright=coeff[2];
  const balanced=Hleft===Hright&&Oleft===Oright;
  return <div className="arena-play"><p className="arena-equation">{coeff[0]}H₂ + {coeff[1]}O₂ → {coeff[2]}H₂O</p>
    <div className="arena-controls">{coeff.map((v,i)=><label key={i}>{["H₂","O₂","H₂O"][i]} coefficient <input type="number" min="1" max="12" value={v} onChange={e=>setCoeff(old=>old.map((item,j)=>j===i?Math.max(1,Math.min(12,Math.trunc(Number(e.target.value)||1))):item))}/></label>)}</div>
    <Readout label="Hydrogen left / right">{Hleft} / {Hright}</Readout><Readout label="Oxygen left / right">{Oleft} / {Oright}</Readout>
    <GameAction disabled={!balanced} onClick={win}>Verify balanced equation</GameAction></div>;
}
function MarketGame({win}:{win:()=>void}) {
  const [price,setPrice]=useState(8), demand=100-2*price, supply=20+2*price;
  return <div className="arena-play"><label>Price: {price} <input type="range" min="0" max="40" value={price} onChange={e=>setPrice(+e.target.value)}/></label>
    <Readout label="Demand quantity">{demand}</Readout><Readout label="Supply quantity">{supply}</Readout>
    <Readout label="Surplus / shortage">{supply-demand}</Readout><GameAction disabled={demand!==supply} onClick={win}>Confirm equilibrium</GameAction></div>;
}
function CipherGame({win}:{win:()=>void}) {
  const [shift,setShift]=useState(0);
  const decoded=[..."KHOOR"].map(x=>String.fromCharCode(65+(x.charCodeAt(0)-65-shift+26)%26)).join("");
  return <div className="arena-play"><Readout label="Encrypted message">KHOOR</Readout><label>Reverse Caesar shift: {shift}
    <input type="range" min="0" max="25" value={shift} onChange={e=>setShift(+e.target.value)}/></label>
    <Readout label="Your decoded text">{decoded}</Readout><GameAction disabled={decoded!=="HELLO"} onClick={win}>Decrypt HELLO</GameAction></div>;
}
function BinaryGame({win}:{win:()=>void}) {
  const [bits,setBits]=useState([0,0,0,0,0,0,0,0]);
  const value=bits.reduce((sum,bit,i)=>sum+bit*2**(7-i),0);
  return <div className="arena-play"><div className="arena-bit-row" aria-label="8 bit register">{bits.map((bit,i)=><button key={i} type="button" aria-label={"Toggle bit "+(7-i)} aria-pressed={Boolean(bit)} onClick={()=>setBits(b=>b.map((v,j)=>i===j?1-v:v))}>{bit}<small>2^{7-i}</small></button>)}</div>
    <Readout label="Binary">{bits.join("")}</Readout><Readout label="Hexadecimal">0x{value.toString(16).padStart(2,"0").toUpperCase()}</Readout>
    <GameAction onClick={win} disabled={value!==0xA5}>Match A5</GameAction></div>;
}
function IntegralGame({win}:{win:()=>void}) {
  const [n,setN]=useState(2);
  const approx=(Array.from({length:n},(_,i)=>(i*i+(i+1)*(i+1))/(2*n*n*n))).reduce((a,b)=>a+b,0);
  const delta=Math.abs(approx-1/3);
  return <div className="arena-play"><label>Number of trapezoids: {n} <input type="range" min="2" max="32" step="1" value={n} onChange={e=>setN(+e.target.value)}/></label>
    <Readout label="Trapezoidal approximation">{approx.toFixed(6)}</Readout><Readout label="Exact integral">0.333333</Readout>
    <Readout label="Absolute error">{delta.toFixed(6)}</Readout><GameAction disabled={delta>=0.005} onClick={win}>Validate accuracy</GameAction></div>;
}
function AtomicGame({win}:{win:()=>void}) {
  const [p,setP]=useState(1),[n,setN]=useState(1),[e,setE]=useState(1);
  return <div className="arena-play"><div className="arena-controls">{[
    {label:"Protons",v:p,set:setP},{label:"Neutrons",v:n,set:setN},{label:"Electrons",v:e,set:setE}
  ].map(x=><label key={x.label}>{x.label}<input type="number" min="0" max="20" value={x.v} onChange={ev=>x.set(Math.max(0,Math.min(20,Math.trunc(Number(ev.target.value)||0))))}/></label>)}</div>
    <Readout label="Mass number">{p+n}</Readout><Readout label="Net charge">{p-e}</Readout><Readout label="Element">{p===6?"Carbon":p===1?"Hydrogen":p===8?"Oxygen":"Unknown"}</Readout>
    <GameAction disabled={p!==6||n!==6||e!==6} onClick={win}>Complete carbon-12</GameAction></div>;
}
function GameContent({id,win}:{id:string;win:()=>void}) {
  switch(id){
    case "logic-circuit-lab":return <LogicGame win={win}/>;
    case "orbital-ballistics-sim":return <ProjectileGame win={win}/>;
    case "matrix-transform-arena":return <MatrixGame win={win}/>;
    case "algorithm-sort-duel":return <SortingGame win={win}/>;
    case "stoichiometry-balancer":return <ChemicalGame win={win}/>;
    case "equilibrium-market-sim":return <MarketGame win={win}/>;
    case "cipher-breaker-lab":return <CipherGame win={win}/>;
    case "binary-hex-bridge":return <BinaryGame win={win}/>;
    case "calculus-integral-estimator":return <IntegralGame win={win}/>;
    case "periodic-element-forge":return <AtomicGame win={win}/>;
    default:return <p>Game not found.</p>;
  }
}
function PracticeGame({game,onBack}:{game:ArenaGame;onBack:()=>void}) {
  const [completed,setCompleted]=useState(false),[retry,setRetry]=useState(0);
  return <section className="arena-panel" aria-labelledby="arena-active-title">
    <button type="button" className="arena-back" onClick={onBack}>← All games</button>
    <p className="arena-eyebrow">{game.discipline} · PRACTICE ONLY</p>
    <h2 id="arena-active-title">{game.title}</h2><p>{game.instructions}</p>
    {completed?<div role="status" className="arena-success"><strong>Challenge solved!</strong><p>Great work. Practice results are not counted toward ranked XP or leaderboards.</p><GameAction onClick={()=>{setCompleted(false);setRetry(x=>x+1)}}>Play again</GameAction></div>:
      <GameContent key={retry} id={game.id} win={()=>setCompleted(true)}/>}
  </section>;
}
export function ArenaWorkspace(){
  const [selected,setSelected]=useState<string|null>(null);
  const [filter,setFilter]=useState("All"),[search,setSearch]=useState("");
  const game=arenaGames.find(x=>x.id===selected);
  const disciplines=useMemo(()=>["All",...new Set(arenaGames.map(x=>x.discipline))],[]);
  const filtered=arenaGames.filter(x=>(filter==="All"||x.discipline===filter)&&(x.title+" "+x.description).toLowerCase().includes(search.toLowerCase().trim()));
  return <main className="arena-page">
    <div className="arena-hero"><div><p className="arena-eyebrow">JARVIS · INTERACTIVE LEARNING</p><h1>Arena<span>.</span></h1>
    <p>Turn academic concepts into interactive practice. Ten learning challenges across five subjects.</p>
    <div className="arena-hero-links"><span>10 interactive games</span><span>No account or XP required for practice</span></div></div>
    <Link className="arena-back-to-learning" href="/learning">Learning tools ↗</Link></div>
    {game?<PracticeGame key={game.id} game={game} onBack={()=>setSelected(null)}/>:<>
      <section className="arena-tools" aria-label="Filter Arena games">
        <label>Search games<input value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Search by title or subject…"/></label>
        <label>Discipline<select value={filter} onChange={e=>setFilter(e.target.value)}>{disciplines.map(x=><option key={x}>{x}</option>)}</select></label>
      </section>
      <div className="arena-grid">{filtered.map(g=><article key={g.id} className="arena-card">
        <div className="arena-card-symbol" aria-hidden="true">{g.icon}</div>
        <p className="arena-eyebrow">{g.discipline}</p><h2>{g.title}</h2><p>{g.description}</p>
        <div className="arena-card-footer"><span>Practice mode</span><button type="button" onClick={()=>setSelected(g.id)} aria-label={"Play "+g.title}>Play now →</button></div>
      </article>)}</div>
      {!filtered.length&&<div className="arena-empty">No games match that search. Try another subject.</div>}
    </>}
    <p className="arena-disclaimer">This is an adapted practice version of the supplied Arena game catalogue. Ranked XP, badges and leaderboards are not yet active; they require verified server-side scoring in Step 4.</p>
  </main>;
}
