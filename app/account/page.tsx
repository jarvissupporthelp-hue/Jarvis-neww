import { AccountForm } from "./account-form";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-6 text-4xl font-semibold">JARVIS account</h1>
      <AccountForm />
    </main>
  );
}
