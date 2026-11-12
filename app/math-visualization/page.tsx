import { redirect } from "next/navigation";
import { mathTopics } from "@/lib/math-visualizations";

export default async function LegacyMathVisualizationPage({ searchParams }: PageProps<"/math-visualization">) {
  const query = await searchParams;
  const language = query.lang === "en" ? "en" : "hy";
  const topic = mathTopics.find((entry) => entry.id === query.module);
  redirect("/chat/math-visualization?lang=" + language + (topic ? "&module=" + topic.id : ""));
}
