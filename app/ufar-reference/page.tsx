
import { ufarProfessors } from "@/lib/ufar-professors";
import sections from "../../data/ufar/reference.json";

export default function UfarReference() {
  return <main className="mx-auto max-w-3xl px-5 py-10">
    <h1 className="text-3xl font-bold">UFAR reference collection</h1>
    <p className="my-4">Compiled April 2026. Check the academic year and faculty listed in each section. For current decisions, consult the applicable university regulation.</p>
    <section className="border-t py-3" id="professors">
      <h2 className="text-xl font-semibold">IMA professors</h2>
      {ufarProfessors.map(professor => <article key={professor.name} className="mt-4">
        <h3 className="font-semibold">{professor.name}, {professor.degree}</h3>
        <p>{professor.role}</p>
        {professor.courses.length > 0 && <ul className="mt-2 list-disc pl-5">
          {professor.courses.map(({ year, subjects }) => <li key={year}>Year {year} · {subjects.join(", ")}</li>)}
        </ul>}
      </article>)}
    </section>
    {sections.map(section => <section key={section.id} className="border-t py-3" id={`section-${section.id}`}>
      <h2 className="font-semibold">{section.id}. {section.title}</h2>
      <div className="mt-3 whitespace-pre-wrap">{section.body}</div>
    </section>)}
  </main>;
}
