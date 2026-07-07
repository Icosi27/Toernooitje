# 📋 Backlog Toernooitje

## ✅ Actiepunten voor de beheerder (eenmalige setup)

- [ ] **`supabase/setup.sql` opnieuw draaien** in de Supabase SQL Editor
      (nieuwe onderdelen: `account_tournaments`, `payments`, `ad_buyouts` en de
      aangescherpte `publish_tournament` die de reclamevlag server-side afdwingt)
- [ ] **Mollie-account** aanmaken op mollie.com en de API-sleutel kopiëren
      (start met de test-sleutel om de flow gratis te testen)
- [ ] **Edge Functions deployen** (betaalkoppeling):
      ```bash
      supabase login
      supabase link --project-ref rwiztgedifbttwdbevpw
      supabase secrets set MOLLIE_API_KEY=test_xxx
      supabase functions deploy create-payment --no-verify-jwt
      supabase functions deploy payment-webhook --no-verify-jwt
      ```
- [ ] **GitHub Pages aanzetten**: repo → Settings → Pages → Source: *GitHub Actions*
      (daarna werken alle deel-/scheids-/inschrijflinks op andermans telefoon)
- [ ] **Supabase Auth Site URL** instellen op de publieke app-URL
      (Authentication → URL Configuration; anders wijzen bevestigingsmails naar localhost:3000)
- [ ] **Supabase secret key roteren** (is in een chat gedeeld; de app gebruikt hem nergens)
- [ ] **Domein/e-mail regelen** — `info@toernooitje.nl` op de website is nu een placeholder

## 🚀 Feature-backlog (uit het paneldebat en daarna)

- [ ] **Printbaar schema** (`/print/:id`): totaal, per veld en per team, met `@media print`-CSS —
      voor de wedstrijdtafel en kleedkamerdeuren
- [ ] **Dag-cockpit ("Vandaag")**: wat speelt er nú per veld, volgende ronde,
      ontbrekende uitslagen van gespeelde wedstrijden
- [ ] **JSON-back-up & herstel**: export/import incl. writeKey (nu is browserdata wissen = toegang kwijt)
- [ ] **Code splitting**: publieke routes loskoppelen van het dashboard (bundel is nu ~590 kB;
      kijkers op het sportpark verdienen ~150 kB)
- [ ] **`normalizeTournament` + persist-migrate**: defaults invullen bij oude/afwijkende data
      zodat een app-update nooit een witte pagina geeft
- [ ] **Offline-wachtrij scheidsportaal**: uitslagen lokaal bewaren bij slecht bereik en
      automatisch nasturen
- [ ] **Schema-wijzigingsbanner voor kijkers**: "jullie wedstrijd is verplaatst naar 11:40 · Veld 1"
- [ ] **Topscorers/spelersstatistieken**: doelpuntenmakers per wedstrijd (optioneel invulbaar),
      topscorerslijst op de publieke pagina
- [ ] **SVG-iconenset** voor de publieke pagina's (emoji vervangen; dashboard mag emoji houden)
- [ ] **Undo-toast** i.p.v. `confirm()` bij verwijderacties
- [ ] **Setup-checklist** in het dashboard: ① Teams → ② Indeling → ③ Schema → ④ Live
- [ ] **Meerdaagse planning**: planner verdeelt nu alles over dag 1; wedstrijddagen echt benutten
- [ ] **Inschrijfgeld innen** bij online inschrijving (zelfde Mollie-fundament als de afkoop)

## 🗑️ Bewust afgewezen (niet doen)

- Login/pincode voor scheidsrechters (de deep-link is het product)
- Native app / push-notificaties (web-link in de groepsapp dekt het)
- Drag-and-drop planbord (tabel + autoplanner + opschuifknop is sneller)
- Relationeel datamodel in Supabase (blob + scores-tabel past bij deze schaal)
- Advertenties weghalen aan de kijkerskant (verdienmodel; niemand stoorde zich eraan)
