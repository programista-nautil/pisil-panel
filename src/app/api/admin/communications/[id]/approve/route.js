import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS, downloadFileFromGCS } from "@/lib/gcs";
import nodemailer from "nodemailer";
import { buildCommunicationHtml } from "@/lib/communicationHtml";

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
