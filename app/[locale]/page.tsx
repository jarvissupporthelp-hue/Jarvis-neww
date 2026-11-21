import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import Home from "../page";

export default async function LocalizedHome({ params }: PageProps<"/[locale]">) {
  if (!isLocale((await params).locale)) notFound();
  return <Home/>;
}
