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

`db:seed` is herhaalbaar en overschrijft geen ticket. **Demo herhalen** reset uitsluitend het oorspronkelijke demoticket, verwijdert de daarbij horende uploads/berichten/concepten/reviews en start een nieuwe generatie. Zelf aangemaakte tickets blijven behouden.

## Gemini werkelijk verbinden

### Documentbeoordeling met Jev + Gemini

Vul `JEV_KEY` in `.env` met je TypeSafe API-key. `JEV_MODEL` is optioneel en staat standaard op `jev-1.13.0`. De server gebruikt de [officiële TypeSafe API](https://docs.typesafe.ai/api) om ieder document afzonderlijk te beoordelen tegen de klantvraag: relevantie, bronbetrouwbaarheid en actualiteit. Vier beschrijvende niveaus worden omgerekend van 0–3 naar 0–100; modelzekerheid blijft een aparte waarde. Bij ontbrekende of ongeldige brondatum is actualiteit onbekend. De hoofdscore is relevantie, geen percentage bewezen juistheid.

Gemini ontvangt deze scores samen met de oorspronkelijke documenten, licht ze toe en zoekt onderlinge conflicten. De originele Jev-scores, modelversie en beoordelingstijd worden opgeslagen bij het document. Actuele beoordelingen gaan ook mee naar concepten en antwoordreviews. Bestaande beoordelingen zonder Jev blijven leesbaar; voer documentonderzoek opnieuw uit om Jev-scores te krijgen. Een fout bij Jev of Gemini laat de taak mislukken met een herhaalbare foutmelding; er is geen stille terugval naar verzonnen scores.

Sla de key op in Google Cloud Secret Manager vóór een infrastructuurdeploy:

```bash
node scripts/sync-jev-secret.mjs YOUR_PROJECT_ID
```

Het script leest uitsluitend `JEV_KEY` uit `.env`, verstuurt de waarde via standaardinvoer, controleert de opgeslagen waarde zonder deze te tonen en maakt alleen bij een gewijzigde key een nieuwe versie aan. De secret heet `clarity-jev-key`. Terraform kent de applicatie leestoegang toe en koppelt deze aan `JEV_KEY` in Cloud Run; de key staat niet in Terraform-state. Het bootstrapscript voert de synchronisatie automatisch uit. Na keyrotatie moet de Cloud Run-app een nieuwe revisie krijgen om de nieuwe omgevingsvariabele in te laden.

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

De documentenset, conversatieversie, antwoordversie en demogeneratie vormen samen de geldigheid van een review. Wijzigingen maken lopende resultaten ongeldig. Gemini draait buiten databasetransacties; vóór het opslaan/verzenden worden versies opnieuw gecontroleerd onder een ticketlock. De editor is tijdens conceptgeneratie en antwoordreview tijdelijk vergrendeld. Losse API-wijzigingen en wijzigingen vanuit een andere sessie worden door de server afgevangen.

Iedere taak heeft een lease met heartbeat. Een verlopen lease kan opnieuw worden opgepakt. Cloud Tasks kan een aanvraag herhalen; claims, versiecontroles en een unieke verzending per review voorkomen dubbele uitvoeringseffecten. Als het inplannen mislukt, blijft de taak opgeslagen en toont de app een herprobeeractie. Bij een procescrash tussen databasecommit en Cloud Tasks-dispatch kan een taak blijven wachten; kies dan **Opnieuw proberen**. De POC heeft geen afzonderlijke automatische outbox-reconciler.

AI-uitvoer wordt met Zod gevalideerd. Beoordelingen moeten precies één resultaat per bron bevatten. Bronverwijzingen moeten naar bestaande documenten en exacte bronpassages wijzen. Reviewpassages moeten werkelijk in het antwoord staan. Een positieve review moet bewijs bevatten en mag geen waarschuwingen of fouten bevatten. Broninhoud wordt als onbetrouwbare data aangeboden, nooit als systeeminstructie. Dit is een inhoudelijke consistentiecontrole, geen bewijs van juridische waarheid.

Tabellen: `tickets`, `documents`, `answer_versions`, `jobs` (inclusief invoersnapshot en resultaat), `events`, `messages`, `deliveries`. De UI toont actuele reviews; eerdere versies blijven voor traceerbaarheid opgeslagen. Een reset verwijdert de historie van het oorspronkelijke demoticket bewust.

## Google Cloud en GitHub CI/CD

De repository bevat een volledige uitrolconfiguratie. De daadwerkelijke Google Cloud-resources ontstaan pas wanneer de bootstrap succesvol is uitgevoerd met toegang tot het gekozen project.

- `infra/bootstrap`: Artifact Registry, Cloud Build-serviceaccount, private buildopslag en GitHub Workload Identity Federation.
- `infra/main.tf` en `infra/cicd.tf`: private Cloud Run-app, migratiejob, PostgreSQL 16 met backups/herstelpuntlog en verwijderbeveiliging, Cloud Tasks, private documentopslag, Secret Manager en IAM.
- `scripts/bootstrap-cloud.sh`: maakt de private statebucket met versiehistorie, past beide Terraform-configuraties toe, bouwt de eerste images, voert migraties uit en configureert GitHub-variabelen.
- `.github/workflows/ci-cd.yml`: typecontrole, unit-tests, PostgreSQL-integratietests, productiebuild, healthcheck, Terraform-validatie en tests van de uitrolprocedure.
- `scripts/deploy.sh`: bouwimages op digest, eerst migreren, dan een kandidaatversie zonder verkeer controleren en pas daarna activeren. Bij een fout na activering schakelt het script terug naar de vorige appversie.

### Eerste installatie

Vereist: een bestaand Google Cloud-project met billing, een account dat de genoemde resources en IAM mag beheren, schrijfrechten op de GitHub-repository, Google Cloud CLI, GitHub CLI, Terraform 1.9.8 en Python 3. De standaardregio is België (`europe-west1`). Selecteer een Gemini-model dat in dit project en deze regio beschikbaar is.

```sh
gcloud auth login
gh auth login
GCP_PROJECT_ID=YOUR_PROJECT_ID \
GEMINI_MODEL=YOUR_ENABLED_GEMINI_MODEL_ID \
bash scripts/bootstrap-cloud.sh
```

Optioneel: `GEMINI_LOCATION` (AI-endpoint, standaard dezelfde regio; gebruik `global` als het gekozen model dat vereist), `GCP_REGION`, `GITHUB_REPOSITORY` (standaard `robDeROp/tectonic-SDWorkx`), `VIEWER_MEMBER` (standaard de aangemelde Google-gebruiker) en `TERRAFORM` (pad naar het programma). Het script gebruikt expliciete projectparameters; het verandert je standaardproject niet. Bestaande resources buiten deze Terraform-states moet je eerst importeren als hun naam overeenkomt.

De state staat in `gs://PROJECT_ID-clarity-tfstate`, onder afzonderlijke prefixes voor bootstrap en app. Beperk toegang tot deze bucket: de state bevat het databasewachtwoord. Lokale variabelen en planbestanden zijn uitgesloten van Git, Docker en Cloud Build. Het script bewaart niet-geheime appinvoer in het genegeerde `infra/terraform.tfvars` voor latere infrastructuurwijzigingen.

### Automatische releases

Pull requests draaien de controles. Een push naar `main` draait dezelfde controles en rolt daarna uit als de repositoryvariabele `CLOUD_DEPLOY_ENABLED=true` is. De bootstrap zet deze variabele pas na een geslaagde eerste uitrol. Handmatig opnieuw uitvoeren kan via **Actions → CI / CD → Run workflow** op `main`.

De bootstrap zet ook `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_DEPLOY_SERVICE_ACCOUNT` en `GCP_WORKLOAD_IDENTITY_PROVIDER`. Dit zijn configuratiewaarden, geen geheimen. GitHub krijgt kortlevende Google-credentials via OIDC, beperkt tot het numerieke repository- en eigenaar-ID, `main` en deze specifieke workflow. Google-serviceaccountsleutels worden niet opgeslagen. GitHub Actions zijn vastgezet op commit-ID's.

Applicatie-releases kunnen Cloud Run bijwerken en images publiceren. Ze hebben geen Terraform-state- of infrastructuurbeheerrechten. Infrastructuurwijzigingen worden in CI gevalideerd en door een bevoegde beheerder met Terraform gepland/toegepast. Terraform negeert de door CI beheerde image, revisie en verkeersverdeling, zodat een infrastructuurwijziging geen oude app terugzet.

Databasewijzigingen moeten achterwaarts compatibel zijn: de vorige app blijft draaien tijdens migratie en kan bij een mislukte release terugkomen. Automatisch herstel zet alleen appverkeer terug, nooit de database. Verwijder pas later oude kolommen. De healthcheck controleert databasebereikbaarheid en het gemigreerde ticketschema; een echte Gemini-beoordeling blijft nodig om modeltoegang te bewijzen.

### Werkelijke GCP-validatie

```sh
python3 scripts/validate-cloud.py --project=YOUR_PROJECT_ID --region=europe-west1
```

Deze controle gebruikt echte Cloud Run-, Cloud Tasks-, Cloud Storage-, PostgreSQL- en Gemini-verbindingen. Er wordt één duidelijk gemarkeerd fictief validatieticket met een TXT-upload gemaakt; bestaande tickets blijven behouden. Het rapport staat in `.data/cloud-validation.json`. Een geblokkeerde AI-aanvraag wordt als mislukte controle gerapporteerd, nooit vervangen door een mock. Het script controleert ook dat anonieme bezoekers en een menselijke identiteit geen toegang tot de taakverwerker krijgen.

### App openen en herstel

Cloud Run vereist IAM-authenticatie. Gebruik voor de demo de lokale proxy:

```sh
gcloud run services proxy clarity --project=YOUR_PROJECT_ID --region=europe-west1 --port=8080
```

Open `http://localhost:8080`. Alleen opgegeven `viewer_members` en de benodigde serviceaccounts mogen de app aanroepen. Uploads staan in de private bucket; Cloud Tasks vervangt de lokale worker. Cloud SQL wordt via de Cloud Run Unix-socket verbonden, zonder open authorized networks. De maximale schaal is drie appinstanties.

Een eerdere revisie herstellen:

```sh
gcloud run revisions list --service=clarity --project=YOUR_PROJECT_ID --region=europe-west1
gcloud run services update-traffic clarity --to-revisions=PREVIOUS_REVISION=100 --project=YOUR_PROJECT_ID --region=europe-west1
```

Cloud SQL, opslag en modelgebruik veroorzaken kosten. De configuratie gebruikt een kleine zonale database voor de demo, geen hoogbeschikbare productieomgeving. De bestaande gedeelde demo-identiteit en gesimuleerde verzending blijven behouden.

Ontwerpbronnen: [Google GitHub OIDC-authenticatie](https://github.com/google-github-actions/auth), [Cloud Run-authenticatie en revisie-audiences](https://docs.cloud.google.com/run/docs/authenticating/service-to-service), [Terraform GCS-backend](https://developer.hashicorp.com/terraform/language/backend/gcs).

## Verificatie

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
```

De integratietest vereist de lokale PostgreSQL-database en `TASK_BACKEND=local`. Stop de normale worker tijdens deze test: de test voert zijn eigen taken uit met expliciet geïnjecteerde mock-AI. De test maakt tijdelijke tickets aan en ruimt alleen die eigen tickets op. Er is geen app-configuratie om live AI stilletjes te vervangen door mocks.

De tests controleren tekstextractie (PDF/TXT/DOCX), limieten, schema's, citaten, brondekking, versiecontroles, start-idempotentie, concurrente taakclaims, positieve review, negatieve review + override, wijzigingen tijdens de review, herbeoordeling na upload, technische fouten, opnieuw proberen en leaseherstel.

De productiebuild en automatische tests bewijzen niet dat het doelproject toegang heeft tot Gemini. Daarvoor blijft een echte Vertex AI-aanvraag nodig. Een succesvolle lokale controle bewijst nog geen geslaagde cloudrelease; controleer ook de GitHub Actions-run en de doelomgeving.

# tectonic-SDWorkx
