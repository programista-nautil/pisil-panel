function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

function formatDateLong(date) {
  const d = new Date(date);
  return `${d.getUTCDate()} ${MONTHS_PL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const DISCLAIMER =
  "Niniejszy Komunikat przeznaczony jest wyłącznie dla członków Polskiej Izby " +
  "Spedycji i Logistyki. Jego treść nie stanowi wiążącej interpretacji przepisów " +
  "prawa, nie jest opinią prawną ani zaleceniem stosowania informacji w nim " +
  "zawartych, lecz jest wyrazem spełnienia przez Izbę obowiązku informowania " +
  "członków o zaistniałych wydarzeniach czy funkcjonujących stanowiskach w " +
  "sprawach dotyczących Izby i jej członków. Zastosowanie się do treści Komunikatu, " +
  "jego przetwarzanie oraz przekazywanie innym odbiorcom, w tym niezrzeszonym w " +
  "PISiL, odbywać się może wyłącznie na ryzyko i odpowiedzialność osób, które tego dokonują.\"";

function renderBody(body) {
  if (!body) return "";
  // Nowe rekordy — zawierają HTML z edytora (b/i/u/div/br)
  if (/<[a-zA-Z]/.test(body)) return body;
  // Stare rekordy — plain text, zamieniamy \n na <br>
  return escapeHtml(body).replace(/\n/g, "<br>");
}

/**
 * Buduje HTML dokumentu komunikatu wewnętrznego wg wzoru PISiL.
 *
 * @param {object} comm - rekord Communication (z opcjonalnymi polami autora i attachments[])
 * @param {string} [numLabel] - numer w formacie "X/MM/RRRR"; gdy pominięty, budowany z comm.number/month/year
 */
export function buildCommunicationHtml(comm, numLabel) {
  const dateStr = comm.sentAt ? formatDateLong(comm.sentAt) : "";

  const resolvedNumLabel = numLabel ?? (
    comm.number != null
      ? `${comm.number}/${String(comm.month).padStart(2, "0")}/${comm.year}`
      : (comm.title || "")
  );

  const attachmentsHtml = (comm.attachments ?? [])
    .map((a) => {
      const nameWithoutExt = a.fileName.replace(/\.[^.]+$/, "");
      return `<div class="attachment">Zał. ${escapeHtml(nameWithoutExt)}</div>`;
    })
    .join("\n");

  const label    = escapeHtml(comm.authorLabel    || "Przygotowała:");
  const name     = escapeHtml(comm.authorName     || "");
  const position = escapeHtml(comm.authorPosition || "");

  const authorHtml = (comm.authorName || comm.authorPosition)
    ? `<div class="author-block">
        <div>${label}</div>
        ${comm.authorName     ? `<div>${name}</div>`     : ""}
        ${comm.authorPosition ? `<div>${position}</div>` : ""}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Komunikat ${escapeHtml(resolvedNumLabel)}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      max-width: 700px;
      margin: 40px auto;
      padding: 0 32px;
      color: #111;
      line-height: 1.6;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .doc-type {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .doc-number {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .doc-subject {
      font-size: 11pt;
      font-weight: bold;
    }
    .greeting {
      font-weight: bold;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .body-text {
      text-align: justify;
      line-height: 1.7;
      margin-bottom: 20px;
    }
    .body-text div, .body-text p { margin: 0; }
    .attachments {
      margin-top: 20px;
      line-height: 2;
    }
    .author-block {
      margin-top: 32px;
      font-style: italic;
      line-height: 1.8;
    }
    hr.legal-sep {
      border: none;
      border-top: 1px solid #999;
      margin: 40px 0 12px;
    }
    .disclaimer {
      font-size: 8pt;
      color: #555;
      line-height: 1.5;
      text-align: justify;
    }
    @media print {
      body { margin: 20mm; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="doc-header">
    <div class="doc-type">Komunikat Wewnętrzny</div>
    <div class="doc-number">NR ${escapeHtml(resolvedNumLabel)}${dateStr ? ` z dnia ${escapeHtml(dateStr)}` : ""}</div>
    ${comm.subject ? `<div class="doc-subject">Ws. ${escapeHtml(comm.subject)}</div>` : ""}
  </div>

  <div class="greeting">Członkowie Polskiej Izby Spedycji i Logistyki,</div>

  <div class="body-text">${renderBody(comm.body)}</div>

  ${attachmentsHtml ? `<div class="attachments">${attachmentsHtml}</div>` : ""}

  ${authorHtml}

  <hr class="legal-sep">
  <div class="disclaimer">${DISCLAIMER}</div>

</body>
</html>`;
}
