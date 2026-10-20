import { KnowledgeOrgChart } from "@/components/knowledge/org-chart";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function OrgChartPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const person = one(params.person);
  const unit = one(params.unit);
  return (
    <div className="kg-page">
      <div className="kg-page-head">
        <div>
          <div className="eyebrow">Wie weet wat?</div>
          <h1>Organigram</h1>
          <p>
            De organisatie zoals Entra ID ze kent, met per team de kennis die
            het deelt. Klik op een collega om te zien waar die kennis zit.
          </p>
        </div>
        <span className="kg-poc-chip">Fictieve demodata</span>
      </div>
      <KnowledgeOrgChart
        key={JSON.stringify([person, unit])}
        start={
          person
            ? { kind: "person", id: person }
            : unit
              ? { kind: "unit", id: unit }
              : null
        }
      />
    </div>
  );
}
