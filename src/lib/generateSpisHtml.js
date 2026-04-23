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
    forPrint = false,
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
          const commUrl = c.downloadUrl || (downloadUrlBuilder && c.filePath ? downloadUrlBuilder(c.id) : null);
          const numLabel =
            numRaw && commUrl
              ? `<a href="${escapeHtml(commUrl)}" target="_blank" class="comm-link">${numRaw}&nbsp;&#8599;</a>`
              : (numRaw ?? "—");
          const sprawa = escapeHtml(c.subject || c.title || "");
          const data = formatDate(c.sentAt);
          const autor = escapeHtml(c.authorInitials || "—");

          let attachCell = "<td>—</td>";
          if (c.attachments && c.attachments.length > 0) {
            const links = c.attachments
              .map((att) => {
                const url = att.downloadUrl ||
                  (attachmentDownloadUrlBuilder ? attachmentDownloadUrlBuilder(c.id, att.id) : null);
                return url
                  ? `<a href="${escapeHtml(url)}">${escapeHtml(att.fileName)}</a>`
                  : escapeHtml(att.fileName);
              })
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

  const screenCss = `
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
    .date{width:90px;white-space:nowrap;color:#6b7280}
    .author{width:48px;text-align:center;color:#6b7280}
    tr:last-child td{border-bottom:none}
    .no-data{color:#9ca3af;font-style:italic;margin-top:12px}
    .spis-pdf{color:#374151;font-size:12px;padding:6px 0}
    .spis-pdf a{color:#005698;text-decoration:none;font-weight:600}
    .spis-pdf .sep{margin:0 6px;color:#d1d5db}
    .attachments{color:#6b7280;font-size:11px}
    .attachments a{color:#005698;text-decoration:none;display:block}`;

  // CSS dla LibreOffice — bez @page (powoduje pustą str. 1), marginesy na body
  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',Times,serif;font-size:11pt;color:#000;background:#fff;margin:15mm 20mm}
    .header{margin-bottom:10pt;padding-bottom:4pt;border-bottom:1.5pt solid #000}
    .org{font-size:9pt;color:#444;margin-bottom:2pt}
    h1{font-size:13pt;font-weight:bold;margin-bottom:2pt}
    .meta{font-size:9pt;color:#444}
    .year-section{margin-bottom:12pt}
    h2{font-size:11pt;font-weight:bold;border-bottom:0.75pt solid #000;padding-bottom:2pt;margin-bottom:3pt}
    .count{font-weight:normal}
    table{width:100%;border-collapse:collapse;font-size:10pt}
    th{font-size:8pt;font-weight:bold;text-transform:uppercase;border-top:0.75pt solid #000;border-bottom:0.75pt solid #000;padding:1pt 3pt;text-align:left}
    td{padding:1pt 3pt;text-align:left;border-bottom:0.5pt solid #ccc;vertical-align:top}
    .nr{width:80pt;white-space:nowrap;font-weight:bold}
    .comm-link{color:#000;text-decoration:underline}
    .date{width:56pt;white-space:nowrap}
    .author{width:30pt;text-align:center}
    .attachments{width:85pt;font-size:9pt}
    .no-data{font-style:italic;margin-top:6pt}
    .spis-pdf{font-size:10pt;padding:3pt 0}
    a{color:#000;text-decoration:underline}`;

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${forPrint ? printCss : screenCss}</style>
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
