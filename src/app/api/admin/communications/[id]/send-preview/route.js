import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS } from "@/lib/gcs";
import nodemailer from "nodemailer";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCommunicationHtml(comm) {
  const numLabel =
    comm.number != null
      ? `Komunikat ${comm.number}/${String(comm.month).padStart(2, "0")}/${comm.year}`
      : comm.title;

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(numLabel)}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#111}
    .header{border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:24px}
    .num{font-size:12px;color:#666;margin-bottom:4px}
    h1{font-size:16px;margin:0 0 4px}
    .meta{font-size:12px;color:#888}
    .body{line-height:1.7;white-space:pre-wrap;margin-top:24px}
    .footer{margin-top:40px;color:#444;font-size:13px;border-top:1px solid #eee;padding-top:16px}
  </style>
</head>
<body>
  <div class="header">
    <div class="num">${escapeHtml(numLabel)}</div>
    <h1>${escapeHtml(comm.subject || comm.title)}</h1>
    ${comm.sentAt ? `<div class="meta">${new Date(comm.sentAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>` : ""}
  </div>
  <div class="body">${escapeHtml(comm.body || "")}</div>
  <div class="footer">
    <p>Z poważaniem,<br>
    ${comm.authorInitials ? `${escapeHtml(comm.authorInitials)}<br>` : ""}
    Polska Izba Spedycji i Logistyki</p>
  </div>
</body>
</html>`;
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const comm = await prisma.communication.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!comm) {
      return NextResponse.json(
        { message: "Nie znaleziono komunikatu." },
        { status: 404 },
      );
    }

    const html = buildCommunicationHtml(comm);
    const htmlBuffer = Buffer.from(html, "utf-8");

    // Wgraj HTML do GCS i zapisz jako plik komunikatu
    const numLabel =
      comm.number != null
        ? `komunikat-${comm.number}-${String(comm.month).padStart(2, "0")}-${comm.year}`
        : `komunikat-${comm.id}`;
    const gcsFilename = `komunikaty/${comm.year}/${comm.id}/${numLabel}.html`;
    const gcsPath = await uploadFileToGCS(htmlBuffer, gcsFilename);
    const htmlFileName = `${numLabel}.html`;

    // Wyślij email na ADMIN_EMAIL (do podglądu)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const numDisplay =
      comm.number != null
        ? `${comm.number}/${String(comm.month).padStart(2, "0")}/${comm.year}`
        : comm.title;

    await transporter.sendMail({
      from: `"System PISiL" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[Komunikat ${numDisplay}] ${comm.subject || comm.title}`,
      html,
    });

    // Zaktualizuj rekord — zapisz plik HTML i zmień status na SENT
    const now = new Date();
    const updated = await prisma.communication.update({
      where: { id },
      data: {
        fileName: htmlFileName,
        filePath: gcsPath,
        status: "SENT",
        sentAt: comm.sentAt ?? now,
      },
      include: { attachments: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas wysyłania podglądu komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
