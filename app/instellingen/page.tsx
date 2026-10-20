import {
  Check,
  ChevronDown,
  Cloud,
  Database,
  ExternalLink,
  Files,
  Info,
  Mail,
  MessagesSquare,
  Plug,
  Ticket,
} from "lucide-react";
import { aiConfiguration } from "@/lib/ai";
import { jevConfiguration } from "@/lib/jev";
import { GlyphTile, HunchIcon } from "@/components/hunch";
import styles from "./settings.module.css";

const workplaceIntegrations = [
  {
    id: "teams",
    name: "Microsoft Teams",
    provider: "Microsoft 365",
    category: "Conversations",
    icon: MessagesSquare,
    tone: "chats",
    description:
      "Keep questions, team conversations and shared expertise connected to the right Hunch.",
    sources: ["Channels", "Conversations", "Shared files"],
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    provider: "Microsoft 365",
    category: "Knowledge",
    icon: Files,
    tone: "docs",
    description:
      "Find trusted policies, payroll guidance and team knowledge in your document libraries.",
    sources: ["Sites", "Document libraries", "Version history"],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    provider: "Microsoft 365",
    category: "Files",
    icon: Cloud,
    tone: "docs",
    description:
      "Bring working documents and shared files into the context of a customer question.",
    sources: ["Documents", "Shared folders"],
  },
  {
    id: "outlook",
    name: "Outlook",
    provider: "Microsoft 365",
    category: "Email",
    icon: Mail,
    tone: "chats",
    description:
      "Keep customer emails, attachments and the conversation behind a question together.",
    sources: ["Email threads", "Attachments", "Shared mailboxes"],
  },
  {
    id: "myservicepoint",
    name: "MyServicePoint",
    provider: "SD Worx",
    category: "Ticketing",
    icon: Ticket,
    tone: "tickets",
    description:
      "Link SD Worx support tickets to relevant knowledge, earlier answers and the people who can help.",
    sources: ["Support tickets", "Case history", "Resolutions"],
  },
];

export const dynamic = "force-dynamic";
export default function SettingsPage() {
  const ai = aiConfiguration();
  const jev = jevConfiguration();
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Your tools, connected</div>
          <h1>Connections</h1>
          <p>
            Bring your conversations, documents and customer questions together.
          </p>
        </div>
      </div>
      <section aria-labelledby="workplace-integrations-title">
        <div className={styles.sectionHeading}>
          <h2 id="workplace-integrations-title">Workplace integrations</h2>
          <span className={styles.count}>
            {workplaceIntegrations.length} integrations
          </span>
        </div>
        <div className={styles.previewNote}>
          <Info size={18} aria-hidden="true" />
          <p>
            <strong>Integration preview.</strong> Live connections are not
            available yet. The Microsoft 365 examples in Hunch use demo data.
          </p>
        </div>
        <div className={styles.grid}>
          {workplaceIntegrations.map(
            ({
              id,
              name,
              provider,
              category,
              icon: Icon,
              tone,
              description,
              sources,
            }) => (
              <article
                key={id}
                className={`panel ${styles.card}`}
                aria-labelledby={`integration-${id}`}
              >
                <div className={styles.cardHeading}>
                  <span
                    className={`${styles.icon} ${styles[tone]}`}
                    aria-hidden="true"
                  >
                    <Icon size={25} />
                  </span>
                  <div>
                    <span className={styles.provider}>{provider}</span>
                    <h3 id={`integration-${id}`}>{name}</h3>
                  </div>
                </div>
                <p className={styles.description}>{description}</p>
                <ul className={styles.sources} aria-label="Planned sources">
                  {sources.map((source) => (
                    <li key={source}>{source}</li>
                  ))}
                </ul>
                <div className={styles.cardFooter}>
                  <span className={styles.connectionStatus}>
                    <Plug size={14} aria-hidden="true" />
                    Not connected
                  </span>
                  <span>{category}</span>
                </div>
              </article>
            ),
          )}
        </div>
      </section>
      <details className={styles.services}>
        <summary className={styles.servicesSummary}>
          <span className={styles.servicesIcon} aria-hidden="true">
            <HunchIcon name="summary" size={22} />
          </span>
          <span className={styles.servicesTitle}>
            <strong>What powers Hunch</strong>
            <span>AI, storage and background services</span>
          </span>
          <ChevronDown
            size={20}
            className={styles.chevron}
            aria-hidden="true"
          />
        </summary>
        <div className={styles.servicesContent}>
          <section className="panel integration-card">
            <div className="integration-icon" aria-hidden="true">
              <HunchIcon name="summary" size={28} />
            </div>
            <div className="integration-body">
              <div className="section-title-row">
                <h2>Gemini on Google Cloud</h2>
                <span
                  className={`status ${ai.configured ? "status-open" : "status-attention"}`}
                >
                  <span />
                  {ai.configured ? "Configured" : "Setup required"}
                </span>
              </div>
              <p>
                Assesses sources, drafts replies and checks that customer
                answers match the available knowledge.
              </p>
              {ai.configured ? (
                <div className="integration-facts">
                  <span>
                    Model<strong>{ai.model}</strong>
                  </span>
                  <span>
                    Region<strong>{process.env.GOOGLE_CLOUD_LOCATION}</strong>
                  </span>
                  <span>
                    Verification<strong>On the first AI request</strong>
                  </span>
                </div>
              ) : (
                <>
                  <div className="inline-info">
                    <Info size={17} />
                    Without a connection, no AI results are simulated. You can
                    still view tickets, write answers yourself and add
                    documents.
                  </div>
                  <h3>Local configuration</h3>
                  <p className="small-copy">
                    Set these missing fields in the local configuration file:
                  </p>
                  <div className="config-fields">
                    {ai.missing.map((key) => (
                      <code key={key}>{key}</code>
                    ))}
                  </div>
                  <p className="small-copy">
                    Use Application Default Credentials for your Google Cloud
                    account and enable the Vertex AI API. Then restart the app
                    and background worker. The README contains the full steps.
                  </p>
                </>
              )}
              <a
                className="text-button"
                href="https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart"
                target="_blank"
                rel="noreferrer"
              >
                Set up Vertex AI
                <ExternalLink size={14} />
              </a>
            </div>
          </section>
          <div className="settings-grid">
            <section className="panel compact-integration">
              <h2>Jev by TypeSafe</h2>
              <p>
                Assesses document relevance, source reliability and freshness
                for each customer question. Gemini provides the explanation.
              </p>
              <span className="subtle-label">
                {jev.configured
                  ? `Configured · ${jev.model}`
                  : "Setup required · JEV_KEY is missing"}
              </span>
              <p className="small-copy">
                The connection is checked during the first assessment.
              </p>
            </section>
            <section className="panel compact-integration">
              <span className="compact-icon" aria-hidden="true">
                <Database size={20} />
              </span>
              <h2>PostgreSQL & Drizzle</h2>
              <p>
                Tickets, documents, answer versions and review results are
                stored in PostgreSQL.
              </p>
              <span className="subtle-label">
                Status is shown when loading customer questions.
              </span>
            </section>
            <section className="panel compact-integration">
              <GlyphTile kind="chats" size={40} />
              <h2>Email in demo mode</h2>
              <p>
                Deliveries are recorded, including the recipient and answer. No
                real email is sent.
              </p>
              <span className="simulation-chip">
                <Check size={13} />
                Simulation active
              </span>
            </section>
            <section className="panel compact-integration">
              <span className="compact-icon" aria-hidden="true">
                <Cloud size={20} />
              </span>
              <h2>Background processing</h2>
              <p>
                {process.env.TASK_BACKEND === "cloud-tasks"
                  ? "Cloud Tasks handles processing through a secure Cloud Run handler."
                  : "A local background worker processes saved tasks. Start it alongside the app."}
              </p>
              <span className="mini-tag">
                {process.env.TASK_BACKEND === "cloud-tasks"
                  ? "Google Cloud Tasks"
                  : "Local worker"}
              </span>
            </section>
          </div>
        </div>
      </details>
    </div>
  );
}
