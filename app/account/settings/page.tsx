"use client";
import Link from "next/link";
import { AccountActions } from "../profile/account-actions";
import { labels, useLibrary } from "@/modules/campus/library-personal";
import { UiText } from "@/app/components/interface-language";
export default function Settings() {
  const profile = useLibrary("en", false);
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold"><UiText value="Account settings"/></h1>
      {profile.user && <Link className="ui-action-secondary" href="/account/profile">{labels[profile.language][6]}</Link>}
    </header>
    {profile.user ? <AccountActions language={profile.language}/> : <Link className="ui-action-primary" href="/account">{labels[profile.language][12]}</Link>}
  </main>;
}
