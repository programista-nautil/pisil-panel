import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteFileFromGCS } from "@/lib/gcs";

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { subject, body: bodyText, authorInitials, sentAt, attachmentNames, title, year, month, status, isSpis } = body;

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (bodyText !== undefined) updateData.body = bodyText;
    if (authorInitials !== undefined) updateData.authorInitials = authorInitials || null;
    if (attachmentNames !== undefined) updateData.attachmentNames = attachmentNames || null;
    if (title !== undefined) updateData.title = title;
    if (year !== undefined) updateData.year = parseInt(year, 10);
    if (month !== undefined) updateData.month = parseInt(month, 10);
    if (status !== undefined) updateData.status = status;
    if (isSpis !== undefined) updateData.isSpis = !!isSpis;
    if (sentAt !== undefined) updateData.sentAt = sentAt ? new Date(sentAt) : null;

    const updated = await prisma.communication.update({
      where: { id },
      data: updateData,
      include: { attachments: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas edycji komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const communication = await prisma.communication.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!communication) {
      return NextResponse.json(
        { message: "Nie znaleziono komunikatu" },
        { status: 404 },
      );
    }

    if (communication.status === "SENT" && !communication.isSpis) {
      return NextResponse.json(
        { message: "Nie można usunąć wysłanego komunikatu." },
        { status: 409 },
      );
    }

    if (communication.filePath) {
      await deleteFileFromGCS(communication.filePath);
    }

    for (const att of communication.attachments) {
      try {
        await deleteFileFromGCS(att.filePath);
      } catch {}
    }

    await prisma.communication.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Komunikat i plik zostały usunięte" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Błąd podczas usuwania komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera" },
      { status: 500 },
    );
  }
}
