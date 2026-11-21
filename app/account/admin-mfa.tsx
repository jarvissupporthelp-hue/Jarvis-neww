"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getClient } from "@/lib/browser-supabase";
import type { Locale } from "@/lib/locales";

const messages = {
  en: ["Two-factor authentication", "Set up authenticator", "Scan this QR code with Google Authenticator, Apple Passwords, or another authenticator. On this device, you can enter the setup key manually.", "Setup key", "Six-digit code", "Verify and continue", "Setup failed. Please retry.", "The code could not be verified. Try the current code.", "Sign out", "Loading…", "Choose an authenticator"],
  hy: ["Երկգործոն նույնականացում", "Կարգավորել նույնականացման հավելվածը", "Սկանավորեք QR կոդը Google Authenticator, Apple Passwords կամ այլ հավելվածով։ Նույն սարքում կարող եք ձեռքով մուտքագրել բանալին։", "Կարգավորման բանալի", "Վեցանիշ կոդ", "Հաստատել և շարունակել", "Չհաջողվեց կարգավորել։ Փորձեք կրկին։", "Կոդը չհաստատվեց։ Մուտքագրեք ընթացիկ կոդը։", "Դուրս գալ", "Բեռնվում է…", "Ընտրեք նույնականացման հավելվածը"],
};

export function AdminMfa({ locale }: { locale: Locale }) {
  const t = messages[locale];
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string }[]>([]);
  const [factor, select] = useState("");
  const [setup, setSetup] = useState<{ qr_code: string; secret: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getClient().auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) { setError(t[6]); return; }
      setFactors(data.totp);
      select(data.totp[0]?.id ?? "");
      setReady(true);
    }).catch(() => { if (active) setError(t[6]); });
    return () => { active = false; };
  }, [t]);
  async function enroll() {
    setBusy(true); setError("");
    try {
      const { data, error } = await getClient().auth.mfa.enroll({ factorType: "totp", issuer: "JARVIS" });
      if (error) throw error;
      select(data.id); setSetup(data.totp);
    } catch { setError(t[6]); } finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError("");
    try {
      const { error } = await getClient().auth.mfa.challengeAndVerify({ factorId: factor, code });
      if (error) throw error;
      setSetup(undefined); location.reload();
    } catch { setError(t[7]); setCode(""); } finally { setBusy(false); }
  }
  return <section className="jarvis-panel mx-auto grid max-w-md gap-4">
    <h2 className="text-xl font-semibold">{t[0]}</h2>
    {setup && <><p>{t[2]}</p><Image unoptimized src={setup.qr_code} alt="QR" width={200} height={200} className="rounded-lg bg-white p-2"/>
      <details><summary>{t[3]}</summary><code className="break-all">{setup.secret}</code></details></>}
    {error && <p role="alert">{error}</p>}
    {!ready ? error ? <button onClick={() => location.reload()}>{t[1]}</button> : <p>{t[9]}</p> : !factor ?
      <button disabled={busy} className="ui-action-primary" onClick={enroll}>{t[1]}</button> :
      <form className="grid gap-3" onSubmit={e => { e.preventDefault(); void verify(); }}>
        {factors.length > 1 && <label>{t[10]}<select value={factor} onChange={e => select(e.target.value)}>
          {factors.map((f,i) => <option key={f.id} value={f.id}>{f.friendly_name || String(i+1)}</option>)}</select></label>}
        <label>{t[4]}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} className="block w-full rounded-lg border p-2"/></label>
        <button className="ui-action-primary" disabled={busy || code.length !== 6}>{t[5]}</button>
      </form>}
    <button disabled={busy} onClick={async () => { const {error} = await getClient().auth.signOut({scope:"local"}); if (!error) location.reload(); else setError(t[6]); }}>{t[8]}</button>
  </section>;
}
