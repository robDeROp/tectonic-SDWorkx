import { TicketWorkspace } from "@/components/ticket-workspace";
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TicketWorkspace id={(await params).id} />;
}
