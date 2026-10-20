import type { Metadata } from "next";
import { Organogram } from "@/components/organogram";
export const metadata: Metadata = {
  title: "Organogram · Hunch",
  description: "Wie werkt waar, met wie en waaraan.",
};
export default function OrganogramPage() {
  return <Organogram />;
}
