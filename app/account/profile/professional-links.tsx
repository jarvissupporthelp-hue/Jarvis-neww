"use client";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getClient } from "@/lib/browser-supabase";
import { profileHandle, profileUrl, type Platform } from "@/lib/professional-links";
import { useInterfaceCopy } from "@/app/components/interface-language";

const platforms: Platform[] = ["linkedin", "github"];
const empty = { linkedin: "", github: "" };
export function ProfessionalLinks({ user }: { user: string }) {
  const t = useInterfaceCopy();
  const [saved, setSaved] = useState(empty);
  const [draft, setDraft] = useState(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getClient().from("professional_links").select("github,linkedin").eq("user_id",user).maybeSingle().then(({data,error}) => {
      if (!active) return;
      if (error) { setMessage("Could not load links."); return; }
      const values = {github:data?.github ?? "",linkedin:data?.linkedin ?? ""};
      setSaved(values); setDraft(values); setReady(true); setMessage("");
    });
    return () => { active = false; };
  }, [user,attempt]);
  async function save() {
    let values;
    try { values = { linkedin:profileHandle("linkedin",draft.linkedin), github:profileHandle("github",draft.github) }; }
    catch { setMessage("Enter a profile URL or username."); return; }
    setBusy(true);
    try {
      const {error} = await getClient().from("professional_links").upsert({user_id:user,...values});
      if (error) throw error;
      const next = {linkedin:values.linkedin ?? "", github:values.github ?? ""};
      setSaved(next); setDraft(next); setMessage("Saved");
    } catch { setMessage("Could not save your profile."); } finally { setBusy(false); }
  }
  return <section className="jarvis-panel space-y-4">
    <h2 className="text-lg font-semibold">{t("Professional links")}</h2>
    <form onSubmit={e => {e.preventDefault();void save();}}>
      <fieldset disabled={!ready || busy} className="grid gap-4">
        {platforms.map(platform => <div key={platform} className="grid gap-2">
          <div className="flex items-center justify-between"><label htmlFor={platform} className="font-semibold">{platform === "github" ? "GitHub" : "LinkedIn"}</label>
            {saved[platform] && <a className="inline-flex items-center gap-1 underline" href={profileUrl(platform,saved[platform])} target="_blank" rel="noopener noreferrer">{t("View profile")}<ExternalLink size={14}/></a>}</div>
          <input id={platform} className="w-full" maxLength={512} autoCapitalize="none" spellCheck={false}
            placeholder={platform === "github" ? "github.com/username" : "linkedin.com/in/username"}
            value={draft[platform]} onChange={e => {setDraft({...draft,[platform]:e.target.value});setMessage("");}}/>
        </div>)}
        <button className="ui-action-primary justify-self-start" disabled={saved.github===draft.github && saved.linkedin===draft.linkedin}>{t("Save")}</button>
      </fieldset>
    </form>
    {message && <p role="status">{t(message)} {!ready && <button className="underline" onClick={() => setAttempt(attempt+1)}>{t("Retry")}</button>}</p>}
  </section>;
}
