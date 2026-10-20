import { Check, Cloud, Database, ExternalLink, Info } from "lucide-react";
import { aiConfiguration } from "@/lib/ai";
import { jevConfiguration } from "@/lib/jev";
import { GlyphTile, HunchIcon } from "@/components/hunch";
export const dynamic = "force-dynamic";
export default function SettingsPage() {
  const ai = aiConfiguration();
  const jev = jevConfiguration();
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">De motor achter Hunch</div>
          <h1>Verbindingen</h1>
          <p>
            Echte intelligentie. Transparante status. Jij houdt het overzicht.
          </p>
        </div>
      </div>
      <section className="panel integration-card">
        <div className="integration-icon" aria-hidden="true">
          <HunchIcon name="summary" size={28} />
        </div>
        <div className="integration-body">
          <div className="section-title-row">
            <h2>Gemini op Google Cloud</h2>
            <span
              className={`status ${ai.configured ? "status-open" : "status-attention"}`}
            >
              <span />
              {ai.configured ? "Geconfigureerd" : "Instellen vereist"}
            </span>
          </div>
          <p>
            Beoordeelt bronnen, schrijft conceptantwoorden en controleert of het
            klantantwoord klopt met de beschikbare kennis.
          </p>
          {ai.configured ? (
            <div className="integration-facts">
              <span>
                Model<strong>{ai.model}</strong>
              </span>
              <span>
                Regio<strong>{process.env.GOOGLE_CLOUD_LOCATION}</strong>
              </span>
              <span>
                Verificatie<strong>Bij de eerste AI-aanvraag</strong>
              </span>
            </div>
          ) : (
            <>
              <div className="inline-info">
                <Info size={17} />
                Zonder verbinding worden geen AI-resultaten nagebootst. Je kunt
                wel tickets bekijken, zelf antwoorden schrijven en documenten
                toevoegen.
              </div>
              <h3>Lokale configuratie</h3>
              <p className="small-copy">
                Stel deze ontbrekende velden in het lokale configuratiebestand
                in:
              </p>
              <div className="config-fields">
                {ai.missing.map((key) => (
                  <code key={key}>{key}</code>
                ))}
              </div>
              <p className="small-copy">
                Gebruik Application Default Credentials voor je Google
                Cloud-account en schakel de Vertex AI API in. Herstart daarna de
                app en achtergrondwerker. De README bevat de volledige stappen.
              </p>
            </>
          )}
          <a
            className="text-button"
            href="https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart"
            target="_blank"
            rel="noreferrer"
          >
            Vertex AI instellen
            <ExternalLink size={14} />
          </a>
        </div>
      </section>
      <div className="settings-grid">
        <section className="panel compact-integration">
          <h2>Jev van TypeSafe</h2>
          <p>Beoordeelt per klantvraag de relevantie, bronbetrouwbaarheid en actualiteit van documenten. Gemini verzorgt de toelichting.</p>
          <span className="subtle-label">
            {jev.configured ? `Geconfigureerd · ${jev.model}` : "Instellen vereist · JEV_KEY ontbreekt"}
          </span>
          <p className="small-copy">Verbinding wordt bij de eerste beoordeling gecontroleerd.</p>
        </section>
        <section className="panel compact-integration">
          <span className="compact-icon" aria-hidden="true">
            <Database size={20} />
          </span>
          <h2>PostgreSQL & Drizzle</h2>
          <p>
            Tickets, documenten, antwoordversies en reviewresultaten worden
            opgeslagen in PostgreSQL.
          </p>
          <span className="subtle-label">
            Status is zichtbaar bij het laden van klantvragen.
          </span>
        </section>
        <section className="panel compact-integration">
          <GlyphTile kind="chats" size={40} />
          <h2>E-mail in demomodus</h2>
          <p>
            Verzendingen worden geregistreerd, inclusief ontvanger en antwoord.
            Er wordt geen echte e-mail verstuurd.
          </p>
          <span className="simulation-chip">
            <Check size={13} />
            Simulatie actief
          </span>
        </section>
        <section className="panel compact-integration">
          <span className="compact-icon" aria-hidden="true">
            <Cloud size={20} />
          </span>
          <h2>Achtergrondverwerking</h2>
          <p>
            {process.env.TASK_BACKEND === "cloud-tasks"
              ? "Cloud Tasks verzorgt de verwerking via een beveiligde Cloud Run-handler."
              : "Een lokale achtergrondwerker verwerkt de opgeslagen taken. Start deze naast de app."}
          </p>
          <span className="mini-tag">
            {process.env.TASK_BACKEND === "cloud-tasks"
              ? "Google Cloud Tasks"
              : "Lokale worker"}
          </span>
        </section>
      </div>
    </div>
  );
}
