import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteFileFromGCS } from "@/lib/gcs";

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { aId } = await params;

  try {
    const attachment = await prisma.communicationAttachment.findUnique({
      where: { id: aId },
    });

    if (!attachment) {
      return NextResponse.json(
        { message: "Nie znaleziono załącznika." },
        { status: 404 },
      );
    }

    await deleteFileFromGCS(attachment.filePath);
    await prisma.communicationAttachment.delete({ where: { id: aId } });

    return NextResponse.json({ message: "Załącznik usunięty." }, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas usuwania załącznika:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
