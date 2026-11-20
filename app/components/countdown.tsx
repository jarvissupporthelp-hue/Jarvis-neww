"use client";
import {useEffect} from "react";
import {useInterfaceCopy} from "./interface-language";
export function Countdown({seconds,total,label,running}:{seconds:number;total:number;label:string;running:boolean}){
 const t=useInterfaceCopy();
 const time=[Math.floor(seconds/60),seconds%60].map(v=>String(v).padStart(2,"0")).join(":");
 useEffect(()=>{
  if(!running)return;
  const previous=document.title;
  document.title=time+" · "+t(label)+" · JARVIS";
  return ()=>{document.title=previous;};
 },[time,running,label,t]);
 return <div className="jarvis-countdown"><span>{t(label)}</span><strong role="timer" aria-live="off">{time}</strong><progress aria-label={t(label)} max={Math.max(total,1)} value={Math.min(seconds,total)}/></div>;
}
