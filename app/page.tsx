import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl content-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#426852]">University workspace</p>
      <h1 className="text-6xl font-semibold tracking-tight sm:text-8xl">JARVIS</h1>
      <p className="mt-5 max-w-xl text-xl">Your courses, schedule, grades, and assignments in one place.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/academics" className="w-fit rounded-lg bg-[#1e3328] px-6 py-3 font-semibold text-white">Academics</Link>
        <Link href="/learning" className="w-fit rounded-lg bg-[#1e3328] px-6 py-3 font-semibold text-white">Learning</Link>
        <Link href="/campus" className="w-fit rounded-lg bg-[#1e3328] px-6 py-3 font-semibold text-white">Campus Resources</Link>
        <Link href="/career" className="w-fit rounded-lg bg-[#1e3328] px-6 py-3 font-semibold text-white">Career</Link>
      </div>
    </main>
  );
}
