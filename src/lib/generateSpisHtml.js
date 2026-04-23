function padMonth(m) {
  return String(m).padStart(2, "0");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Generuje HTML spisu komunikatów.
 * @param {Array} communications - lista komunikatów z bazy (isSpis:false, SENT + legacy)
 * @param {string|null} yearFilter - "2026" | "all" | null → null/all = wszystkie lata
 * @param {object} options
 * @param {object} options.oldSpisRecords - mapa { year: Communication } dla isSpis:true
 * @param {function} options.downloadUrlBuilder - (id: string) => string — buduje URL do pobrania
 * @param {function} options.attachmentDownloadUrlBuilder - (commId, aId) => string
 * @param {number} options.cutoffYear - rok podziału (domyślnie 2026)
 */
export function generateSpisHtml(communications, yearFilter, options = {}) {
  const {
    oldSpisRecords = {},
    downloadUrlBuilder = null,
    attachmentDownloadUrlBuilder = null,
    cutoffYear = 2026,
  } = options;

  const yearNum = yearFilter && yearFilter !== "all" ? Number(yearFilter) : null;
  const filtered = yearNum
    ? communications.filter((c) => c.year === yearNum)
    : communications;

  const grouped = {};
  for (const c of filtered) {
    if (!grouped[c.year]) grouped[c.year] = [];
    grouped[c.year].push(c);
  }

  // Dodaj lata, które mają tylko isSpis PDF (bez regularnych komunikatów)
  for (const y of Object.keys(oldSpisRecords)) {
    if (!yearNum || Number(y) === yearNum) {
      if (!grouped[y]) grouped[y] = [];
    }
  }

  for (const year in grouped) {
    grouped[year].sort((a, b) => {
      if (a.number != null && b.number != null) return b.number - a.number;
      if (a.number != null) return -1;
      if (b.number != null) return 1;
      return 0;
    });
  }

  const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

  const title = yearNum ? `Spis komunikatów ${yearNum}` : "Spis komunikatów";
  const dateStr = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const yearsHtml = sortedYears
    .map((year) => {
      const yn = Number(year);
      const comms = grouped[year];
      const oldSpis = oldSpisRecords[yn];

      // Rok < cutoffYear z wgranym PDF → pokaż link zamiast tabeli komunikatów
      if (yn < cutoffYear && oldSpis && downloadUrlBuilder) {
        const previewUrl = escapeHtml(`${downloadUrlBuilder(oldSpis.id)}?inline=1`);
        const dlUrl = escapeHtml(downloadUrlBuilder(oldSpis.id));
        return `<div class="year-section">
  <h2>Rok ${year}</h2>
  <p class="spis-pdf">
    Spis komunikatów za rok ${year} jest dostępny jako plik PDF:
    <a href="${previewUrl}" target="_blank">Podgląd</a>
    <span class="sep">·</span>
    <a href="${dlUrl}">Pobierz</a>
  </p>
</div>`;
      }

      // Standardowa tabela komunikatów
      const rows = comms
        .map((c) => {
          const numRaw =
            c.number != null
              ? `${c.number}/${padMonth(c.month)}/${c.year}`
              : null;
          const numLabel =
            numRaw && downloadUrlBuilder && c.filePath
              ? `<a href="${escapeHtml(downloadUrlBuilder(c.id))}" target="_blank" class="comm-link">${numRaw}&nbsp;&#8599;</a>`
              : (numRaw ?? "—");
          const sprawa = escapeHtml(c.subject || c.title || "");
          const data = formatDate(c.sentAt);
          const autor = escapeHtml(c.authorInitials || "");

          let attachCell = "<td></td>";
          if (
            attachmentDownloadUrlBuilder &&
            c.attachments &&
            c.attachments.length > 0
          ) {
            const links = c.attachments
              .map(
                (att) =>
                  `<a href="${escapeHtml(attachmentDownloadUrlBuilder(c.id, att.id))}">${escapeHtml(att.fileName)}</a>`,
              )
              .join("<br>");
            attachCell = `<td class="attachments">${links}</td>`;
          }

          return `<tr>
  <td class="nr">${numLabel}</td>
  <td class="date">${data}</td>
  <td class="title">${sprawa}</td>
  ${attachCell}
  <td class="author">${autor}</td>
</tr>`;
        })
        .join("");

      return `<div class="year-section">
  <h2>Rok ${year} <span class="count">(${comms.length})</span></h2>
  <table>
    <thead>
      <tr>
        <th class="nr">Nr</th>
        <th class="date">Data wysyłki</th>
        <th class="title">Sprawa</th>
        <th class="attachments">Załączniki</th>
        <th class="author">Autor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:24px 40px}
    .header{margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #005698}
    .org{font-size:11px;color:#6b7280;margin-bottom:2px}
    h1{font-size:17px;font-weight:700;color:#005698;margin-bottom:4px}
    .meta{font-size:11px;color:#6b7280}
    .year-section{margin-bottom:24px}
    h2{font-size:13px;font-weight:700;color:#005698;padding-bottom:4px;border-bottom:1px solid #e5e7eb;margin-bottom:6px}
    .count{font-weight:400;color:#9ca3af}
    table{width:100%;border-collapse:collapse}
    th,td{text-align:left;padding:4px 6px;line-height:1.5;border-bottom:1px solid #f3f4f6}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb}
    .nr{width:80px;white-space:nowrap;font-weight:600;color:#005698}
    .comm-link{color:#005698;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;white-space:nowrap}
    .comm-link:hover{text-decoration-style:solid}
    .date{width:90px;white-space:nowrap;color:#6b7280}
    .title{flex:1}
    .author{width:48px;text-align:center;color:#6b7280}
    tr:last-child td{border-bottom:none}
    .no-data{color:#9ca3af;font-style:italic;margin-top:12px}
    .spis-pdf{color:#374151;font-size:12px;padding:6px 0}
    .spis-pdf a{color:#005698;text-decoration:none;font-weight:600}
    .spis-pdf a:hover{text-decoration:underline}
    .spis-pdf .sep{margin:0 6px;color:#d1d5db}
    .attachments{color:#6b7280;font-size:11px}
    .attachments a{color:#005698;text-decoration:none;display:block}
    .attachments a:hover{text-decoration:underline}
    @media print{
      body{padding:10mm 15mm;font-size:11px}
      .year-section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">Polska Izba Spedycji i Logistyki</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Wygenerowano: ${dateStr}&nbsp;&nbsp;·&nbsp;&nbsp;Łącznie: ${filtered.length} komunikatów</div>
  </div>
  ${yearsHtml || '<p class="no-data">Brak komunikatów.</p>'}
</body>
</html>`;
}
