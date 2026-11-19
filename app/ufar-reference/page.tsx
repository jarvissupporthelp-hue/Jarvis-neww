import sections from "../../data/ufar/reference.json";

export default function UfarReference() {
  return <main className="mx-auto max-w-3xl px-5 py-10">
    <h1 className="text-3xl font-bold">UFAR reference collection</h1>
    <p className="my-4">Compiled April 2026. Check the academic year and faculty listed in each section. For current decisions, consult the applicable university regulation.</p>
    {sections.map(section => <section key={section.id} className="border-t py-3" id={`section-${section.id}`}>
      <h2 className="font-semibold">{section.id}. {section.title}</h2>
      <div className="mt-3 whitespace-pre-wrap">{section.body}</div>
    </section>)}
  </main>;
}
