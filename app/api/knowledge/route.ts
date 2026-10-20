import { api } from "@/lib/http";
import { loadKnowledgeGraph } from "@/lib/knowledge-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** People, teams and every knowledge item with its links, for the kennisgraaf views. */
export const GET = () => api(() => loadKnowledgeGraph());
