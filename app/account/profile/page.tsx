"use client";
import {useInterfaceCopy} from "@/app/components/interface-language";
import {AccountActions} from "./account-actions";
import Link from "next/link";
import {useState} from "react";
import {getClient} from "@/lib/browser-supabase";
import {Avatar,avatars,labels,useLibrary,type Language} from "@/modules/campus/library-personal";
export default function Profile(){
 const translate=useInterfaceCopy();
 const p=useLibrary("en",false), t=labels[p.language];
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
 async function save(language: Language = p.language){
  setBusy(true);
  try{const {error}=await getClient().from("library_profiles").upsert({user_id:p.user,language,avatar:p.avatar});if(error)throw error;p.setLanguage(language);document.cookie="jarvis-language="+language+"; Path=/; Max-Age=31536000; SameSite=Lax";window.dispatchEvent(new Event("jarvis-profile-saved"));p.setNotice(labels[language][11]);}catch{p.setNotice("Could not save your profile.");}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-xl space-y-5 px-4 py-6 sm:px-6">
  <h1 className="text-3xl font-semibold">{t[6]}</h1>
  {p.user ? <section className="jarvis-panel">
    <fieldset disabled={busy} className="grid min-w-0 gap-5">
      <Avatar value={p.avatar}/>
      <label className="grid gap-2">
        {t[7]}
        <select value={p.language} onChange={event => void save(event.target.value as Language)}>
          {Object.entries({hy:"Հայերեն",en:"English",fr:"Français",ru:"Русский"}).map(([key,label]) =>
            <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="grid gap-2">
        <span className="text-sm font-medium">{t[8]}</span>
        <div className="flex flex-wrap gap-2">
          {avatars.map(value => <button key={value} type="button" aria-pressed={p.avatar === value}
            onClick={() => p.setAvatar(value)}
            className="size-11 rounded-xl border border-[var(--stroke)] bg-[var(--panel-raised)] aria-pressed:bg-[var(--highlight)] aria-pressed:ring-2 aria-pressed:ring-[var(--violet)]">
            {value}
          </button>)}
        </div>
      </div>
      <label className="grid min-w-0 gap-2">
        {t[9]}
        <input className="w-full min-w-0" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={event => void upload(event.target.files?.[0])}/>
      </label>
      <button type="button" className="inline-flex min-h-11 items-center justify-center self-start justify-self-start rounded-xl bg-[#5338b2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#49319e] disabled:opacity-50" onClick={() => void save()}>{t[10]}</button>
    </fieldset>
    {p.notice && <p role="status" className="mt-4 text-sm text-[var(--muted)]">{translate(p.notice)}</p>}
  </section> : <Link href="/account" className="ui-action-primary">{t[12]}</Link>}
  {p.user && <AccountActions language={p.language}/>}
 </main>;
}
