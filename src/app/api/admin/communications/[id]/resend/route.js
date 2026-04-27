import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { downloadFileFromGCS } from "@/lib/gcs";
import nodemailer from "nodemailer";
import { buildCommunicationHtml } from "@/lib/communicationHtml";

function padMonth(m) {
  return String(m).padStart(2, "0");
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
      return NextResponse.json({ message: "Nie znaleziono komunikatu." }, { status: 404 });
    }

    if (comm.status !== "SENT") {
      return NextResponse.json(
        { message: "Można ponownie wysłać tylko zatwierdzony komunikat." },
        { status: 409 },
      );
    }

    const numLabel = comm.number != null
      ? `${comm.number}/${padMonth(comm.month)}/${comm.year}`
      : String(comm.year);

    const html = buildCommunicationHtml(comm, numLabel);

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
      to: process.env.DEKLARACJE_EMAIL,
      subject: `[Komunikat ${numLabel}] ${comm.subject || comm.title}`,
      html,
      attachments: emailAttachments,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas ponownej wysyłki komunikatu:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}
