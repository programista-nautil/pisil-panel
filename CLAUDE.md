# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Komunikacja

Rozmawiaj z użytkownikiem po polsku. Wszystkie wiadomości tekstowe, podsumowania i pytania kieruj w języku polskim. Kod, nazwy zmiennych i commity zostawiaj w takiej konwencji, jaka już jest w repozytorium (komentarze i stringi UI — po polsku).

## Project

PISiL Panel — platform for Polska Izba Spedycji i Logistyki (Polish Chamber of Forwarding and Logistics). Handles four online forms (Deklaracja Członkowska, Patronat, Ankieta Spedytor Roku, Młody Spedytor Roku), generates PDFs, accepts signed uploads, and provides admin + member panels for managing submissions, generated documents, communications, and files. UI strings, DB comments, and commit messages are in Polish — keep new ones in Polish too.

## Common commands

```bash
npm run dev        # next dev (port 3000)
npm run build
npm run start      # production; pm2 uses ecosystem.config.js which binds to PORT=3019
npm run lint
npm test           # jest (jsdom), tests live next to source, e.g. src/lib/*.test.js

# Prisma
npx prisma migrate dev --name <name>
npx prisma migrate deploy
npx prisma generate
npx prisma db seed    # runs prisma/seed.js

# Local postgres (port 5433 -> container 5432, user/pass pisil/pisil123, db pisil_db)
docker compose up -d

# Run email worker standalone (needs Redis)
node workers/email-worker.js

# Production (PM2) — starts `pisil-app` and `pisil-worker`
pm2 start ecosystem.config.js
```

Run a single Jest test: `npx jest src/lib/AttachmentUpload.test.js` or filter by name with `-t "pattern"`.

## Architecture

### Stack
Next.js 16 App Router + React 19, Tailwind v4, NextAuth v5 (beta) with JWT sessions, Prisma + PostgreSQL, BullMQ + Redis, Google Cloud Storage for file storage, Nodemailer (Gmail SMTP), docxtemplater for Word template rendering, LibreOffice headless for DOCX→PDF, pdf-lib for signature validation, jsPDF + html2canvas for client-side PDF generation. Path alias `@/*` → `src/*`.

### Two-role auth (admin, member)
`src/auth.js` defines two `CredentialsProvider` instances:
- `admin-credentials` — hardcoded check against `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars (no DB row for admin).
- `member-credentials` — looks up `Member` by email, bcrypt-compares password.

JWT carries `role`, `id`, `mustChangePassword`. Authorization rules live in `auth.config.js` `callbacks.authorized` — it gates `/admin/*` (role=admin) and `/member/*` (role=member), with redirects to `/unauthorized` on role mismatch. Edge middleware file is **`src/proxy.js`** (unusual name — Next.js picks it up via the `matcher` config export; don't rename to `middleware.js` without updating references).

### "Pretty URL" rewrites
`next.config.mjs` rewrites user-facing Polish URLs to real app-router paths. The same rewritten paths must also be listed in `src/proxy.js` matcher and handled in `auth.config.js`. When adding a new protected page, update all three:
- `/panel-admina` → `/admin/dashboard`
- `/panel-czlonka` → `/member/dashboard`
- `/logowanie-admin` → `/login`, `/logowanie-czlonka` → `/member/login`
- `/zmiana-hasla` → `/member/reset-password`
- `/formularz/:path*` → `/forms/:path*`

### Submission lifecycle
`Submission` (see `prisma/schema.prisma`) has `status: PENDING | APPROVED | REJECTED | ACCEPTED` and `formType: DEKLARACJA_CZLONKOWSKA | PATRONAT | ANKIETA_SPEDYTOR_ROKU | MLODY_SPEDYTOR_ROKU`.

Flow:
1. Public user fills multi-step form (`src/components/MultiStepForm.js` + form-specific `formConfig.js` under `src/app/forms/<slug>/`). Draft auto-saves to a cookie named `formSession_<formSlug>`.
2. Client generates PDF (`DeklaracjaPDFGenerator` etc.) and uploads signed version via `POST /api/upload`, which validates signature field presence with `pdf-lib`, uploads to GCS, and creates `Submission` row.
3. Admin reviews in `/admin/dashboard`. Status transitions go through dedicated endpoints under `src/app/api/admin/submissions/[id]/{accept,reject,status,archive}`.
4. Accepting a `DEKLARACJA_CZLONKOWSKA` runs `src/lib/services/acceptanceService.js` — computes next `acceptanceNumber` (max of `Submission.acceptanceNumber` and `Member.memberNumber` + 1), creates/updates the `Member` row (default temp password `2015pisil` with `mustChangePassword=true`), renders three DOCX templates from `private/document-templates/` (`pismo zaśw. przyjęcie.docx`, `pismo w sprawie składek.docx`, `zasw.docx`), optionally converts to PDF (see below), saves each as an `Attachment` (source=`GENERATED`) in GCS, emails them to the member bundled with a static ZIP from `private/acceptance-documents/`, and updates `src/config/mailingList.json` + `publicMembersList.json`.

### DOCX → PDF conversion
`src/lib/services/docxToPdfService.js` shells out to `libreoffice --headless --convert-to pdf`. It only runs when `NODE_ENV=production` OR `ENABLE_PDF_CONVERSION=true`. On failure it falls back to sending the DOCX untouched — don't throw; log and continue, this is intentional.

### File storage (GCS)
All user-uploaded and generated files live in Google Cloud Storage, **not** the local filesystem. `src/lib/gcs.js` has `uploadFileToGCS`, `downloadFileFromGCS`, `deleteFileFromGCS`. `GCS_CREDENTIALS` env var holds the full JSON service account key. The DB stores a GCS path (not a public URL); `deleteFileFromGCS` strips a legacy `https://storage.googleapis.com/<bucket>/` prefix defensively.

Routes that serve files to browsers stream them through `/download` sub-routes (e.g. `api/admin/submissions/[id]/attachments/[attachmentId]/download`) — they download from GCS and pipe to the response. Do not generate public URLs.

### Background jobs (BullMQ)
`src/lib/queue.js` exposes `emailQueue`. `workers/email-worker.js` is a **separate Node process** (not a Next.js route) run by PM2. It handles `notify-members` jobs — bulk sending of a generated communication DOCX to every address in `src/config/mailingList.json`, in batches of 20 with 5s delays, followed by a report email to the admin. When changing job payload shape, update both the producer (inside `/api/admin/submissions/[id]/...` or communications routes) and this worker — they share the queue name `email-queue` via Redis (`REDIS_HOST`/`REDIS_PORT`).

### JSON configs as editable state
`src/config/mailingList.json` and `src/config/publicMembersList.json` are **runtime-mutated** state (both gitignored). Kept in the repo tree for easy deployment path. Mutated by:
- `src/lib/mailingListUtils.js#syncMailingList` — diff old vs new comma-separated `notificationEmails` strings.
- `src/lib/publicListUtils.js#addToPublicList` / `removeFromPublicList` — maintains the public member directory, parses the free-form `address` into `Ulica`/`Kod`/`Miasto` via a zip-code regex.

Never hand-edit these in production; go through the util functions so the `.json` structure stays consistent.

### Email
Single shared SMTP config (Gmail, `SMTP_USER`/`SMTP_PASS`). Different functional mailboxes route via env vars: `DEKLARACJE_EMAIL` (Pani Teresa), `PATRONATY_EMAIL` (Pan Czesław), `ADMIN_EMAIL` (default). Form-type routes its admin copy to the matching mailbox in `src/app/api/upload/route.js`.

### Private assets
`private/` (gitignored) contains DOCX templates and static acceptance attachments. Anything the app reads via `path.join(process.cwd(), 'private', ...)` must be deployed alongside the code — it is not in git.

## Konwencje API (po refaktorze kwiecień 2026)

Struktura `src/app/api/` została uporządkowana. Nowe konwencje:

- **`/api/public/*`** — bez wymaganej sesji (formularze publiczne, reset hasła, lista członków z CORS). Tutaj: `submissions` (POST = wgranie deklaracji/patronatu), `submissions/survey` (POST), `submissions/[id]/attachments` (POST = dodatkowe dokumenty), `forgot-password`, `reset-password`, `members-list` (CORS `*` dla pisil.pl).
- **`/api/admin/*`** — wymaga sesji (rola `admin`).
- **`/api/member/*`** — wymaga sesji (rola `member`); logika kontroli własności (np. `memberId === submission.memberId`).
- **`/api/auth/[...nextauth]`** — NextAuth, nie ruszać.

Submissions — REST + sub-ścieżka `actions/` dla operacji złożonych:
- `PATCH /api/admin/submissions/[id]` — body `{status?, isArchived?}`. Jedyny sposób na prostą zmianę pola. (Stare `/status` i `/archive` to re-eksport tego handlera.)
- `POST /api/admin/submissions/[id]/actions/accept` — generuje dokumenty + tworzy Member + email.
- `POST /api/admin/submissions/[id]/actions/reject` — status REJECTED + email.
- `POST /api/admin/submissions/[id]/actions/send-verification-email` — masowy email.
- `POST /api/admin/submissions/[id]/actions/send-patronage-{verification,acceptance}` — maile patronatowe.

Pliki statyczne pod `/api/member/resources/[category]/[filename]`:
- kategorie w `CATEGORIES` w `route.js`: `newsletter` (`private/newsletter-list/`), `reports` (`private/reports-list/`), `acceptance` (`private/acceptance-documents/` + whitelist `STATIC_ACCEPTANCE_DOCUMENTS`, wymaga roli `member`).
- Path traversal odrzucany przez `path.basename`; whitelist kategorii zabezpiecza przed nieznanymi folderami.

Stare ścieżki **nadal istnieją jako re-eksporty** (okres przejściowy ~7 dni monitoringu logów przed usunięciem):
- `/api/upload` → `/api/public/submissions`
- `/api/submit-survey` → `/api/public/submissions/survey`
- `/api/submissions/[id]/attachments` → `/api/public/submissions/[id]/attachments`
- `/api/member/{forgot,reset}-password` → `/api/public/{forgot,reset}-password`
- `/api/admin/submissions/[id]/{accept,reject,send-*}` → `/actions/*`
- `/api/admin/submissions/[id]/{status,archive}` → `PATCH /api/admin/submissions/[id]`
- `/api/admin/member-files/[id]*` → `/api/admin/members/files/[id]*`
- `/api/member/member-files/[id]/download` → `/api/member/members/files/[id]/download`
- `/api/member/files` → `/api/member/dashboard`
- `/api/member/{newsletter,reports,static-document}/*` → `/api/member/resources/{newsletter,reports,acceptance}/*`

Gdy dodajesz nowy endpoint — trzymaj się konwencji. Re-export pattern:
```js
// src/app/api/public/forgot-password/route.js
export { POST } from '@/app/api/member/forgot-password/route'
```

Parametry dynamiczne: `[id]` (cuid/UUID w DB), `[filename]` (nazwa pliku). Wyjątek `[attachmentId]` w `/submissions/[id]/attachments/[attachmentId]` — nie zmieniamy, bo kolidowałby z `[id]` w tej samej ścieżce.

## Deploy na VPS

Produkcja stoi na VPSie (Ubuntu + PM2). Dostęp SSH — dane u właściciela projektu (NIE commitować do repo, jest publiczne).

**Przed wykonaniem deploya: ZAWSZE otwórz lokalny plik `.deploy-notes.md`** (gitignore) — zawiera pełne komendy z hostem, userem, ścieżką, ID procesów PM2. W CLAUDE.md jest tylko schemat bez sekretów.

Procesy PM2:
- `pisil-app` — Next.js `next start` na porcie 3019
- `pisil-worker` — BullMQ worker (`workers/email-worker.js`)

Standardowa procedura deployu (po `git push origin master` z localki):

```bash
ssh <user>@<vps-host>
cd ~/apps/pisil-panel
git pull
npm install              # pomijalne jeśli package.json bez zmian
npx prisma migrate deploy # TYLKO jeśli są nowe migracje (prisma/migrations)
npm run build
pm2 restart pisil-app
pm2 logs pisil-app --lines 20 --nostream   # sanity check
```

Jedną linią (non-interactive, dobra do automatyzacji — jeśli build się wywali, `pm2 restart` się nie uruchomi, apka dalej działa na poprzednim `.next/`):

```bash
ssh <user>@<vps-host> "cd ~/apps/pisil-panel && git pull && npm install && npm run build && pm2 restart pisil-app"
```

**`pisil-worker` restartuj tylko** gdy zmieniłeś `workers/email-worker.js`, `src/lib/queue.js`, albo jego bezpośrednie zależności. Worker nie czyta `.next/`, nie zyska nic na restarcie aplikacji.

**Migracje Prismy** — tylko gdy w PR jest nowy katalog w `prisma/migrations/`. Zmiana samego `schema.prisma` bez migracji nie wymaga `migrate deploy`. Jeśli generujesz migrację lokalnie przez `prisma migrate dev`, nie zapomnij jej zacommitować przed pushem — inaczej VPS nie ma co zaaplikować.

**Sanity check po deployu**: w `pm2 logs pisil-app` musi pojawić się `✓ Ready in <N>ms`. Ostrzeżenia `Failed to find Server Action "x"` to niegroźny artefakt — ktoś ma starą kartę z nieaktualnymi hash'ami Server Actions i odświeży ją sam.

**Rollback** w razie awarii: `cd ~/apps/pisil-panel && git reset --hard HEAD~1 && npm run build && pm2 restart pisil-app`. Jeśli HEAD~1 miał migrację — trzeba ją cofnąć ręcznie w DB, Prisma nie ma automatycznego downgrade.

## Gotchas

- When you add a `Submission` field, also update `acceptanceService.js` (member upsert) and any admin modal (`AddSubmissionModal.js`, `EditMemberModal.js`) — there is no shared schema-to-form generator.
- `Member.mustChangePassword` gates the member panel via a modal; setting a password via admin usually means also setting this to `true`.
- `acceptanceNumber` and `memberNumber` share a numbering sequence (see computation in `acceptanceService.js`) — never assign one without consulting the other's max.
- The `authorize` callback in `src/auth.js` for members has verbose `console.log` statements retained intentionally for debugging production login issues. Leave them unless the user asks otherwise.
- Toasts use `react-hot-toast` globally configured in `src/app/layout.js` (note the typo `botttom-right` — harmless, falls back to default).
- Session maxAge is 30 minutes; `AutoLogout` component enforces it client-side.
