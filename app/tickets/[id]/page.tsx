import { HunchWorkspace } from "@/components/ticket-workspace";
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <HunchWorkspace id={(await params).id} />;
}
