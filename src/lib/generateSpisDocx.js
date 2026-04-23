import PizZip from "pizzip";

const FONT  = "Times New Roman";
const SZ    = "22"; // 11pt
const SZ_H  = "24"; // 12pt
const SZ_SM = "18"; // 9pt

// Twips na A4 (11906 szerokość), marginesy 1134 (2 cm) po każdej stronie
const PAGE_W   = 11906;
const MARGIN   = 1134;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9638 twips

// Szerokości kolumn tabeli (suma = CONTENT_W)
const COL_NR   = 1500;
const COL_DATA = 1200;
const COL_AUTOR = 1200;
const COL_SPRAWA = CONTENT_W - COL_NR - COL_DATA - COL_AUTOR; // 5738

function padMonth(m) { return String(m).padStart(2, "0"); }

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${String(d.getUTCDate()).padStart(2,"0")}.${padMonth(d.getUTCMonth()+1)}.${d.getUTCFullYear()}`;
  } catch { return ""; }
}

function escXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rpr({ b, sz, color } = {}) {
  return [
    "<w:rPr>",
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`,
    b ? "<w:b/><w:bCs/>" : "",
    `<w:sz w:val="${sz || SZ}"/><w:szCs w:val="${sz || SZ}"/>`,
    color ? `<w:color w:val="${color}"/>` : "",
    "</w:rPr>",
  ].filter(Boolean).join("");
}

function run(text, opts = {}) {
  return `<w:r>${rpr(opts)}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function para(content, { center, before = 0, after = 80, keepNext } = {}) {
  const jc = center ? '<w:jc w:val="center"/>' : "";
  const kn = keepNext ? "<w:keepNext/>" : "";
  return [
    "<w:p>",
    "<w:pPr>",
    kn, jc,
    `<w:spacing w:before="${before}" w:after="${after}"/>`,
    "</w:pPr>",
    content,
    "</w:p>",
  ].filter(Boolean).join("");
}

function emptyLine() {
  return para(run(" ", { sz: SZ_SM }), { before: 0, after: 0 });
}

// Komórka tabeli
function tc(content, { w, b, shading, vAlign } = {}) {
  const border = b
    ? `<w:tcBorders><w:bottom w:val="single" w:sz="4" w:color="000000"/></w:tcBorders>`
    : `<w:tcBorders><w:bottom w:val="single" w:sz="2" w:color="CCCCCC"/></w:tcBorders>`;
  const shade = shading
    ? `<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>`
    : "";
  const va = vAlign ? `<w:vAlign w:val="${vAlign}"/>` : "";
  return [
    "<w:tc>",
    "<w:tcPr>",
    `<w:tcW w:w="${w}" w:type="dxa"/>`,
    border, shade, va,
    "</w:tcPr>",
    content,
    "</w:tc>",
  ].filter(Boolean).join("");
}

// Wiersz nagłówkowy tabeli
function headerRow() {
  const cell = (text, w) =>
    tc(
      para(run(text, { b: true, sz: SZ_SM }), { before: 40, after: 40 }),
      { w, b: true, shading: true },
    );
  return [
    "<w:tr>",
    "<w:trPr><w:tblHeader/></w:trPr>",
    cell("NR", COL_NR),
    cell("DATA WYSYŁKI", COL_DATA),
    cell("SPRAWA", COL_SPRAWA),
    cell("AUTOR", COL_AUTOR),
    "</w:tr>",
  ].join("");
}

// Wiersz danych tabeli
function dataRow(comm, isLast = false) {
  const nr = comm.number != null
    ? `${comm.number}/${padMonth(comm.month)}/${comm.year}`
    : "—";
  const data = formatDate(comm.sentAt);
  const sprawa = comm.subject || comm.title || "—";
  const autor = comm.authorInitials || "—";

  const opts = { before: 30, after: 30 };
  const bdr = isLast ? { b: true } : {};
  return [
    "<w:tr>",
    tc(para(run(nr,     { sz: SZ }), opts), { w: COL_NR,    ...bdr }),
    tc(para(run(data,   { sz: SZ }), opts), { w: COL_DATA,  ...bdr }),
    tc(para(run(sprawa, { sz: SZ }), opts), { w: COL_SPRAWA,...bdr }),
    tc(para(run(autor,  { sz: SZ }), opts), { w: COL_AUTOR, ...bdr }),
    "</w:tr>",
  ].join("");
}

function table(rows) {
  return [
    "<w:tbl>",
    "<w:tblPr>",
    `<w:tblW w:w="${CONTENT_W}" w:type="dxa"/>`,
    "<w:tblBorders>",
    `<w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>`,
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>`,
    `<w:insideH w:val="single" w:sz="2" w:space="0" w:color="CCCCCC"/>`,
    "</w:tblBorders>",
    "</w:tblPr>",
    `<w:tblGrid>`,
    `<w:gridCol w:w="${COL_NR}"/>`,
    `<w:gridCol w:w="${COL_DATA}"/>`,
    `<w:gridCol w:w="${COL_SPRAWA}"/>`,
    `<w:gridCol w:w="${COL_AUTOR}"/>`,
    `</w:tblGrid>`,
    headerRow(),
    ...rows,
    "</w:tbl>",
  ].join("");
}

/**
 * Generuje bufor DOCX spisu komunikatów.
 *
 * @param {Array}  communications  - lista komunikatów (SENT + legacy + submissionComms)
 * @param {string|null} yearFilter - "2026" | "all" | null
 * @param {object} options
 * @param {object} options.oldSpisRecords - mapa { year: Communication } dla isSpis:true
 * @param {number} options.cutoffYear     - rok podziału (domyślnie 2026)
 */
export function generateSpisDocx(communications, yearFilter, options = {}) {
  const { oldSpisRecords = {}, cutoffYear = 2026 } = options;

  const yearNum = yearFilter && yearFilter !== "all" ? Number(yearFilter) : null;
  const filtered = yearNum
    ? communications.filter((c) => c.year === yearNum)
    : communications;

  const grouped = {};
  for (const c of filtered) {
    if (!grouped[c.year]) grouped[c.year] = [];
    grouped[c.year].push(c);
  }
  for (const y of Object.keys(oldSpisRecords)) {
    if (!yearNum || Number(y) === yearNum) {
      if (!grouped[y]) grouped[y] = [];
    }
  }
  for (const year in grouped) {
    grouped[year].sort((a, b) => {
      if (a.number != null && b.number != null) return a.number - b.number;
      if (a.number != null) return -1;
      if (b.number != null) return 1;
      return 0;
    });
  }

  const sortedYears = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  const title = yearNum ? `Spis komunikatów ${yearNum}` : "Spis komunikatów";
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const ps = [];

  // Nagłówek dokumentu
  ps.push(para(run("POLSKA IZBA SPEDYCJI I LOGISTYKI", { sz: SZ_SM, color: "6B7280" }), { before: 0, after: 40 }));
  ps.push(para(run(title, { b: true, sz: SZ_H }), { before: 0, after: 40 }));
  ps.push(para(run(`Wygenerowano: ${today}  ·  Łącznie: ${filtered.length} komunikatów`, { sz: SZ_SM, color: "6B7280" }), { before: 0, after: 0 }));
  ps.push(emptyLine());

  for (const year of sortedYears) {
    const comms = grouped[year];
    const oldSpis = oldSpisRecords[year];

    ps.push(para(
      run(`Rok ${year} (${comms.length})`, { b: true, sz: SZ_H }),
      { before: 80, after: 60, keepNext: true },
    ));

    // Lata archiwalne z gotowym PDF-em spisu → krótka notka
    if (year < cutoffYear && oldSpis && comms.length === 0) {
      ps.push(para(
        run(`Spis komunikatów za rok ${year} dostępny jest jako plik PDF.`, { sz: SZ, color: "374151" }),
        { before: 0, after: 80 },
      ));
      continue;
    }

    if (comms.length === 0) {
      ps.push(para(run("Brak komunikatów.", { sz: SZ, color: "9CA3AF" }), { before: 0, after: 80 }));
      continue;
    }

    const rows = comms.map((c, i) => dataRow(c, i === comms.length - 1));
    ps.push(table(rows));
    ps.push(emptyLine());
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${ps.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="${PAGE_W}" w:h="16838"/>
      <w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  return zip.generate({
    type: "nodebuffer",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
