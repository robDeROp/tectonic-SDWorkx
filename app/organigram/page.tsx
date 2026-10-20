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
          <div className="eyebrow">Who knows what?</div>
          <h1>Organisation chart</h1>
          <p>
            The organisation as Entra ID sees it, with the knowledge each team
            shares. Click a colleague to explore their expertise.
          </p>
        </div>
        <span className="kg-poc-chip">Fictional demo data</span>
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
