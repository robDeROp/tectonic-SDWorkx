import { KnowledgeLandscape } from "@/components/knowledge/landscape";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const item = one(params.item);
  const topic = one(params.topic);
  return (
    <div className="kg-page">
      <div className="kg-page-head">
        <div>
          <div className="eyebrow">Find it. Understand it. Trust it.</div>
          <h1>Kennisbank</h1>
          <p>
            Alle documenten, gesprekken, hunches en klantvragen per onderwerp:
            welke bronnen dragen de kennis, en waar ontbreekt ze?
          </p>
        </div>
        <span className="kg-poc-chip">Fictieve demodata</span>
      </div>
      <KnowledgeLandscape
        key={JSON.stringify([item, topic])}
        start={{ item, topic }}
      />
    </div>
  );
}
