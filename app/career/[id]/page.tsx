import { notFound } from "next/navigation";
import { CareerPage } from "@/modules/career/page";
import { postings } from "@/modules/career/catalog";

export default async function CareerPosting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!postings.some((item) => item.id === id)) notFound();
  return <CareerPage initialJob={id} />;
}
