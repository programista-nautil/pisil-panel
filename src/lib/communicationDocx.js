import PizZip from "pizzip";

const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

function formatDateLong(date) {
  const d = new Date(date);
  return `${d.getUTCDate()} ${MONTHS_PL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function escXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT = "Times New Roman";
const SZ   = "24"; // 12 pt (half-points)
const SZ_S = "16"; // 8 pt

function rpr({ b, i, u, sz, color } = {}) {
  return [
    "<w:rPr>",
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`,
    b ? "<w:b/><w:bCs/>" : "",
    i ? "<w:i/><w:iCs/>" : "",
    u ? '<w:u w:val="single"/>' : "",
    `<w:sz w:val="${sz || SZ}"/><w:szCs w:val="${sz || SZ}"/>`,
    color ? `<w:color w:val="${color}"/>` : "",
    "</w:rPr>",
  ].filter(Boolean).join("");
}

function run(text, opts = {}) {
  return `<w:r>${rpr(opts)}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function para(runs, { center, justify, before = 0, after = 0 } = {}) {
  const jc = center ? '<w:jc w:val="center"/>' : justify ? '<w:jc w:val="both"/>' : "";
  return [
    "<w:p>",
    "<w:pPr>",
    jc,
    `<w:spacing w:before="${before}" w:after="${after}"/>`,
    "</w:pPr>",
    runs,
    "</w:p>",
  ].filter(Boolean).join("");
}

function emptyLine() {
  return para(run(" "), { before: 0, after: 0 });
}

// Parsuje prosty HTML (b/i/u/br/div/p) → akapity OOXML z formatowaniem
function htmlBodyToParagraphs(html, pOpts) {
  const HTML_ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&nbsp;": " " };

  const segments = [];
  const fmtStack = [];
  let fmt = { b: false, i: false, u: false };

  const tokens = html.split(/(<[^>]+>|&(?:amp|lt|gt|quot|nbsp);)/);
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok.startsWith("<")) {
      const closing = tok.startsWith("</");
      const tag = (tok.match(/<\/?([a-z]+)/i)?.[1] ?? "").toLowerCase();
      if (!closing) {
        if (tag === "b" || tag === "strong") { fmtStack.push({ ...fmt }); fmt = { ...fmt, b: true }; }
        else if (tag === "i" || tag === "em") { fmtStack.push({ ...fmt }); fmt = { ...fmt, i: true }; }
        else if (tag === "u")                 { fmtStack.push({ ...fmt }); fmt = { ...fmt, u: true }; }
        else if (tag === "br") segments.push({ text: "\n", ...fmt });
      } else {
        if (["b","strong","i","em","u"].includes(tag) && fmtStack.length) fmt = fmtStack.pop();
        else if (tag === "div" || tag === "p") segments.push({ text: "\n", ...fmt });
      }
    } else if (tok.startsWith("&")) {
      segments.push({ text: HTML_ENTITIES[tok] ?? tok, ...fmt });
    } else {
      segments.push({ text: tok, ...fmt });
    }
  }

  // Grupuj segmenty w linie (podział na \n)
  const lines = [];
  let line = [];
  for (const seg of segments) {
    const parts = seg.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) { lines.push(line); line = []; }
      if (parts[i]) line.push({ ...seg, text: parts[i] });
    }
  }
  if (line.length) lines.push(line);

  return lines.map((segs) => {
    const runs = segs.map((s) => run(s.text, { b: s.b, i: s.i, u: s.u })).join("");
    return para(runs || run(" "), pOpts);
  });
}

function plainBodyToParagraphs(text, pOpts) {
  return text.split("\n").map((line) =>
    para(run(line.length ? line : " "), pOpts),
  );
}

function bodyToParagraphs(body, pOpts) {
  if (!body) return [];
  if (/<[a-zA-Z]/.test(body)) return htmlBodyToParagraphs(body, pOpts);
  return plainBodyToParagraphs(body, pOpts);
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

export function buildCommunicationDocx(comm, numLabel) {
  const dateStr = comm.sentAt ? formatDateLong(comm.sentAt) : "";
  const resolvedNumLabel = numLabel ?? (
    comm.number != null
      ? `${comm.number}/${String(comm.month).padStart(2, "0")}/${comm.year}`
      : (comm.title || "")
  );

  const ps = [];

  // Nagłówek
  ps.push(para(run("KOMUNIKAT WEWNĘTRZNY", { b: true }), { center: true, before: 0, after: 0 }));
  ps.push(para(
    run(`NR ${resolvedNumLabel}${dateStr ? ` z dnia ${dateStr}` : ""}`, { b: true }),
    { center: true, before: 0, after: 0 },
  ));
  if (comm.subject) {
    ps.push(para(run(`Ws. ${comm.subject}`, { b: true }), { center: true, before: 0, after: 200 }));
  }

  // Powitanie
  ps.push(emptyLine());
  ps.push(para(run("Członkowie Polskiej Izby Spedycji i Logistyki,", { b: true }), { before: 0, after: 160 }));

  // Treść — z obsługą HTML (b/i/u) i plain text (stare rekordy)
  ps.push(...bodyToParagraphs(comm.body, { justify: true, before: 0, after: 0 }));

  // Załączniki
  const attachments = comm.attachments ?? [];
  if (attachments.length > 0) {
    ps.push(emptyLine());
    for (const att of attachments) {
      const name = att.fileName.replace(/\.[^.]+$/, "");
      ps.push(para(run(`Zał. ${name}`), { before: 0, after: 0 }));
    }
  }

  // Autor
  if (comm.authorName || comm.authorPosition) {
    ps.push(emptyLine());
    ps.push(para(run(comm.authorLabel || "Przygotowała:"), { before: 0, after: 0 }));
    if (comm.authorName)     ps.push(para(run(comm.authorName,     { i: true }), { before: 0, after: 0 }));
    if (comm.authorPosition) ps.push(para(run(comm.authorPosition, { i: true }), { before: 0, after: 0 }));
  }

  // Disclaimer
  ps.push(emptyLine());
  ps.push(para(run("_".repeat(60), { color: "999999" }), { before: 0, after: 80 }));
  ps.push(para(run(DISCLAIMER, { sz: SZ_S, color: "555555" }), { justify: true, before: 0, after: 0 }));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${ps.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
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
