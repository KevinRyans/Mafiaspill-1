# Mafiaspill: Crypto Versjon

Et moderne, tekstbasert MMO-inspirert crime-RPG med "crypto noir" og økokrim-tema. Alt er 100% fiktivt og abstrahert. Ingen steg-for-steg eller realistiske metoder for ekte kriminalitet.

## Funksjoner (utvidet)
- Alltid noe å gjøre: oppdrag, daglige/ukentlige utfordringer, world events, markeder, passive handlinger.
- Progresjon: respektpoeng, forsvar/liv, energi, heat og notoritet.
- Respektmarked: kjøp respekt, compliance og livvakter (forsvar).
- Kontakter og nettverk: tillit/lojalitet, fordeler, risiko for svik.
- Verdensstatus: norske byer med kontrollnivå, politisk trykk og økonomisk temperatur.
- Marked og økonomi: USD + token, auksjoner, kjøpsønsker, prisvariasjon, sink/tax.
- Bank: innskudd, uttak og overføring (USD).
- Familie/crew: ranks, bank, crew-chat (WebSockets).
- Firmaer: opprett, oppgrader og hent passiv inntekt.
- PvP-kamp (tekstbasert, tur-basert) med nedkjøling.
- Nedkjempet-status: når forsvar går til 0 blir spilleren satt ut av spill midlertidig.
- Pengespill: kast mynt, blackjack, hesteløp, lotto + topplister og limit.
- Mørkenett: kontrakter, sikker betaling (escrow), tvister og rykte.
- Adminpanel (skjult rute), RBAC, audit-logg, ban/mute, item-spawn, event-kontroll.
- Sikkerhet: rate limiting, CSRF for refresh/logout, input-validering, anti-bot header, server-authoritative actions.

## Teknologistack
- Backend: Node.js + TypeScript + Fastify (Express-adapter)
- DB: PostgreSQL + Prisma
- Auth: JWT + refresh tokens + bcrypt
- Frontend: Vite + React + TypeScript + Tailwind
- Realtime: Socket.IO

## Monorepo
- `apps/api` - API + sockets + scheduler
- `apps/web` - React UI + adminpanel (skjult rute)
- `packages/shared` - felles domenelogikk (energi, kamp, marked)

## Lokal oppstart (Windows)
1. Installer avhengigheter (en gang):
```
npm install --legacy-peer-deps
```
Hvis du har nyere npm kan vanlig `npm install` fungere.

2. Kopier miljøfiler:
```
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

3. Start databasen (Docker):
```
docker compose up -d db redis
```

4. Kjør migrasjoner og seed:
```
npm run db:generate
npm run db:migrate
npm run db:seed
```
Hvis `npm run db:migrate` feiler pga. workspaces, bruk:
```
npm --prefix apps/api run db:generate
npm --prefix apps/api run db:migrate
npm --prefix apps/api run db:seed
```

5. Start alt:
```
npm run dev
```

Web: `http://localhost:5173`
API: `http://localhost:4000/health`

## Feilsøking
- Ser du rare tegn (f.eks. `Kjøp`)? Restart web/API først. Hvis det fortsatt skjer, kjør `npm run db:seed` (resetter demo-data).
- Får du `EPERM` på `prisma generate`, stopp API-serveren og kjør `npm run db:generate` igjen.
- UTF-8 sjekk: `http://localhost:4000/utf8` (API) og `http://localhost:5173/utf8-test` (UI).
- Hvis Vite går på port `5174`, legg den til i `CORS_ORIGIN` (f.eks. `http://localhost:5173,http://localhost:5174`) og restart API.

## Gameplay-notater (kort)
- Sjanse (kriminalitet): `baseChance + XP-bonus - heat/10`, der XP-bonus skalerer med krim-XP og vanskefaktor.
- Sjanse (ran spiller): `60% + XP-bonus - forsvarspenalty - heat/10`.
- Heat per by øker risiko og fengsels-sjanse. Oppdrag bruker `baseRisk + heat/10`.
- Reisepris skalerer med antall reiser: `basePrice * (1 + min(0.5, travelCount * 0.005))`. Cooldown = 1 time.

## Demo-brukere (seed)
- Admin: `admin@mafiaspill.local` / `ChangeMe123!`
- Spiller: `runner@mafiaspill.local` / `ChangeMe123!`

## Adminpanel (skjult)
- Rute: `http://localhost:5173/admin` (kan endres i `.env`)
- Ikke lenket i UI, blokkert i `robots.txt`.
- RBAC: `admin`, `mod`, `support`.
- API-ende: `/${ADMIN_ROUTE_PATH}`.

## Viktige .env-variabler
### API (`apps/api/.env`)
- `DATABASE_URL` - Postgres URL
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (min 10 tegn)
- `ADMIN_ROUTE_PATH` - skjult admin-rute (match med web)
- `ADMIN_IP_ALLOWLIST` - kommaseparert allowlist for admin (valgfritt)
- `PROOF_OF_WORK_SECRET` - anti-bot placeholder
- `RATE_LIMIT_ENABLED` - sett til `false` lokalt for å deaktivere rate limiting

### Web (`apps/web/.env`)
- `VITE_API_URL` - API base URL
- `VITE_WS_URL` - Socket.IO URL
- `VITE_ADMIN_ROUTE` - admin-rute (kun path, uten slash)
- `VITE_HUMAN_PROOF` - må matche `PROOF_OF_WORK_SECRET`

## API-oversikt (REST)
- `POST /auth/register` - registrering (mock verifikasjonstoken)
- `POST /auth/login` - innlogging (+ valgfri 2FA)
- `POST /auth/refresh` - refresh token (CSRF)
- `POST /auth/logout` - logout (CSRF)
- `POST /auth/verify-email` - mock epost-verifisering
- `POST /auth/request-password-reset` - mock reset-token
- `POST /auth/reset-password` - reset passord
- `POST /auth/2fa/setup` - genererer TOTP secret
- `POST /auth/2fa/verify` - aktiverer 2FA

- `GET /profile/me` - stats + inventory + achievements
- `PATCH /profile/me` - oppdater profil

- `GET /missions` - liste oppdrag
- `POST /missions/run` - start oppdrag
- `GET /missions/challenges` - daily/weekly

- `GET /respect` - respektpoeng + fordeler
- `POST /respect/purchase` - kjøp fordel
- `GET /benefits` - respektmarked (compliance/livvakter/respekt)
- `POST /benefits/buy` - kjøp markedspakke

- `GET /business` - dine firmaer
- `POST /business/create` - opprett firma
- `POST /business/collect` - hent inntekt
- `POST /business/upgrade` - oppgrader firma

- `GET /combat/targets` - spillere som kan angripes

- `GET /market/listings` - aktive listings
- `GET /market/orders` - egne kjøpsønsker
- `POST /market/orders` - legg inn kjøpsønske
- `GET /market/price/:itemId` - dynamisk pris
- `POST /market/listings` - legg ut item
- `POST /market/buy/:listingId` - kjøp listing

- `GET /bank` - bankstatus
- `POST /bank/deposit` - innskudd
- `POST /bank/withdraw` - uttak
- `POST /bank/transfer` - overfør til spiller

- `GET /travel/cities` - byer + status
- `POST /travel/start` - start reise
- `POST /travel/arrive` - sjekk ankomst

- `GET /gambling/games` - spilloversikt
- `GET /gambling/limits` - limit/forbruk
- `POST /gambling/coinflip` / `/blackjack` / `/race` / `/lotto`
- `GET /gambling/leaderboard`

- `GET /darknet/contracts` - kontrakter
- `POST /darknet/contracts` - opprett kontrakt
- `POST /darknet/contracts/:id/accept` - ta kontrakt
- `POST /darknet/contracts/:id/progress` - send progresjon
- `POST /darknet/contracts/:id/claim` - hent betaling
- `GET /darknet/escrow` - sikker betaling
- `POST /darknet/disputes` - opprett tvist
- `GET /darknet/reputation/:userId` - rykte

- `GET /prison/inmates` - liste innsatte
- `POST /prison/break` - forsøk å bryte ut innsatt

- `GET /crew` - crew/eller liste
- `POST /crew` - opprett crew
- `POST /crew/join/:crewId` - bli med
- `POST /crew/bank/deposit` / `/withdraw`
- `GET /crew/chat` / `POST /crew/chat`

- `GET /contacts` - katalog og relasjoner
- `POST /contacts/link` - opprett kontakt
- `POST /contacts/boost` - bygg relasjon
- `POST /contacts/abuse` - press kontakt

- `GET /passive/actions` - passive handlinger
- `POST /passive/start`
- `POST /passive/claim`

- `GET /notifications` - list varsler
- `GET /notifications/unread` - unread count
- `POST /notifications/read`

- `POST /combat/pvp` - tur-basert PvP kamp
- `GET /combat/:combatId` - hent kamp

- `GET /world/events` - aktive events
- `GET /world/state` - byer og world state
- `GET /world/feed` - nyhetsfeed
- `GET /utf8` - UTF-8 teststreng

- Admin: `GET /{ADMIN_ROUTE_PATH}/users`, `POST /ban`, `POST /items/spawn`, `POST /world-events`, `POST /schedule`, `GET /audit`, `GET /world-state`, `PATCH /world-state/:cityId`, `GET /disputes`

## Testing
```
npm test
```
Kjører grunnleggende unit-tester (auth utils, market, kontrakter, gambling).

## Deploy (produksjon)
1. Sett environment-variabler for API og Web.
2. Bygg:
```
npm run build
```
3. Kjør API:
```
node apps/api/dist/server.js
```
4. Host `apps/web/dist` som statisk (Nginx, Vercel, Netlify osv.).
5. Konfigurer reverse proxy for `VITE_API_URL` og WebSocket.

## Sikkerhet og etikk
- Alt er fiktivt og abstrahert.
- Ingen ekte kriminalitet, hacking, svindel eller hvitvasking.
- Gameplay er bygget på risikoscore, compliance-meter og fiktive parametre.

---
Laget for å gi en "alltid noe å gjøre"-opplevelse i en trygg, satirisk setting.

