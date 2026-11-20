"use client";
import {useEffect, useRef} from "react";
import {useInterfaceCopy} from "./interface-language";
export function Countdown({seconds,total,label,running}:{seconds:number;total:number;label:string;running:boolean}){
 const dialog = useRef<HTMLDialogElement>(null);
 const t=useInterfaceCopy();
 const time=[Math.floor(seconds/60),seconds%60].map(v=>String(v).padStart(2,"0")).join(":");
 useEffect(()=>{
  if(!running)return;
  const previous=document.title;
  document.title=time+" · "+t(label)+" · JARVIS";
  return ()=>{document.title=previous;};
 },[time,running,label,t]);
 const face = <><span>{t(label)}</span><strong role="timer" aria-live="off">{time}</strong><progress aria-label={t(label)} max={Math.max(total,1)} value={Math.min(seconds,total)}/></>;
 return <>
   <div className="jarvis-countdown">{face}
     <button type="button" onClick={() => dialog.current?.showModal()}>{t("Expand timer")}</button>
   </div>
   <dialog ref={dialog} className="jarvis-timer-dialog" aria-label={t(label)}>
     <div className="jarvis-countdown">{face}
       <button type="button" onClick={() => dialog.current?.close()}>{t("Close timer view")}</button>
     </div>
   </dialog>
 </>;
}
