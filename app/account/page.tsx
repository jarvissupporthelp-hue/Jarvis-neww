import { AccountForm } from "./account-form";

export default function AccountPage() {
  return (
    <main className="w-full">
      <div className="mb-7">
        <span className="jarvis-eyebrow">YOUR ACADEMIC HUB</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your workspace</h1>
        <p className="mt-2 text-sm" style={{color:"var(--muted)"}}>Sign in to access your academic tools, or manage your university workspace.</p>
      </div>
      <AccountForm />
    </main>
  );
}
