import { BookOpen, FileText, Info, ShieldCheck } from "lucide-react";
import { demoDocuments } from "@/lib/fixtures";
import { dateLabel } from "@/lib/client";
export default function KnowledgePage() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FIND IT. UNDERSTAND IT. TRUST IT.</div>
          <h1>Een gedeelde basis van kennis.</h1>
          <p>
            De drie bronnen achter de demonstratie over vertrekvakantiegeld.
          </p>
        </div>
        <span className="page-heading-icon">
          <BookOpen size={28} />
        </span>
      </div>
      <div className="connection-notice">
        <Info size={20} />
        <div>
          <strong>Fictieve bronnen, echte beoordelingen</strong>
          <p>
            Deze teksten zijn gemaakt voor de demo. Het zijn geen officiële SD
            Worx-documenten of juridische bronnen.
          </p>
        </div>
      </div>
      <div className="knowledge-grid">
        {demoDocuments.map((doc, i) => (
          <article className="panel knowledge-card" key={doc.key}>
            <div className="knowledge-top">
              <span
                className={`file-icon ${i === 0 ? "file-blue" : i === 1 ? "file-violet" : "file-amber"}`}
              >
                <FileText size={25} />
              </span>
              <span className="mini-tag">{doc.kind}</span>
            </div>
            <h2>{doc.name}</h2>
            <div className="knowledge-date">
              Bijgewerkt op {dateLabel(doc.date)}
            </div>
            <p>{doc.content}</p>
            <div className="knowledge-foot">
              <ShieldCheck size={15} />
              De beoordeling hangt af van de klantvraag.
            </div>
          </article>
        ))}
      </div>
      <div className="inline-info">
        <Info size={17} />
        Extra uploads worden aan het betreffende ticket gekoppeld. Scores
        verschijnen in het ticket zodra Gemini de bronnen heeft beoordeeld.
      </div>
    </div>
  );
}
