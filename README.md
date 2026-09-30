# Clarity · SD Worx ticketdemo

Een Nederlandstalige proof of concept rond **Find it. Understand it. Trust it.** De medewerker ziet niet alleen een antwoord, maar ook de bronnen, hun betrouwbaarheid, de onzekerheden en de uitkomst van een controle vóór verzending.

## Wat werkt

- Ticketoverzicht met zoeken, filters, statussen en nieuwe klantvragen.
- Eén startticket: Belgisch vertrekvakantiegeld voor een bediende.
- Automatisch onderzoek met drie fictieve documenten, zichtbare voortgang en persistente tijdlijn.
- Echte Gemini/Vertex AI-integratie voor documentbeoordeling, concepten en antwoordreviews.
- Documentkaarten met percentages, bron, actualiteit, toepasselijkheid en conflicten; volledige brontekst is inspecteerbaar.
- Upload van PDF met tekst, UTF-8 TXT en DOCX; 10 MB per bestand, 100.000 tekens per document, 15 documenten / 300.000 tekens per ticket.
- Handmatige antwoorden, versieopslag, positieve reviews, expliciete override van negatieve inhoudelijke reviews en gesimuleerde verzending.
- PostgreSQL via Drizzle, lokale worker, cloudadapter voor Cloud Tasks, lokale bestandsopslag en Cloud Storage-adapter.

**E-mail wordt nooit echt verstuurd.** De drie startdocumenten zijn nadrukkelijk fictief. De AI beoordeelt de interne consistentie van de demo en kan geen juridische juistheid certificeren. Een lege Gemini-configuratie geeft een duidelijke melding en nooit nepresultaten.

## Ticketconversatie

De klantmail staat bovenaan. Agentacties, interne notities, de collega-mail, antwoordreviews en gesimuleerde verzendingen verschijnen chronologisch. Documenten staan rechts; op een klein scherm onder de conversatie. Open een document voor broninhoud, score en redenen.

Via **Meer ticketacties (•••) → Demo: collega-mail ontvangen** verschijnt eerst een voorbeeld. **Mail & bijlage toevoegen** slaat de fictieve mail en het extra document eenmalig op en start een volledige herbeoordeling. Interne notities worden als aanvullende, ongeverifieerde context meegenomen in concepten en antwoordreviews. Ze veranderen geen bronbewijs, maar maken een eerdere antwoordreview ongeldig.

**Antwoord controleren** voert alleen de review uit. Na goedkeuring wordt **Definitief verzenden** beschikbaar. Bij inhoudelijke bezwaren vraagt **Toch verzenden** een expliciete bevestiging. Beide acties simuleren verzending; geen mail verlaat de app. Gewijzigde documenten, berichten of antwoorden blokkeren verzending op basis van oude reviews.

## Lokaal starten

Vereist: Node.js 22.17 of nieuwer, npm en PostgreSQL. Docker is de normale databaseroute; er is ook een optionele lokale PostgreSQL-helper voor machines zonder Docker.

```sh
npm ci
cp .env.example .env
# Optie A: PostgreSQL met Docker
docker compose up -d
# Optie B: zonder Docker, in een aparte terminal
npm run db:local
```

Kies één databaseoptie. Beide gebruiken poort **54329** en de lokale demo-inlog uit `.env.example`. De helper downloadt een platformafhankelijke PostgreSQL-binary via npm; laat de terminal open. De database staat in `.data/postgres`. Op sommige installaties moet je de optionele dependencies inschakelen (`npm ci --include=optional`). De Docker-route gebruikt PostgreSQL 16; de optionele helper levert PostgreSQL 18.

Daarna:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Start in een tweede terminal de achtergrondwerker:

```sh
npm run worker
```

Open **http://127.0.0.1:3000**. Klik op het startticket. De drie demodocumenten worden opgehaald. Zonder Gemini-configuratie stopt de flow bij beoordeling en verschijnt een bruikbare configuratiemelding. Handmatige antwoorden en uploads blijven beschikbaar. Een herlaadactie maakt geen nieuwe taak aan.

`db:seed` is herhaalbaar en overschrijft geen ticket. **Demo herhalen** reset uitsluitend het oorspronkelijke demoticket, verwijdert de daarbij horende uploads/concepten/reviews en start een nieuwe generatie. Zelf aangemaakte tickets blijven behouden.

## Gemini werkelijk verbinden

1. Kies een Google Cloud-project met billing en schakel `aiplatform.googleapis.com` in.
2. Geef het lokale account de benodigde Vertex AI-rechten (`roles/aiplatform.user`).
3. Meld lokaal aan met Application Default Credentials:

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

4. Vul in `.env` de volgende waarden in:

```dotenv
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=europe-west1
GEMINI_MODEL=YOUR_ENABLED_GEMINI_MODEL_ID
```

Kies een beschikbaar Gemini-model dat gestructureerde JSON-uitvoer ondersteunt en beschikbaar is in de gekozen regio. Er staat bewust geen veronderstelde modelnaam in de configuratie. Model en locatie moeten samen kloppen.

5. Herstart app én worker en kies **Opnieuw proberen** in het ticket.

Een geconfigureerde verbinding is nog geen geslaagde verbindingstest. Verifieer met een echte documentbeoordeling en daarna een concept + antwoordreview. De server gebruikt `@google/genai` met `vertexai: true`. Er gaat geen sleutel naar de browser. In Cloud Run gebruikt de SDK de identiteit van het serviceaccount.

Officiële documentatie: [Vertex AI quickstart](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart), [Google Gen AI SDK](https://googleapis.github.io/js-genai/).

## Flow en API

Routes zijn interne app-interfaces zonder gebruikersbeheer. De cloudomgeving blijft daarom standaard achter Cloud Run IAM; gebruik de lokale app niet als openbare productieomgeving.

| Route                                   | Functie                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/tickets`                      | Ticketoverzicht; maakt het startticket indien nodig aan                                  |
| `POST /api/tickets`                     | Klant, organisatie, e-mail, onderwerp en vraag opslaan + onderzoek starten               |
| `GET /api/tickets/:id`                  | Ticket, bronnen, taken, tijdlijn, verzendingen en AI-configuratiestatus                  |
| `POST /api/tickets/:id/start`           | Een nog niet gestart ticket idempotent starten                                           |
| `POST /api/tickets/:id/upload`          | Multipart: `file`, `kind`, optionele ISO-datum `date`                                    |
| `POST /api/tickets/:id/answer`          | `{ answer, version }`; opslaan met verwachte antwoordversie                              |
| `POST /api/tickets/:id/draft`           | `{ version }`; een AI-concept aanvragen                                                  |
| `POST /api/tickets/:id/review`          | `{ version }`; review uitvoeren, zonder verzending                                       |
| `POST /api/tickets/:id/send`            | `{ reviewId }`; een actueel goedgekeurd antwoord definitief verzenden (simulatie)        |
| `POST /api/tickets/:id/message`         | `{ content, messageId }`; interne notitie met idempotente UUID                           |
| `POST /api/tickets/:id/colleague-email` | Fictieve collega-mail + bijlage eenmalig ontvangen; volledige bronset opnieuw beoordelen |
| `POST /api/tickets/:id/override`        | `{ reviewId }`; een actuele negatieve review bewust overrulen                            |
| `POST /api/tickets/:id/retry`           | Mislukte taak opnieuw aanvragen of niet-geplande taak opnieuw dispatchen                 |
| `POST /api/tickets/:id/reset`           | Uitsluitend het oorspronkelijke demoticket resetten                                      |
| `POST /api/internal/tasks`              | Alleen in cloudmodus; geverifieerd Google OIDC-token en exact toegestaan serviceaccount  |

De documentenset, conversieversie, antwoordversie en demogeneratie vormen samen de geldigheid van een review. Wijzigingen maken lopende resultaten ongeldig. Gemini draait buiten databasetransacties; vóór het opslaan/verzenden worden versies opnieuw gecontroleerd onder een ticketlock. De editor is tijdens conceptgeneratie en antwoordreview tijdelijk vergrendeld. Losse API-wijzigingen en wijzigingen vanuit een andere sessie worden door de server afgevangen.

Iedere taak heeft een lease met heartbeat. Een verlopen lease kan opnieuw worden opgepakt. Cloud Tasks kan een aanvraag herhalen; claims, versiecontroles en een unieke verzending per review voorkomen dubbele uitvoeringseffecten. Als het inplannen mislukt, blijft de taak opgeslagen en toont de app een herprobeeractie. Bij een procescrash tussen databasecommit en Cloud Tasks-dispatch kan een taak blijven wachten; kies dan **Opnieuw proberen**. De POC heeft geen afzonderlijke automatische outbox-reconciler.

AI-uitvoer wordt met Zod gevalideerd. Beoordelingen moeten precies één resultaat per bron bevatten. Bronverwijzingen moeten naar bestaande documenten en exacte bronpassages wijzen. Reviewpassages moeten werkelijk in het antwoord staan. Een positieve review moet bewijs bevatten en mag geen waarschuwingen of fouten bevatten. Broninhoud wordt als onbetrouwbare data aangeboden, nooit als systeeminstructie. Dit is een inhoudelijke consistentiecontrole, geen bewijs van juridische waarheid.

Tabellen: `tickets`, `documents`, `answer_versions`, `jobs` (inclusief invoersnapshot en resultaat), `events`, `messages`, `deliveries`. De UI toont actuele reviews; eerdere versies blijven voor traceerbaarheid opgeslagen. Een reset verwijdert de historie van het oorspronkelijke demoticket bewust.

## Google Cloud voorbereiden

De cloudbestanden worden meegeleverd; er worden bij lokaal gebruik geen cloudresources gemaakt.

- `Dockerfile`: `runner` voor de app, `tools` voor migraties en seeding.
- `infra/cloudbuild.yaml`: bouwt beide images in Artifact Registry.
- `infra/main.tf`: Cloud Run, Cloud SQL PostgreSQL 16, Cloud Tasks, private Cloud Storage, Secret Manager en serviceaccounts/IAM.
- `infra/terraform.tfvars.example`: voorbeeldwaarden.

Voor een latere uitrol met de vereiste projectrechten:

```sh
gcloud config set project YOUR_PROJECT_ID
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com
gcloud artifacts repositories create clarity --repository-format=docker --location=europe-west1
gcloud builds submit --config=infra/cloudbuild.yaml --substitutions=_REGION=europe-west1,_TAG=v1
cp infra/terraform.tfvars.example infra/terraform.tfvars
# Vul project, model, image-URL's en toegestane demo-bezoekers in.
terraform -chdir=infra init
terraform -chdir=infra plan
terraform -chdir=infra apply
gcloud run jobs execute clarity-migrate --region=europe-west1 --wait
# Open de private service via een lokale, geauthenticeerde proxy:
gcloud run services proxy clarity --region=europe-west1 --port=8080
```

Open daarna `http://localhost:8080`. De aangemelde gebruiker moet in `viewer_members` staan. Geen `allUsers`-binding: de app heeft bewust geen eigen login of rollen. De Cloud Tasks-handler controleert bovendien het Google-token en het exacte task-serviceaccount. Zet `APP_URL` op de echte Cloud Run-origin; Terraform gebruikt de deterministische service-URL. De demo gebruikt een gedeelde medewerkeridentiteit.

Cloud SQL is bereikbaar via de Cloud Run Unix-socket, niet via open authorized networks. `DATABASE_URL` staat in Secret Manager. De Terraform-state bevat wel het gegenereerde databasewachtwoord; bewaar state beveiligd, bijvoorbeeld in een private remote backend. De Cloud SQL-instance heeft verwijderbeveiliging. Opslag, SQL en modelgebruik kunnen kosten veroorzaken; uitrol gebeurt niet automatisch.

In cloudmodus moet geen lokale worker draaien. Cloud Tasks roept de app aan met een maximale verwerkingstijd van 300 seconden. Bestanden staan in de private bucket. Logs bevatten taak-ID en foutsoort, geen klantinhoud. De Terraform-configuratie is lokaal syntactisch en tegen de providers gevalideerd. De daadwerkelijke uitrol moet nog in het doelproject worden getest; regionale modelbeschikbaarheid en IAM kunnen per project verschillen.

## Verificatie

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
```

De integratietest vereist de lokale PostgreSQL-database en `TASK_BACKEND=local`. Stop de normale worker tijdens deze test: de test voert zijn eigen taken uit met expliciet geïnjecteerde mock-AI. De test maakt tijdelijke tickets aan en ruimt alleen die eigen tickets op. Er is geen app-configuratie om live AI stilletjes te vervangen door mocks.

De tests controleren tekstextractie (PDF/TXT/DOCX), limieten, schema's, citaten, brondekking, versiecontroles, start-idempotentie, concurrente taakclaims, positieve review, negatieve review + override, wijzigingen tijdens de review, herbeoordeling na upload, technische fouten, opnieuw proberen en leaseherstel.

De productiebuild en automatische tests bewijzen niet dat het doelproject toegang heeft tot Gemini. Daarvoor blijft een echte Vertex AI-aanvraag nodig. Docker- en Terraform-uitrol moeten ook nog in de doelomgeving worden uitgevoerd.

# tectonic-SDWorkx
