import PizZip from "pizzip";
import { parseAddressToParts } from "@/lib/publicListUtils";

const FONT  = "Times New Roman";
const SZ    = "20"; // 10pt — wiersze danych
const SZ_H  = "24"; // 12pt — tytuł
const SZ_SM = "18"; // 9pt  — nagłówek tabeli / metadane

// Twips na A4 POZIOMO (landscape): zamieniona szerokość/wysokość, marginesy 1134 (2 cm)
const PAGE_W   = 16838;
const PAGE_H   = 11906;
const MARGIN   = 1134;
const CONTENT_W = PAGE_W - MARGIN * 2; // 14570 twips

// Szerokości kolumn tabeli (suma = CONTENT_W = 14570)
const COL_NR     = 650;
const COL_NAZWA  = 2900;
const COL_ULICA  = 2250;
const COL_KOD    = 800;
const COL_MIASTO = 1500;
const COL_TEL    = 1500;
const COL_FAX    = 1300;
const COL_EMAIL  = 2100;
const COL_WWW    = CONTENT_W - COL_NR - COL_NAZWA - COL_ULICA - COL_KOD - COL_MIASTO - COL_TEL - COL_FAX - COL_EMAIL; // 1570

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
function tc(content, { w, b, shading } = {}) {
  const border = b
    ? `<w:tcBorders><w:bottom w:val="single" w:sz="4" w:color="000000"/></w:tcBorders>`
    : `<w:tcBorders><w:bottom w:val="single" w:sz="2" w:color="CCCCCC"/></w:tcBorders>`;
  const shade = shading
    ? `<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>`
    : "";
  return [
    "<w:tc>",
    "<w:tcPr>",
    `<w:tcW w:w="${w}" w:type="dxa"/>`,
    border, shade,
    "</w:tcPr>",
    content,
    "</w:tc>",
  ].filter(Boolean).join("");
}

const COLS = [
  { key: "nr",     label: "Nr",         w: COL_NR },
  { key: "nazwa",  label: "Nazwa",      w: COL_NAZWA },
  { key: "ulica",  label: "Ulica",      w: COL_ULICA },
  { key: "kod",    label: "Kod",        w: COL_KOD },
  { key: "miasto", label: "Miasto",     w: COL_MIASTO },
  { key: "tel",    label: "Tel.",       w: COL_TEL },
  { key: "fax",    label: "Fax",        w: COL_FAX },
  { key: "email",  label: "E-mail",     w: COL_EMAIL },
  { key: "www",    label: "Strona www", w: COL_WWW },
];

// Wiersz nagłówkowy tabeli — <w:tblHeader/> powtarza go na każdej stronie
function headerRow() {
  const cell = (text, w) =>
    tc(
      para(run(text, { b: true, sz: SZ_SM }), { before: 40, after: 40 }),
      { w, b: true, shading: true },
    );
  return [
    "<w:tr>",
    "<w:trPr><w:tblHeader/></w:trPr>",
    ...COLS.map((c) => cell(c.label, c.w)),
    "</w:tr>",
  ].join("");
}

// Wiersz danych tabeli
function dataRow(member, isLast = false) {
  const { ulica, kod, miasto } = parseAddressToParts(member.address);
  const values = {
    nr:     member.memberNumber != null ? String(member.memberNumber) : "—",
    nazwa:  member.company || "",
    ulica:  ulica || "",
    kod:    kod || "",
    miasto: miasto || "",
    tel:    member.phones || "",
    fax:    member.fax || "",
    email:  member.email || "",
    www:    member.website || "",
  };

  const opts = { before: 30, after: 30 };
  const bdr = isLast ? { b: true } : {};
  return [
    "<w:tr>",
    ...COLS.map((c) => tc(para(run(values[c.key], { sz: SZ }), opts), { w: c.w, ...bdr })),
    "</w:tr>",
  ].join("");
}

function table(rows) {
  return [
    "<w:tbl>",
    "<w:tblPr>",
    `<w:tblW w:w="${CONTENT_W}" w:type="dxa"/>`,
    "<w:tblLayout w:type=\"fixed\"/>",
    "<w:tblBorders>",
    `<w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>`,
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>`,
    `<w:insideH w:val="single" w:sz="2" w:space="0" w:color="CCCCCC"/>`,
    `<w:insideV w:val="single" w:sz="2" w:space="0" w:color="CCCCCC"/>`,
    "</w:tblBorders>",
    "</w:tblPr>",
    `<w:tblGrid>`,
    ...COLS.map((c) => `<w:gridCol w:w="${c.w}"/>`),
    `</w:tblGrid>`,
    headerRow(),
    ...rows,
    "</w:tbl>",
  ].join("");
}

/**
 * Generuje bufor DOCX z listą członków (do druku, układ jak na pisil.pl/spis-czlonkow).
 *
 * @param {Array} members - lista członków (pola: memberNumber, company, address, phones, fax, email, website)
 * @returns {Buffer} bufor DOCX
 */
export function generateMembersListDocx(members) {
  // Sortowanie alfabetyczne po nazwie firmy (polskie locale) — jak na pisil.pl
  const sorted = [...members].sort((a, b) =>
    (a.company || "").localeCompare(b.company || "", "pl"),
  );

  const today = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const ps = [];

  // Nagłówek dokumentu
  ps.push(para(run("POLSKA IZBA SPEDYCJI I LOGISTYKI", { sz: SZ_SM, color: "6B7280" }), { before: 0, after: 40 }));
  ps.push(para(run("Lista członków", { b: true, sz: SZ_H }), { before: 0, after: 40 }));
  ps.push(para(run(`Wygenerowano: ${today}  ·  Łącznie: ${sorted.length}`, { sz: SZ_SM, color: "6B7280" }), { before: 0, after: 0 }));
  ps.push(emptyLine());

  if (sorted.length === 0) {
    ps.push(para(run("Brak członków na liście.", { sz: SZ, color: "9CA3AF" }), { before: 0, after: 80 }));
  } else {
    const rows = sorted.map((m, i) => dataRow(m, i === sorted.length - 1));
    ps.push(table(rows));
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${ps.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}" w:orient="landscape"/>
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
