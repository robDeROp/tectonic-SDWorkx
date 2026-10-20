-- Translate only known, unchanged demo text. Keep user-authored text and completed AI evidence intact.
-- No tasks are started and no case statuses, answers or conversation timestamps are changed.
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Departure holiday pay for a part-time employee'
WHERE "title" = 'Vertrekvakantiegeld bij een deeltijdse bediende' AND id = 'hunch-deeltijds';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m preparing the final settlement for a white-collar employee at Atelier Noord who moved from full-time to part-time work halfway through the year. How do I handle departure holiday pay, and what goes on the holiday certificate?'
WHERE "working_on" = 'Ik bereid de eindafrekening voor van een bediende bij Atelier Noord die halverwege het jaar van voltijds naar deeltijds ging. Hoe verwerk ik het vertrekvakantiegeld en wat komt er op het vakantieattest?' AND id = 'hunch-deeltijds';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Retrieving a customer''s payroll data through the API'
WHERE "title" = 'Loongegevens van een klant opvragen via de API' AND id = 'hunch-api';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'A customer wants to retrieve their payroll data automatically in their own HR tool. Which API do we use, and who arranges access?'
WHERE "working_on" = 'Een klant wil zijn loongegevens automatisch ophalen in zijn eigen HR-tool. Welke API gebruiken we daarvoor en wie regelt de toegang?' AND id = 'hunch-api';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Holiday pay calculation rule when working hours change'
WHERE "title" = 'Rekenregel vakantiegeld bij wisselend arbeidsregime' AND id = 'hunch-rekenregel';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m working on PR 1842 in the payroll engine. How should departure holiday pay be calculated when a white-collar employee moved to part-time work during the year? I want to make sure the test cases are correct.'
WHERE "working_on" = 'Ik werk aan PR 1842 in de loonmotor. Hoe hoort het vertrekvakantiegeld berekend te worden als een bediende tijdens het jaar deeltijds ging? Ik wil zeker zijn dat de testcases kloppen.' AND id = 'hunch-rekenregel';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = '#payroll-engine-dev'
WHERE "source_label" = '#loonmotor-dev' AND id = 'hunch-rekenregel';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Why does the holiday certificate arrive after the final settlement?'
WHERE "title" = 'Waarom komt het vakantieattest later dan de eindafrekening?' AND id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'A customer called because their departing white-collar employee has received the final settlement but not the holiday certificate. I want to explain how the process works.'
WHERE "working_on" = 'Een klant belt omdat zijn vertrekkende bediende de eindafrekening al kreeg, maar het vakantieattest nog niet. Ik wil hem uitleggen hoe dat proces loopt.' AND id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = 'Thomas''s holiday certificate'
WHERE "source_label" = 'Vakantieattest Thomas' AND id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'How do we apply the new holiday pay guideline in practice?'
WHERE "title" = 'Hoe passen we de nieuwe richtlijn vakantiegeld in de praktijk toe?' AND id = 'hunch-praktijk';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m writing a legal note about the new holiday pay guideline. I''m looking for someone who prepares final settlements every day to check whether the note is practical.'
WHERE "working_on" = 'Ik schrijf een juridische nota over de nieuwe richtlijn rond vakantiegeld. Ik zoek iemand die dagelijks eindafrekeningen maakt om te toetsen of de nota werkbaar is.' AND id = 'hunch-praktijk';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Final settlement examples for a webinar'
WHERE "title" = 'Voorbeelden van eindafrekeningen voor een webinar' AND id = 'hunch-webinar';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m preparing a webinar for HR managers on termination of employment. Customers asked for concrete examples of a final settlement with departure holiday pay. Which examples can we show?'
WHERE "working_on" = 'Ik bereid een webinar voor HR-managers voor over uitdiensttreding. Klanten vroegen naar concrete voorbeelden van een eindafrekening met vertrekvakantiegeld. Welke voorbeelden mogen we tonen?' AND id = 'hunch-webinar';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Explaining holiday pay changes in the newsletter'
WHERE "title" = 'Wijziging vakantiegeld uitleggen in de nieuwsbrief' AND id = 'hunch-nieuwsbrief';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m writing a newsletter article about the new holiday pay rules. What has worked before when communicating legal changes to customers?'
WHERE "working_on" = 'Ik schrijf een stuk voor de nieuwsbrief over de nieuwe regels rond vakantiegeld. Wat werkte vroeger bij klantcommunicatie over wetswijzigingen?' AND id = 'hunch-nieuwsbrief';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Updating the final settlement checklist after the new guideline'
WHERE "title" = 'Checklist eindafrekening bijwerken na de nieuwe richtlijn' AND id = 'hunch-checklist';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'The final settlement checklist needs to be updated for the new holiday pay guideline. Who has the latest version, and what needs to change?'
WHERE "working_on" = 'De checklist eindafrekening moet aangepast worden aan de nieuwe richtlijn vakantiegeld. Wie heeft de laatste versie en wat moet er veranderen?' AND id = 'hunch-checklist';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Announcing a breaking change in the public API'
WHERE "title" = 'Breaking change in de publieke API aankondigen' AND id = 'hunch-breaking';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'We need to rename a field in the payroll API. How have we announced this kind of change to integration partners before?'
WHERE "working_on" = 'We moeten een veld in de payroll-API hernoemen. Hoe hebben we zo''n wijziging vroeger aangekondigd aan integratiepartners?' AND id = 'hunch-breaking';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'What do we tell customers about the 2027 indexation?'
WHERE "title" = 'Wat vertellen we klanten over de indexering 2027?' AND id = 'hunch-indexering';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'Customers are already asking about next year''s indexation. Is a standard answer or campaign being prepared?'
WHERE "working_on" = 'Klanten vragen al naar de indexering van volgend jaar. Is er een standaardantwoord of campagne in voorbereiding?' AND id = 'hunch-indexering';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Setting up a local test environment for the payroll engine'
WHERE "title" = 'Lokale testomgeving voor de loonmotor opzetten' AND id = 'hunch-testomgeving';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m new to the team and want to run the payroll engine locally with test data. How do we do that here?'
WHERE "working_on" = 'Ik ben nieuw in het team en wil de loonmotor lokaal draaien met testdata. Hoe doen we dat hier?' AND id = 'hunch-testomgeving';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'How do we document a new calculation rule?'
WHERE "title" = 'Hoe documenteren we een nieuwe rekenregel?' AND id = 'hunch-rekenregel-doc';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m adding a calculation rule to the payroll engine. Where and in what format do we record the functional explanation?'
WHERE "working_on" = 'Ik voeg een rekenregel toe aan de loonmotor. Waar en in welk formaat leggen we de functionele uitleg vast?' AND id = 'hunch-rekenregel-doc';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Which customers want to test the new newsletter?'
WHERE "title" = 'Welke klanten willen de nieuwe nieuwsbrief testen?' AND id = 'hunch-testpanel';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'We''re refreshing the newsletter for HR professionals. Which customers previously said they wanted to help test it?'
WHERE "working_on" = 'We vernieuwen de nieuwsbrief voor HR-professionals. Welke klanten gaven eerder aan mee te willen testen?' AND id = 'hunch-testpanel';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Completing the departure holiday pay checklist together'
WHERE "title" = 'Samen de checklist voor vertrekvakantiegeld afronden' AND id = 'hunch-samenwerken';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m updating the final settlement checklist. What information about part-time work do we still need to request?'
WHERE "working_on" = 'Ik werk de checklist voor de eindafrekening bij. Welke gegevens over deeltijds werk moeten we nog opvragen?' AND id = 'hunch-samenwerken';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Teams: preparing access to the payroll API'
WHERE "title" = 'Teams: toegang tot de payroll-API voorbereiden' AND id = 'hunch-teams-api';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'A customer team is asking in Teams what access is needed for the payroll API. I''m looking for the documentation and the right colleague.'
WHERE "working_on" = 'In Teams vraagt een klantteam welke toegang nodig is voor de payroll-API. Ik zoek de documentatie en de juiste collega.' AND id = 'hunch-teams-api';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = '#api-integrations'
WHERE "source_label" = '#api-integraties' AND id = 'hunch-teams-api';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Teams: payroll checks the part-time work test case'
WHERE "title" = 'Teams: payroll controleert de testcasus voor deeltijds werk' AND id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'The departure holiday pay calculation rule needs an extra test case. Jamie is helping review the functional inputs.'
WHERE "working_on" = 'De rekenregel voor vertrekvakantiegeld heeft een extra testcasus nodig. Jamie helpt de functionele invoer na te kijken.' AND id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = '#payroll-engine-dev'
WHERE "source_label" = '#loonmotor-dev' AND id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Teams: API access documentation found'
WHERE "title" = 'Teams: documentatie voor API-toegang gevonden' AND id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'We were looking for the right API onboarding for an integration partner. The documentation has been found and shared.'
WHERE "working_on" = 'We zochten de juiste API-onboarding voor een integratiepartner. De documentatie is gevonden en gedeeld.' AND id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = '#api-integrations'
WHERE "source_label" = '#api-integraties' AND id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Outlook: customer email with a final settlement attachment'
WHERE "title" = 'Outlook: klantmail met bijlage over de eindafrekening' AND id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'The customer sent additional notes for a final settlement. I want to check what information is still missing.'
WHERE "working_on" = 'De klant stuurde aanvullende notities voor een eindafrekening. Ik wil controleren welke gegevens nog ontbreken.' AND id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = 'Additional final settlement information'
WHERE "source_label" = 'Aanvullende gegevens eindafrekening' AND id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Outlook: a colleague helps check a holiday certificate'
WHERE "title" = 'Outlook: collega helpt bij de controle van een vakantieattest' AND id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'A customer is asking whether all periods are correctly listed on the holiday certificate. Pieter is helping check the case details.'
WHERE "working_on" = 'Een klant vraagt of alle periodes correct op het vakantieattest staan. Pieter helpt de dossiergegevens te controleren.' AND id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = 'Holiday certificate check'
WHERE "source_label" = 'Controle vakantieattest' AND id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Outlook: missing case details clarified'
WHERE "title" = 'Outlook: ontbrekende dossiergegevens verduidelijkt' AND id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'The customer didn''t know what information was needed for the final settlement. Jamie helped clarify the checklist.'
WHERE "working_on" = 'De klant wist niet welke gegevens nodig waren voor de eindafrekening. Jamie hielp de checklist te verduidelijken.' AND id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "source_label" = 'Re: information needed for the final settlement'
WHERE "source_label" = 'Re: benodigde gegevens voor eindafrekening' AND id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Help request withdrawn: found the checklist myself'
WHERE "title" = 'Hulpvraag ingetrokken: checklist zelf teruggevonden' AND id = 'hunch-geannuleerd';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I was looking for the final settlement checklist and asked for help. I''ve since found the right version, so the help request has been withdrawn.'
WHERE "working_on" = 'Ik zocht de checklist eindafrekening en vroeg hulp. Intussen vond ik de juiste versie, dus de hulpvraag is ingetrokken.' AND id = 'hunch-geannuleerd';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'Help request reaches payroll after two handovers'
WHERE "title" = 'Hulpvraag na twee keer doorgeven bij payroll' AND id = 'hunch-doorgeven-limiet';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'For the departure holiday pay calculation rule, I''m looking for someone who processes final settlements every day. The question has been passed on twice.'
WHERE "working_on" = 'Voor de rekenregel vertrekvakantiegeld zoek ik iemand die dagelijks eindafrekeningen verwerkt. De vraag is twee keer doorgegeven.' AND id = 'hunch-doorgeven-limiet';
--> statement-breakpoint
UPDATE "hunches" SET "title" = 'New question without matching knowledge sources'
WHERE "title" = 'Nieuwe vraag zonder passende kennisbronnen' AND id = 'hunch-geen-bronnen';
--> statement-breakpoint
UPDATE "hunches" SET "working_on" = 'I''m organising an introductory session and looking for practical experiences of welcoming new visitors.'
WHERE "working_on" = 'Ik organiseer een introductiemoment en zoek praktische ervaringen met de ontvangst van nieuwe bezoekers.' AND id = 'hunch-geen-bronnen';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m preparing the final settlement for a white-collar employee at Atelier Noord who moved from full-time to part-time work halfway through the year. How do I handle departure holiday pay, and what goes on the holiday certificate?'
WHERE "content" = 'Ik bereid de eindafrekening voor van een bediende bij Atelier Noord die halverwege het jaar van voltijds naar deeltijds ging. Hoe verwerk ik het vertrekvakantiegeld en wat komt er op het vakantieattest?' AND hunch_id = 'hunch-deeltijds';
--> statement-breakpoint
UPDATE "hunch_messages" SET "attachment_name" = 'Atelier Noord customer meeting notes.txt'
WHERE "attachment_name" = 'Notities klantgesprek Atelier Noord.txt' AND hunch_id = 'hunch-deeltijds';
--> statement-breakpoint
UPDATE "hunch_messages" SET "attachment_text" = 'FICTIONAL DEMONSTRATION NOTES — Atelier Noord customer meeting

- Thomas, a white-collar employee, leaves employment on 30 September.
- Full-time from January through May, 80% working hours from June.
- 6 days of holiday remain untaken.
- The customer wants to know what goes on the holiday certificate and whether both periods are listed separately.
- Jamie''s action: prepare the calculation and respond before Friday.'
WHERE "attachment_text" = 'FICTIEVE DEMONSTRATIENOTITIES — Klantgesprek Atelier Noord

- Bediende Thomas gaat uit dienst op 30 september.
- Van januari tot en met mei voltijds, vanaf juni 4/5de.
- Nog 6 vakantiedagen niet opgenomen.
- Klant wil weten wat er op het vakantieattest komt en of beide periodes apart staan.
- Actie Jamie: berekening voorbereiden en terugkoppelen vóór vrijdag.' AND hunch_id = 'hunch-deeltijds';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'A customer wants to retrieve their payroll data automatically in their own HR tool. Which API do we use, and who arranges access?'
WHERE "content" = 'Een klant wil zijn loongegevens automatisch ophalen in zijn eigen HR-tool. Welke API gebruiken we daarvoor en wie regelt de toegang?' AND hunch_id = 'hunch-api';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m preparing a webinar for HR managers on termination of employment. Customers asked for concrete examples of a final settlement with departure holiday pay. Which examples can we show?'
WHERE "content" = 'Ik bereid een webinar voor HR-managers voor over uitdiensttreding. Klanten vroegen naar concrete voorbeelden van een eindafrekening met vertrekvakantiegeld. Welke voorbeelden mogen we tonen?' AND hunch_id = 'hunch-webinar';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m writing a legal note about the new holiday pay guideline. I''m looking for someone who prepares final settlements every day to check whether the note is practical.'
WHERE "content" = 'Ik schrijf een juridische nota over de nieuwe richtlijn rond vakantiegeld. Ik zoek iemand die dagelijks eindafrekeningen maakt om te toetsen of de nota werkbaar is.' AND hunch_id = 'hunch-praktijk';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m writing a newsletter article about the new holiday pay rules. What has worked before when communicating legal changes to customers?'
WHERE "content" = 'Ik schrijf een stuk voor de nieuwsbrief over de nieuwe regels rond vakantiegeld. Wat werkte vroeger bij klantcommunicatie over wetswijzigingen?' AND hunch_id = 'hunch-nieuwsbrief';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Be sure to look at the indexation campaign review. A short checklist at the top worked much better than a lengthy explanation.'
WHERE "content" = 'Kijk zeker naar de evaluatie van de indexeringscampagne. Een korte checklist bovenaan werkte veel beter dan een lange uitleg.' AND hunch_id = 'hunch-nieuwsbrief';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Great, I''ll use that. Thank you!'
WHERE "content" = 'Top, dat neem ik mee. Dank je!' AND hunch_id = 'hunch-nieuwsbrief';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Noah, can you check the part-time work test cases before we merge PR 1842?'
WHERE "content" = 'Noah, kun je de testcases voor deeltijds werk nog nakijken voor we PR 1842 mergen?' AND hunch_id = 'hunch-rekenregel';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Will do. I''m just not sure how the rule should work when someone moves from full-time to part-time work halfway through the year. Who can confirm that?'
WHERE "content" = 'Doe ik. Ik weet alleen niet zeker hoe de regel hoort te werken als iemand halverwege het jaar van voltijds naar deeltijds gaat. Wie kan dat bevestigen?' AND hunch_id = 'hunch-rekenregel';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Tom,

Thomas has received his final settlement, but not his holiday certificate. He needs it for his new employer. When can we expect it?

Regards,
Sophie'
WHERE "content" = 'Dag Tom,

Thomas heeft zijn eindafrekening ontvangen, maar het vakantieattest nog niet. Hij heeft het nodig voor zijn nieuwe werkgever. Wanneer mogen we het verwachten?

Groeten,
Sophie' AND hunch_id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunch_messages" SET "author_detail" = 'HR manager · Atelier Noord (customer)'
WHERE "author_detail" = 'HR manager · Atelier Noord (klant)' AND hunch_id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Sophie, I''ll find out exactly how the process works and get back to you today.'
WHERE "content" = 'Dag Sophie, ik zoek uit hoe dat proces precies loopt en kom er vandaag nog op terug.' AND hunch_id = 'hunch-attest';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'The final settlement checklist needs to be updated for the new holiday pay guideline. Who has the latest version, and what needs to change?'
WHERE "content" = 'De checklist eindafrekening moet aangepast worden aan de nieuwe richtlijn vakantiegeld. Wie heeft de laatste versie en wat moet er veranderen?' AND hunch_id = 'hunch-checklist';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'We need to rename a field in the payroll API. How have we announced this kind of change to integration partners before?'
WHERE "content" = 'We moeten een veld in de payroll-API hernoemen. Hoe hebben we zo''n wijziging vroeger aangekondigd aan integratiepartners?' AND hunch_id = 'hunch-breaking';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Customers are already asking about next year''s indexation. Is a standard answer or campaign being prepared?'
WHERE "content" = 'Klanten vragen al naar de indexering van volgend jaar. Is er een standaardantwoord of campagne in voorbereiding?' AND hunch_id = 'hunch-indexering';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m new to the team and want to run the payroll engine locally with test data. How do we do that here?'
WHERE "content" = 'Ik ben nieuw in het team en wil de loonmotor lokaal draaien met testdata. Hoe doen we dat hier?' AND hunch_id = 'hunch-testomgeving';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m adding a calculation rule to the payroll engine. Where and in what format do we record the functional explanation?'
WHERE "content" = 'Ik voeg een rekenregel toe aan de loonmotor. Waar en in welk formaat leggen we de functionele uitleg vast?' AND hunch_id = 'hunch-rekenregel-doc';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'We''re refreshing the newsletter for HR professionals. Which customers previously said they wanted to help test it?'
WHERE "content" = 'We vernieuwen de nieuwsbrief voor HR-professionals. Welke klanten gaven eerder aan mee te willen testen?' AND hunch_id = 'hunch-testpanel';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m updating the final settlement checklist. What information about part-time work do we still need to request?'
WHERE "content" = 'Ik werk de checklist voor de eindafrekening bij. Welke gegevens over deeltijds werk moeten we nog opvragen?' AND hunch_id = 'hunch-samenwerken';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I was looking for the final settlement checklist and asked for help. I''ve since found the right version, so the help request has been withdrawn.'
WHERE "content" = 'Ik zocht de checklist eindafrekening en vroeg hulp. Intussen vond ik de juiste versie, dus de hulpvraag is ingetrokken.' AND hunch_id = 'hunch-geannuleerd';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'For the departure holiday pay calculation rule, I''m looking for someone who processes final settlements every day. The question has been passed on twice.'
WHERE "content" = 'Voor de rekenregel vertrekvakantiegeld zoek ik iemand die dagelijks eindafrekeningen verwerkt. De vraag is twee keer doorgegeven.' AND hunch_id = 'hunch-doorgeven-limiet';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''m organising an introductory session and looking for practical experiences of welcoming new visitors.'
WHERE "content" = 'Ik organiseer een introductiemoment en zoek praktische ervaringen met de ontvangst van nieuwe bezoekers.' AND hunch_id = 'hunch-geen-bronnen';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ll take a look. Let''s confirm the salary history and the change in working hours first. Then we''ll go through the checklist together.'
WHERE "content" = 'Ik kijk mee. Laten we eerst de loonhistoriek en de wijziging van het arbeidsregime bevestigen. Daarna lopen we samen de checklist door.' AND hunch_id = 'hunch-samenwerken';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Does anyone have the API access checklist for a new integration partner?'
WHERE "content" = 'Heeft iemand de checklist voor API-toegang bij een nieuwe integratiepartner?' AND hunch_id = 'hunch-teams-api';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ll find the onboarding documentation. We haven''t requested access yet.'
WHERE "content" = 'Ik zoek de onboardingdocumentatie erbij. We hebben nog geen toegang aangevraagd.' AND hunch_id = 'hunch-teams-api';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I have a test case ready for a move to 80% working hours. Who can review the functional inputs?'
WHERE "content" = 'Ik heb een testcasus voor een overstap naar 4/5de klaar. Wie kan de invoer functioneel nakijken?' AND hunch_id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Send over the fictional data and I''ll take a look.'
WHERE "content" = 'Stuur de fictieve gegevens door, dan kijk ik mee.' AND hunch_id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ve taken on the help request. I''m comparing the periods with the final settlement checklist.'
WHERE "content" = 'Ik heb de hulpvraag opgepakt. Ik vergelijk de periodes met de checklist voor eindafrekeningen.' AND hunch_id = 'hunch-teams-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Where is the current documentation for the payroll API?'
WHERE "content" = 'Waar staat de actuele documentatie voor de payroll-API?' AND hunch_id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'It''s in the DevOps Wiki. I''ll point you to the right place.'
WHERE "content" = 'Die staat in de DevOps Wiki. Ik geef je de juiste ingang.' AND hunch_id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'The API onboarding is listed under relevant documents. Start with access and the test account.'
WHERE "content" = 'De API-onboarding staat bij de relevante documenten. Begin met de toegang en het testaccount.' AND hunch_id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Found it, thanks! I can move forward and will close this hunch.'
WHERE "content" = 'Gevonden, bedankt! Ik kan verder en sluit deze hunch.' AND hunch_id = 'hunch-teams-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Jamie,

Our notes for the final settlement are attached. Can you let us know what information is still missing?

Regards,
Sophie'
WHERE "content" = 'Dag Jamie,

In de bijlage staan onze notities voor de eindafrekening. Kun je aangeven welke gegevens nog ontbreken?

Groeten,
Sophie' AND hunch_id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunch_messages" SET "author_detail" = 'HR manager · Atelier Noord (fictional customer)'
WHERE "author_detail" = 'HR manager · Atelier Noord (fictieve klant)' AND hunch_id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunch_messages" SET "attachment_name" = 'Customer final settlement notes.txt'
WHERE "attachment_name" = 'Klantnotities eindafrekening.txt' AND hunch_id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunch_messages" SET "attachment_text" = 'FICTIONAL TEST DATA

Thomas leaves on 30 September. He has worked 80% hours since June. The salary history and the record of leave taken still need to be confirmed. These notes contain no calculation.'
WHERE "attachment_text" = 'FICTIEVE TESTDATA

Thomas vertrekt op 30 september. Vanaf juni werkt hij 4/5de. De loonhistoriek en het overzicht van opgenomen vakantiedagen moeten nog bevestigd worden. Deze notities bevatten geen berekening.' AND hunch_id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Sophie, thanks for the notes. I''ll review them and let you know what information is still needed.'
WHERE "content" = 'Dag Sophie, bedankt voor de notities. Ik loop ze na en koppel terug welke gegevens nog nodig zijn.' AND hunch_id = 'hunch-outlook-bijlage';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Jamie,

Can you check whether both the full-time and part-time periods are included in the holiday certificate? We''d like to finalise this.

Thanks,
Milan'
WHERE "content" = 'Dag Jamie,

Kun je controleren of de voltijdse en deeltijdse periode beide verwerkt zijn in het vakantieattest? We willen dit graag afronden.

Bedankt,
Milan' AND hunch_id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "author_detail" = 'HR employee · Studio Rivier (fictional customer)'
WHERE "author_detail" = 'HR medewerker · Studio Rivier (fictieve klant)' AND hunch_id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ll ask my colleague to help check the employment history.'
WHERE "content" = 'Ik laat de tewerkstellingshistoriek mee nakijken door mijn collega.' AND hunch_id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ve taken this on. I''ll check the two periods and let you know if any information is missing.'
WHERE "content" = 'Ik heb dit opgepakt. Ik controleer de twee periodes en laat weten of er informatie ontbreekt.' AND hunch_id = 'hunch-outlook-hulp';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Hi Tom, what information do we still need to provide before you can prepare the final settlement?'
WHERE "content" = 'Dag Tom, welke gegevens moeten we nog bezorgen voordat jullie de eindafrekening kunnen voorbereiden?' AND hunch_id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "author_detail" = 'HR manager · Atelier Noord (fictional customer)'
WHERE "author_detail" = 'HR manager · Atelier Noord (fictieve klant)' AND hunch_id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'I''ll check the checklist with payroll and get back to you.'
WHERE "content" = 'Ik stem de checklist af met payroll en kom erop terug.' AND hunch_id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'Request the salary history, working hours, leave taken and holiday pay already paid. The internal checklist is in the context.'
WHERE "content" = 'Vraag de loonhistoriek, arbeidsregimes, opgenomen vakantiedagen en reeds betaald vakantiegeld op. De interne checklist staat bij de context.' AND hunch_id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'The required information is clear. This sample case is complete.'
WHERE "content" = 'De benodigde gegevens zijn duidelijk. Deze voorbeeldcase is afgerond.' AND hunch_id = 'hunch-outlook-opgelost';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'The help request has been withdrawn. I''ll continue on my own with the checklist I found.'
WHERE "content" = 'De hulpvraag is ingetrokken. Ik werk zelf verder met de gevonden checklist.' AND hunch_id = 'hunch-geannuleerd';
--> statement-breakpoint
UPDATE "hunch_messages" SET "content" = 'The question is now with Jamie. This example shows the limit of two handovers.'
WHERE "content" = 'De vraag ligt nu bij Jamie. Dit voorbeeld toont de grens van twee keer doorgeven.' AND hunch_id = 'hunch-doorgeven-limiet';
--> statement-breakpoint
UPDATE "help_calls" SET "note" = 'Jamie handles these cases every day.'
WHERE "note" = 'Jamie verwerkt deze casussen dagelijks.' AND hunch_id = 'hunch-rekenregel' AND recipient_id = 'e-pieter';
--> statement-breakpoint
UPDATE "help_calls" SET "note" = 'Found the checklist myself'
WHERE "note" = 'Checklist zelf gevonden' AND hunch_id = 'hunch-geannuleerd' AND recipient_id = 'e-pieter';
--> statement-breakpoint
UPDATE "help_calls" SET "note" = 'Lotte can clarify the functional explanation.'
WHERE "note" = 'Lotte kan de functionele uitleg verduidelijken.' AND hunch_id = 'hunch-doorgeven-limiet' AND recipient_id = 'e-pieter';
--> statement-breakpoint
UPDATE "help_calls" SET "note" = 'Jamie handles these cases every day.'
WHERE "note" = 'Jamie verwerkt deze cases dagelijks.' AND hunch_id = 'hunch-doorgeven-limiet' AND recipient_id = 'e-lotte';
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Tracks holiday pay regulations'
WHERE "reason" = 'Volgt de regelgeving rond vakantiegeld op' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, payroll engine'
WHERE "reason" = 'Herkend: rekenregel, loonmotor' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday certificate, part-time, white-collar employee'
WHERE "reason" = 'Herkend: vakantieattest, deeltijds, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement'
WHERE "reason" = 'Herkend: eindafrekening' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: part-time, white-collar employee, holiday pay'
WHERE "reason" = 'Herkend: deeltijds, bediende, vakantiegeld' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday pay'
WHERE "reason" = 'Herkend: vakantiegeld' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday pay, final settlement, guideline'
WHERE "reason" = 'Herkend: vakantiegeld, eindafrekening, richtlijn' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: api, payroll data'
WHERE "reason" = 'Herkend: api, loongegevens' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: payroll engine, calculation rule'
WHERE "reason" = 'Herkend: loonmotor, rekenregel' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Built the calculation module · 38 pull requests'
WHERE "reason" = 'Bouwde de berekeningsmodule · 38 pull requests' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Provides the functional calculation rules'
WHERE "reason" = 'Levert de functionele rekenregels aan' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday certificate, white-collar employee'
WHERE "reason" = 'Herkend: vakantieattest, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Works in your team according to Entra'
WHERE "reason" = 'Werkt in je team volgens Entra' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Owner of the Final Settlement 2.0 project'
WHERE "reason" = 'Eigenaar van het project Eindafrekening 2.0' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday pay, final settlement'
WHERE "reason" = 'Herkend: vakantiegeld, eindafrekening' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: api, integration, devops'
WHERE "reason" = 'Herkend: api, integratie, devops' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: webinar, final settlement, customer'
WHERE "reason" = 'Herkend: webinar, eindafrekening, klanten' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, termination of employment'
WHERE "reason" = 'Herkend: eindafrekening, uitdiensttreding' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday certificate, part-time'
WHERE "reason" = 'Herkend: vakantieattest, deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, payroll engine, documentation'
WHERE "reason" = 'Herkend: rekenregel, loonmotor, documenteren' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Knows the questions customers actually ask'
WHERE "reason" = 'Kent de vragen die klanten echt stellen' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, holiday pay, part-time'
WHERE "reason" = 'Herkend: rekenregel, vakantiegeld, deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: payroll engine, test environment'
WHERE "reason" = 'Herkend: loonmotor, testomgeving' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: departure holiday pay, final settlement, holiday certificate'
WHERE "reason" = 'Herkend: vertrekvakantiegeld, eindafrekening, vakantieattest' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, payroll engine, part-time'
WHERE "reason" = 'Herkend: rekenregel, loonmotor, deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, part-time, pr 1842'
WHERE "reason" = 'Herkend: rekenregel, deeltijds, pr 1842' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: departure holiday pay, final settlement, part-time'
WHERE "reason" = 'Herkend: vertrekvakantiegeld, eindafrekening, deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: indexation, campaign'
WHERE "reason" = 'Herkend: indexering, campagne' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Led the 2026 indexation campaign'
WHERE "reason" = 'Leidde de campagne indexering 2026' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Reviews payroll content in customer communications'
WHERE "reason" = 'Controleert klantcommunicatie op payrollvlak' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: api, integration'
WHERE "reason" = 'Herkend: api, integratie' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Architect of the public API'
WHERE "reason" = 'Architect van de publieke API' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday pay, departure holiday pay, white-collar employee'
WHERE "reason" = 'Herkend: vakantiegeld, vertrekvakantiegeld, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Manages the newsletter for HR professionals'
WHERE "reason" = 'Beheert de nieuwsbrief voor HR-professionals' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: customer'
WHERE "reason" = 'Herkend: klanten' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Recently started working on Payroll Engine v4'
WHERE "reason" = 'Werkt sinds kort aan Loonmotor v4' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: checklist'
WHERE "reason" = 'Herkend: checklist' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, checklist, holiday entitlement'
WHERE "reason" = 'Herkend: eindafrekening, checklist, vakantiedagen' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, departure holiday pay, white-collar employee'
WHERE "reason" = 'Herkend: eindafrekening, vertrekvakantiegeld, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, holiday pay'
WHERE "reason" = 'Herkend: eindafrekening, vakantiegeld' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, termination of employment, departure holiday pay'
WHERE "reason" = 'Herkend: eindafrekening, uitdiensttreding, vertrekvakantiegeld' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: departure holiday pay, white-collar employee'
WHERE "reason" = 'Herkend: vertrekvakantiegeld, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: customer communication, newsletter'
WHERE "reason" = 'Herkend: klantcommunicatie, nieuwsbrief' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, white-collar employee'
WHERE "reason" = 'Herkend: eindafrekening, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, checklist'
WHERE "reason" = 'Herkend: eindafrekening, checklist' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Wrote the payroll playbook · answered 14 similar questions'
WHERE "reason" = 'Schreef het payroll playbook · beantwoordde 14 vergelijkbare vragen' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: newsletter'
WHERE "reason" = 'Herkend: nieuwsbrief' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Built the holiday pay calculation in the payroll engine'
WHERE "reason" = 'Bouwde de vakantiegeldberekening in de loonmotor' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: departure holiday pay, final settlement'
WHERE "reason" = 'Herkend: vertrekvakantiegeld, eindafrekening' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: campaign, indexation'
WHERE "reason" = 'Herkend: campagne, indexering' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule, part-time'
WHERE "reason" = 'Herkend: rekenregel, deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: holiday pay, final settlement, holiday entitlement'
WHERE "reason" = 'Herkend: vakantiegeld, eindafrekening, vakantiedagen' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, departure holiday pay'
WHERE "reason" = 'Herkend: eindafrekening, vertrekvakantiegeld' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: final settlement, holiday certificate, white-collar employee'
WHERE "reason" = 'Herkend: eindafrekening, vakantieattest, bediende' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: part-time'
WHERE "reason" = 'Herkend: deeltijds' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: newsletter, customer communication, indexation'
WHERE "reason" = 'Herkend: nieuwsbrief, klantcommunicatie, indexering' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: api, integration, breaking'
WHERE "reason" = 'Herkend: api, integratie, breaking' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: payroll engine'
WHERE "reason" = 'Herkend: loonmotor' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: calculation rule'
WHERE "reason" = 'Herkend: rekenregel' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: webinar'
WHERE "reason" = 'Herkend: webinar' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: indexation, newsletter'
WHERE "reason" = 'Herkend: indexering, nieuwsbrief' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Processes final settlements every week'
WHERE "reason" = 'Verwerkt wekelijks eindafrekeningen' AND TRUE;
--> statement-breakpoint
UPDATE "hunch_context" SET "reason" = 'Matched: departure holiday pay, final settlement, termination of employment'
WHERE "reason" = 'Herkend: vertrekvakantiegeld, eindafrekening, uitdiensttreding' AND TRUE;
--> statement-breakpoint
UPDATE documents SET name = 'Departure holiday pay · regulatory framework', content = 'FICTIONAL DEMONSTRATION MATERIAL — not real legislation or legal advice. The following assumptions apply to this fictional case. When a white-collar employee leaves employment, the payroll department must examine departure holiday pay and process it in the final settlement. The calculation takes account of the relevant salary basis, employment period, holiday pay already paid and leave already taken. The employer provides a holiday certificate to the departing employee. An exact amount cannot be determined without salary and holiday history. This document contains no percentages or calculation formula. It applies only to the fictional Belgian white-collar employee case and contains no general rules for blue-collar workers.'
WHERE name = 'Vertrekvakantiegeld · regelgevend kader' AND content = 'FICTIEF DEMONSTRATIEMATERIAAL — geen echte wetgeving of juridisch advies. Voor deze fictieve casus gelden de volgende uitgangspunten. Bij de uitdiensttreding van een bediende moet de payrollafdeling het vertrekvakantiegeld onderzoeken en verwerken in de eindafrekening. De berekening houdt rekening met de relevante loonbasis, tewerkstellingsperiode, reeds uitbetaald vakantiegeld en opgenomen vakantiedagen. De werkgever bezorgt een vakantieattest aan de vertrekkende bediende. Zonder de loon- en vakantiehistoriek kan geen exact bedrag worden vastgesteld. Dit document bevat geen percentages of rekensleutel. Het geldt uitsluitend voor de fictieve Belgische bediendecasus en bevat geen algemene regels voor arbeiders.' AND fictional = true AND storage_key IS NULL AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = documents.ticket_id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = documents.ticket_id);
--> statement-breakpoint
UPDATE documents SET name = 'Payroll playbook · termination of employment', content = 'FICTIONAL INTERNAL WORK INSTRUCTION — not an official SD Worx document. For the demonstration case: request the end date, employee status, relevant salary data, employment history, an overview of leave taken and remaining, and holiday pay already paid. The payroll employee checks these details before the final settlement. Include departure holiday pay in the white-collar employee''s final settlement and provide the holiday certificate. Do not promise an exact amount without a calculation based on the full history. For this demo, this work instruction supersedes the internal FAQ from February 2021. Refer the customer to their payroll contact if information is missing.'
WHERE name = 'Payroll playbook · uitdiensttreding' AND content = 'FICTIEVE INTERNE WERKINSTRUCTIE — geen officieel document van SD Worx. Voor de demonstratiecasus: vraag de einddatum, het werknemersstatuut, de relevante loongegevens, de tewerkstellingshistoriek, het overzicht van opgenomen en resterende vakantiedagen en reeds uitbetaald vakantiegeld op. De payrollmedewerker controleert deze gegevens vóór de eindafrekening. Neem vertrekvakantiegeld mee in de eindafrekening van de bediende en bezorg het vakantieattest. Beloof geen exact bedrag zonder berekening op basis van de volledige historiek. Deze werkinstructie vervangt voor deze demo de interne FAQ van februari 2021. Verwijs de klant bij ontbrekende informatie naar zijn payrollcontact.' AND fictional = true AND storage_key IS NULL AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = documents.ticket_id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = documents.ticket_id);
--> statement-breakpoint
UPDATE documents SET name = 'Holiday & departure FAQ · 2021 archive', content = 'FICTIONAL ARCHIVE DOCUMENT — contains deliberately incorrect and contradictory information for a software demonstration. Old internal FAQ: when a white-collar employee leaves in September, we do not pay departure holiday pay through the final settlement; the new employer handles everything. A holiday certificate is not required. Ask only for the name and end date. This instruction is outdated and has been superseded by the payroll playbook from September 2026. Do not use this old instruction as the basis for the customer answer.'
WHERE name = 'FAQ vakantie & vertrek · archief 2021' AND content = 'FICTIEF ARCHIEFDOCUMENT — bevat opzettelijk onjuiste en tegenstrijdige informatie voor een softwaredemonstratie. Oude interne FAQ: bij vertrek van een bediende in september betalen we geen vertrekvakantiegeld via de eindafrekening; de nieuwe werkgever regelt alles. Een vakantieattest is niet nodig. Vraag alleen de naam en einddatum op. Deze instructie is verouderd en is vervangen door het payroll playbook van september 2026. Gebruik deze oude instructie niet als grondslag voor het klantantwoord.' AND fictional = true AND storage_key IS NULL AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = documents.ticket_id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = documents.ticket_id);
--> statement-breakpoint
UPDATE documents SET name = 'Final settlement checklist · colleague supplement.txt', content = 'FICTIONAL DEMONSTRATION MATERIAL — additional internal checklist from a fictional colleague. For the Belgian white-collar employee case, salary history, employment period, holiday pay already paid and leave taken must be confirmed before the final settlement can be calculated. These details have not yet been confirmed. Provide a holiday certificate on termination of employment. The 2021 FAQ has been superseded by the payroll playbook from September 2026. This document adds no percentages, amounts or new legal rules.'
WHERE name = 'Checklist eindafrekening · aanvulling collega.txt' AND content = 'FICTIEF DEMONSTRATIEMATERIAAL — aanvullende interne checklist van een fictieve collega. Voor de Belgische bediendecasus moeten de loonhistoriek, tewerkstellingsperiode, reeds betaald vakantiegeld en opgenomen vakantiedagen bevestigd worden voordat de eindafrekening kan worden berekend. Deze gegevens zijn nog niet bevestigd. Bezorg een vakantieattest bij uitdiensttreding. De FAQ van 2021 is vervangen door het payroll playbook van september 2026. Dit document voegt geen percentages, bedragen of nieuwe wettelijke regels toe.' AND fictional = true AND storage_key IS NULL AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = documents.ticket_id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = documents.ticket_id);
--> statement-breakpoint
UPDATE "documents" SET "kind" = 'Legislative'
WHERE "kind" = 'Wetgevingsgericht' AND TRUE;
--> statement-breakpoint
UPDATE "documents" SET "kind" = 'Internal'
WHERE "kind" = 'Intern' AND TRUE;
--> statement-breakpoint
UPDATE "documents" SET "kind" = 'External'
WHERE "kind" = 'Extern' AND TRUE;
--> statement-breakpoint
UPDATE "documents" SET "kind" = 'Unknown'
WHERE "kind" = 'Onbekend' AND TRUE;
--> statement-breakpoint
UPDATE "tickets" SET "subject" = 'Holiday pay on termination of employment'
WHERE "subject" = 'Vakantiegeld bij uitdiensttreding' AND id = 'demo-vertrekvakantiegeld' AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "tickets" SET "question" = 'Dear SD Worx,

Our employee Thomas is leaving the company on 30 September. He is a white-collar employee and has not taken all of his holiday entitlement this year. How do we handle his departure holiday pay in the final settlement? Do we also need to provide a holiday certificate, and what information do you need from us?

Thanks in advance!
Sophie De Smet
HR Manager · Atelier Noord'
WHERE "question" = 'Beste SD Worx,

Onze medewerker Thomas verlaat het bedrijf op 30 september. Hij is bediende en heeft dit jaar nog niet al zijn vakantiedagen opgenomen. Hoe verwerken we zijn vertrekvakantiegeld in de eindafrekening? Moeten we ook een vakantieattest bezorgen, en welke gegevens hebben jullie van ons nodig?

Alvast bedankt!
Sophie De Smet
HR Manager · Atelier Noord' AND id = 'demo-vertrekvakantiegeld' AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "messages" SET "content" = 'Hi Jamie,

I found an additional checklist for the final settlement. The salary and holiday history still need to be confirmed. Please note: the old FAQ from 2021 has been superseded. Can you include this attachment in your assessment?

Regards,
Emma

Fictional colleague email for the demonstration.'
WHERE "content" = 'Dag Jamie,

Ik vond nog een aanvullende checklist voor de eindafrekening. De loon- en vakantiehistoriek moeten nog worden bevestigd. Let op: de oude FAQ uit 2021 is vervangen. Kun je deze bijlage meenemen in je beoordeling?

Groeten,
Emma

Fictieve collega-mail voor de demonstratie.' AND kind = 'email' AND author = 'Emma Peeters' AND document_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = messages.ticket_id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL));
--> statement-breakpoint
UPDATE "tickets" SET "subject" = 'Customer email with a colleague''s supplement and attachment'
WHERE "subject" = 'Klantmail met collega-aanvulling en bijlage' AND id IN ('demo-mail-met-bijlage','demo-mail-api') AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "tickets" SET "question" = 'Hi Jamie,

What information is still missing to prepare the final settlement and holiday certificate? The salary history has not yet been confirmed.

Regards,
Sophie

Fictional test case.'
WHERE "question" = 'Dag Jamie,

Welke informatie ontbreekt nog om de eindafrekening en het vakantieattest voor te bereiden? De loonhistoriek is nog niet bevestigd.

Groeten,
Sophie

Fictieve testcase.' AND id IN ('demo-mail-met-bijlage','demo-mail-api') AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "tickets" SET "subject" = 'New customer email: access to the payroll API'
WHERE "subject" = 'Nieuwe klantmail: toegang tot payroll-API' AND id IN ('demo-mail-met-bijlage','demo-mail-api') AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "tickets" SET "question" = 'Hello,

We want to connect our HR tool to the payroll API. What documentation and access do we need?

Regards,
Milan

Fictional test case.'
WHERE "question" = 'Beste,

We willen onze HR-tool koppelen aan de payroll-API. Welke documentatie en toegang hebben we nodig?

Groeten,
Milan

Fictieve testcase.' AND id IN ('demo-mail-met-bijlage','demo-mail-api') AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.ticket_id = tickets.id AND (j.state IN ('queued', 'running') OR j.result IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.ticket_id = tickets.id);
--> statement-breakpoint
UPDATE "messages" SET "content" = 'Fictional internal note: the salary history still needs to be confirmed. The attachment has been added; no AI assessment has been performed yet.'
WHERE "content" = 'Fictieve interne notitie: de loonhistoriek moet nog bevestigd worden. De bijlage is toegevoegd; er is nog geen AI-beoordeling uitgevoerd.' AND ticket_id = 'demo-mail-met-bijlage' AND kind = 'note' AND id = 'demo-mail-met-bijlage-note';
--> statement-breakpoint
UPDATE "events" SET "label" = 'Test case with email and attachment added'
WHERE "label" = 'Testcase met mail en bijlage toegevoegd' AND ticket_id = 'demo-mail-met-bijlage' AND id = 'demo-mail-met-bijlage-seeded';
--> statement-breakpoint
UPDATE "events" SET "detail" = 'Four fictional sources, a colleague email and an internal note. No AI assessment or sending has taken place.'
WHERE "detail" = 'Vier fictieve bronnen, een collega-mail en een interne notitie. Geen AI-beoordeling of verzending uitgevoerd.' AND ticket_id = 'demo-mail-met-bijlage' AND id = 'demo-mail-met-bijlage-seeded';
--> statement-breakpoint
DO $translation$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('Dit ticket bestaat niet.', 'This ticket does not exist.'),
    ('Documentonderzoek ingepland', 'Document research scheduled'),
    ('AI-concept aangevraagd', 'AI draft requested'),
    ('Antwoordreview ingepland', 'Answer review scheduled'),
    ('Klantvraag ontvangen', 'Customer question received'),
    ('Het antwoord is elders gewijzigd. Herlaad het ticket voordat je verdergaat.', 'The answer was changed elsewhere. Reload the ticket before continuing.'),
    ('De demo ondersteunt maximaal 15 documenten en 300.000 tekens per ticket.', 'The demo supports up to 15 documents and 300,000 characters per ticket.'),
    ('Extra document toegevoegd', 'Additional document added'),
    ('Het antwoord is gewijzigd. Sla de actuele tekst op en probeer opnieuw.', 'The answer has changed. Save the current text and try again.'),
    ('Wacht tot de huidige verwerking klaar is.', 'Wait for the current processing to finish.'),
    ('Laat eerst de actuele documenten beoordelen.', 'Have the current documents assessed first.'),
    ('Schrijf eerst een antwoord.', 'Write an answer first.'),
    ('Verzending gesimuleerd', 'Sending simulated'),
    (' · AI-bezwaren bewust overruled door demomedewerker', '· AI concerns manually overridden by demo employee'),
    (' · antwoord goedgekeurd', '· answer approved'),
    ('Deze review is niet afgerond of niet meer actueel.', 'This review is incomplete or no longer current.'),
    ('De verwerking is nog bezig.', 'Processing is still in progress.'),
    ('Er is geen mislukte verwerking om te herhalen.', 'There is no failed task to retry.'),
    ('Alleen het oorspronkelijke demoticket kan opnieuw worden afgespeeld.', 'Only the original demo ticket can be replayed.'),
    ('Demonstratie opnieuw gestart', 'Demonstration restarted'),
    ('Bericht-id is al gebruikt.', 'Message ID has already been used.'),
    ('Dit demoticket ondersteunt maximaal 50 berichten en 50.000 tekens.', 'This demo ticket supports up to 50 messages and 50,000 characters.'),
    ('De maximale documentruimte voor dit ticket is bereikt.', 'The maximum document capacity for this ticket has been reached.'),
    ('Bijlage toegevoegd aan het onderzoek', 'Attachment added to the research'),
    ('Alle documenten worden opnieuw beoordeeld; eerdere antwoordreviews vervallen.', 'All documents will be reassessed; previous answer reviews are no longer valid.'),
    ('Document ontvangen', 'Document received'),
    ('Betrouwbaarheid beoordelen', 'Assessing reliability'),
    ('Antwoord formuleren met Gemini', 'Writing an answer with Gemini'),
    ('Antwoord toetsen aan de bronnen', 'Checking the answer against the sources'),
    ('Klaar voor antwoord', 'Ready to answer'),
    ('Bronnen beoordeeld; onzekerheden en conflicten zijn zichtbaar.', 'Sources assessed; uncertainties and conflicts are visible.'),
    ('AI-concept gereed', 'AI draft ready'),
    ('Lees het antwoord na en pas aan waar nodig.', 'Read through the answer and edit where needed.'),
    ('Antwoordreview goedgekeurd', 'Answer review approved'),
    ('Antwoordreview vraagt aandacht', 'Answer review needs attention'),
    ('Verwerking onderbroken', 'Processing interrupted'),
    ('De verwerking is mislukt. Controleer de verbinding en probeer opnieuw.', 'Processing failed. Check the connection and try again.'),
    ('Jev is nog niet verbonden. Stel JEV_KEY in en probeer opnieuw.', 'Jev is not connected yet. Set JEV_KEY and try again.'),
    ('Jev weigert de verbinding. Controleer de JEV_KEY en TypeSafe-toegang.', 'Jev refused the connection. Check JEV_KEY and TypeSafe access.'),
    ('Jev is tijdelijk niet beschikbaar of de aanvraaglimiet is bereikt. Probeer later opnieuw.', 'Jev is temporarily unavailable or the request limit has been reached. Please try again later.'),
    ('Jev kon de documenten niet beoordelen. Controleer de modelconfiguratie en documentgrootte.', 'Jev could not assess the documents. Check the model configuration and document size.'),
    ('Jev kon geen volledige, geldige beoordeling leveren. Probeer opnieuw.', 'Jev could not return a complete, valid assessment. Please try again.'),
    ('De AI-beoordeling bevat ongeldige of ontbrekende documentverwijzingen. Probeer opnieuw.', 'The AI assessment contains invalid or missing document references. Please try again.'),
    ('Een AI-bronverwijzing kon niet worden gecontroleerd. Probeer opnieuw.', 'An AI citation could not be verified. Please try again.'),
    ('De review verwijst naar een onbekende antwoordpassage. Probeer opnieuw.', 'The review refers to an unknown answer passage. Please try again.'),
    ('De AI-review is tegenstrijdig en moet opnieuw worden uitgevoerd.', 'The AI review is contradictory and must be run again.'),
    ('De AI keurde het antwoord goed zonder controleerbaar bronbewijs. Probeer opnieuw.', 'The AI approved the answer without verifiable source evidence. Please try again.'),
    ('Gemini is nog niet verbonden. Stel de Google Cloud-verbinding in en probeer opnieuw.', 'Gemini is not connected yet. Set up the Google Cloud connection and try again.'),
    ('Beoordeel ieder document specifiek voor de klantvraag met een score 0–100 (AI-inschatting), summary, source, age, relevance en contradictions. De meegegeven jevAssessments zijn afzonderlijke modelinschattingen van relevantie, bronbetrouwbaarheid en actualiteit, geen bewijs. Licht ze toe met broninhoud en metadata en benoem afwijkingen of lage confidence expliciet. Vul zelf geen jev-veld in; de server voegt de originele metingen toe. Ontbrekende datum betekent onbekende actualiteit, niet automatisch verouderd. Bronlabels en recente datums bewijzen geen gezag. Leg per dimensie uit waarom. Onbekende metadata is een onzekerheid. Vergelijk alle documenten onderling. De huidige datum is ', 'Assess each document specifically for the customer''s question with a score of 0–100 (AI estimate), summary, source, age, relevance and contradictions. The supplied jevAssessments are separate model estimates of relevance, source reliability and freshness, not evidence. Explain them using source content and metadata, explicitly noting discrepancies or low confidence. Do not fill in the jev field yourself; the server adds the original measurements. A missing date means unknown freshness, not automatically outdated. Source labels and recent dates do not prove authority. Explain the reasoning for each dimension. Unknown metadata is an uncertainty. Compare all documents with each other. Write all explanations in English. The current date is '),
    ('Schrijf een vriendelijk bewerkbaar e-mailantwoord op de klantvraag. Gebruik de betrouwbaarste toepasselijke bronnen; gebruik de meegegeven assessments om relevantie, bronbetrouwbaarheid, actualiteit, conflicten en onzekerheid mee te wegen. Scores zijn modelinschattingen, geen bronbewijs. Behoud aandacht voor conflicterende bronnen. Benoem ontbrekende gegevens, vermeld geen verzonnen bedrag. Geef citations met bewijs. Bij een vraag buiten de bronkennis: vraag om aanvullende informatie. Onderteken met Het payrollteam. Geef geen interne scores in de klantmail.', 'Write a friendly, editable email answer in English to the customer''s question. Use the most reliable applicable sources; use the supplied assessments to weigh relevance, source reliability, freshness, conflicts and uncertainty. Scores are model estimates, not source evidence. Remain attentive to conflicting sources. Identify missing information and do not invent an amount. Provide citations with evidence. If the question is beyond the source knowledge, ask for more information. Sign off with The payroll team. Do not include internal scores in the customer email.'),
    ('Controleer het exacte klantantwoord op relevantie, onderbouwing, ontbrekende informatie en tegenspraak met de bronnen. Geef approved alleen als de inhoud voldoende onderbouwd is en geen inhoudelijke bezwaren bestaan. Geef anders changes_requested. Geef findings met letterlijke antwoordpassage (leeg bij ontbrekende inhoud), explanation en exacte broncitaten. Neem ook bij approved minstens één info-bevinding met bewijs op. Ontbrekende kennis leidt tot changes_requested; een voorzichtige vraag om ontbrekende klantgegevens kan wel passend zijn.', 'Check the exact customer answer for relevance, supporting evidence, missing information and contradictions with the sources. Return approved only if the content is sufficiently supported and there are no substantive concerns. Otherwise return changes_requested. Provide findings with the verbatim answer passage (empty for missing content), explanation in English and exact source quotes in their original language. Even when approved, include at least one info finding with evidence. Missing knowledge leads to changes_requested; a careful request for missing customer information may be appropriate.'),
    ('Gemini kon geen geldig resultaat leveren. Controleer model, regio en Google Cloud-toegang en probeer opnieuw.', 'Gemini could not return a valid result. Check the model, region and Google Cloud access, then try again.'),
    ('Onvolledige documentbeoordeling.', 'Incomplete document assessment.'),
    ('De taak kon niet worden ingepland. Controleer Cloud Tasks en probeer opnieuw.', 'The task could not be scheduled. Check Cloud Tasks and try again.')
  ) AS copy(original, english) LOOP
    UPDATE events SET label = item.english WHERE label = item.original;
    UPDATE events SET detail = item.english WHERE detail = item.original;
    UPDATE tickets SET error = item.english WHERE error = item.original;
    UPDATE jobs SET error = item.english WHERE error = item.original;
    UPDATE jobs SET dispatch_error = item.english WHERE dispatch_error = item.original;
  END LOOP;
END $translation$;
--> statement-breakpoint
UPDATE events SET detail = regexp_replace(detail, '^([0-9]+) documenten · versie ([0-9]+)$', '\1 documents · version \2') WHERE detail ~ '^[0-9]+ documenten · versie [0-9]+$';
