"use client";
import {useInterfaceCopy} from "@/app/components/interface-language";
import {ProfessionalLinks} from "./professional-links";
import Link from "next/link";
import {useState,useEffect} from "react";
import {getClient} from "@/lib/browser-supabase";
import {AvatarPicker} from "./avatar-picker";
import {labels,useLibrary,type Language} from "@/modules/campus/library-personal";
export default function Profile(){
 const translate=useInterfaceCopy();
 const p=useLibrary("en",false), t=labels[p.language];
 const [name,setName]=useState("");
 useEffect(() => {let active=true; if(p.user) getClient().from("profiles").select("display_name").eq("id",p.user).maybeSingle().then(({data})=>{if(active)setName(data?.display_name ?? "");}); return ()=>{active=false;};},[p.user]);
 const [busy,setBusy]=useState(false);
 async function save(language: Language, avatar: string) {
  setBusy(true);
  try {
   const {error} = await getClient().from("library_profiles").upsert({user_id:p.user,language,avatar});
   if (error) throw error;
   p.setLanguage(language);
   p.setAvatar(avatar);
   document.cookie = "jarvis-language=" + language + "; Path=/; Max-Age=31536000; SameSite=Lax";
   window.dispatchEvent(new Event("jarvis-profile-saved"));
   p.setNotice(labels[language][11]);
   return true;
  } catch {
   p.setNotice("Could not save your profile.");
   return false;
  } finally {
   setBusy(false);
  }
 }
 return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">{t[6]}</h1>{p.user && <Link className="ui-action-secondary" href="/account/settings">{translate("Account settings")}</Link>}</header>
  {p.user ? <section className="jarvis-panel">
    <div className="grid min-w-0 gap-5">
      {name && <h2 className="text-2xl font-semibold">{name}</h2>}
      <AvatarPicker avatar={p.avatar} language={p.language} onSave={avatar => save(p.language, avatar)}/>
      <label className="grid gap-2">
        {t[7]}
        <select disabled={busy} value={p.language} onChange={event => void save(event.target.value as Language, p.avatar)}>
          {Object.entries({hy:"Հայերեն",en:"English",fr:"Français",ru:"Русский"}).map(([key,label]) =>
            <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
    </div>
    {p.notice && <p role="status" className="mt-4 text-sm text-[var(--muted)]">{translate(p.notice)}</p>}
  </section> : <Link href="/account" className="ui-action-primary">{t[12]}</Link>}
  {p.user && <ProfessionalLinks key={p.user} user={p.user}/>}
 </main>;
}
