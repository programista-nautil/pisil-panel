import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS, downloadFileFromGCS } from "@/lib/gcs";
import nodemailer from "nodemailer";

function padMonth(m) {
  return String(m).padStart(2, "0");
}

async function getNextNumber(month, year) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [commResult, subResult] = await Promise.all([
    prisma.communication.aggregate({
      _max: { number: true },
      where: { month, year, number: { not: null } },
    }),
    prisma.submission.aggregate({
      _max: { communicationNumber: true },
      where: {
        communicationNumber: { not: null },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
  ]);

  const maxComm = commResult._max.number ?? 0;
  const maxSub = subResult._max.communicationNumber ?? 0;
  return Math.max(maxComm, maxSub) + 1;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCommunicationHtml(comm, numLabel) {
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

    if (comm.status === "SENT") {
      return NextResponse.json(
        { message: "Komunikat jest już zatwierdzony." },
        { status: 409 },
      );
    }

    const sentAt = comm.sentAt ?? new Date();
    const month = sentAt.getMonth() + 1;
    const year = sentAt.getFullYear();
    const number = await getNextNumber(month, year);
    const numLabel = `${number}/${padMonth(month)}/${year}`;
    const title = `Komunikat ${numLabel}`;

    const html = buildCommunicationHtml({ ...comm, number, month, year }, numLabel);
    const htmlBuffer = Buffer.from(html, "utf-8");

    const gcsFilename = `komunikaty/${year}/${comm.id}/komunikat-${number}-${padMonth(month)}-${year}.html`;
    const gcsPath = await uploadFileToGCS(htmlBuffer, gcsFilename);
    const htmlFileName = `komunikat-${number}-${padMonth(month)}-${year}.html`;

    // Pobierz załączniki z GCS do dołączenia do emaila
    const emailAttachments = (
      await Promise.all(
        comm.attachments.map(async (att) => {
          try {
            const content = await downloadFileFromGCS(att.filePath);
            return { filename: att.fileName, content };
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"System PISiL" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[Komunikat ${numLabel}] ${comm.subject || comm.title}`,
      html,
      attachments: emailAttachments,
    });

    const updated = await prisma.communication.update({
      where: { id },
      data: {
        number,
        month,
        year,
        title,
        fileName: htmlFileName,
        filePath: gcsPath,
        status: "SENT",
        sentAt,
      },
      include: { attachments: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas zatwierdzania komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
