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
          <h1>Knowledge base</h1>
          <p>
            All documents, conversations, hunches and customer questions by
            topic: which sources hold the knowledge, and where are the gaps?
          </p>
        </div>
        <span className="kg-poc-chip">Fictional demo data</span>
      </div>
      <KnowledgeLandscape
        key={JSON.stringify([item, topic])}
        start={{ item, topic }}
      />
    </div>
  );
}
