import { AccountForm } from "./account-form";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="mb-6 text-4xl font-semibold">JARVIS account</h1>
      <AccountForm />
    </main>
  );
}
