"use client";
import {AccountActions} from "./account-actions";
import Link from "next/link";
import {useState} from "react";
import {getClient} from "@/lib/browser-supabase";
import {Avatar,avatars,labels,useLibrary,type Language} from "@/modules/campus/library-personal";
export default function Profile(){
 const p=useLibrary("hy",false), t=labels[p.language];
 const [busy,setBusy]=useState(false);
 async function upload(file?:File){
  if(!file)return;
  if(file.size>8000000||!["image/jpeg","image/png","image/webp"].includes(file.type)){p.setNotice("Choose a JPG, PNG or WebP under 8 MB.");return;}
  setBusy(true);
  try{
   const img=await createImageBitmap(file);const canvas=document.createElement("canvas");canvas.width=canvas.height=160;
   const size=Math.min(img.width,img.height);canvas.getContext("2d")!.drawImage(img,(img.width-size)/2,(img.height-size)/2,size,size,0,0,160,160);img.close();
   p.setAvatar(canvas.toDataURL("image/jpeg",0.8));p.setNotice("");
  }catch{p.setNotice("Could not open this image.");}finally{setBusy(false);}
 }
 async function save(){
  setBusy(true);
  try{const {error}=await getClient().from("library_profiles").upsert({user_id:p.user,language:p.language,avatar:p.avatar});if(error)throw error;window.dispatchEvent(new Event("jarvis-profile-saved"));p.setNotice(t[11]);}catch{p.setNotice("Could not save your profile.");}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-lg space-y-5 p-6"><h1 className="text-3xl font-semibold">{t[6]}</h1>{p.user?<fieldset disabled={busy} className="space-y-4"><Avatar value={p.avatar}/><label className="block">{t[7]} <select value={p.language} onChange={e=>p.setLanguage(e.target.value as Language)}>{Object.entries({hy:"Հայերեն",en:"English",fr:"Français",ru:"Русский"}).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div>{t[8]} {avatars.map(v=><button key={v} aria-pressed={p.avatar===v} onClick={()=>p.setAvatar(v)} className="p-2 aria-pressed:rounded-full aria-pressed:bg-green-100">{v}</button>)}</div><label className="block">{t[9]}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label><button className="jarvis-primary-button" onClick={save}>{t[10]}</button></fieldset>:<Link href="/account">{t[12]}</Link>}<p role="status">{p.notice}</p>{p.user && <AccountActions language={p.language}/>}</main>;
}
