"use client";

import Link from "next/link";
import { useSignedInRole } from "@/app/components/use-signed-in-role";

type Copy = { frame: string; checking: string; signInTitle: string; signInBody: string; signIn: string; back: string; backHome: string };

// The lab is only mounted for signed-in users of any role.
export function MathLabFrame({ labUrl, locale, copy }: { labUrl: string; locale: "hy" | "en"; copy: Copy }) {
  const state = useSignedInRole();
  if (state.status === "checking") return <p role="status" className="math-lab-gate">{copy.checking}</p>;
  if (state.status === "out") {
    return <div className="math-lab-gate" role="region" aria-live="polite">
      <h2>{copy.signInTitle}</h2>
      <p>{copy.signInBody}</p>
      <Link className="jarvis-primary-button inline-flex min-h-10 items-center px-4 py-2 no-underline" href={`/account?lang=${locale}`}>{copy.signIn}</Link>
    </div>;
  }
  return <>
    <div className="math-lab-frame-wrap">
      <iframe key={labUrl} className="math-lab-frame" title={copy.frame} src={labUrl} loading="eager" />
    </div>
    <p className="math-page-note"><Link href={state.role === "student" ? "/chat" : "/account"}>{state.role === "student" ? copy.back : copy.backHome}</Link></p>
  </>;
}
