import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS } from "@/lib/gcs";
import nodemailer from "nodemailer";
import { buildCommunicationHtml } from "@/lib/communicationHtml";

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
