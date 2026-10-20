import { HunchWorkspace } from "@/components/ticket-workspace";
export default async function HunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <HunchWorkspace id={(await params).id} />;
}
