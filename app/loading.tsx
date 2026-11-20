import { UiText } from "./components/interface-language";

export default function Loading() {
  return (
    <div role="status" className="mx-auto flex max-w-6xl items-center gap-3 py-6 text-sm text-[var(--muted)]">
      <span aria-hidden="true" className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
      <UiText value="Loading…" />
    </div>
  );
}
