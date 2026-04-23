import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS } from "@/lib/gcs";
import { sanitizeFilename } from "@/lib/utils";

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const comm = await prisma.communication.findUnique({ where: { id } });
    if (!comm) {
      return NextResponse.json(
        { message: "Nie znaleziono komunikatu." },
        { status: 404 },
      );
    }

    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "Brak pliku w żądaniu." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalFilename = sanitizeFilename(file.name);
    const gcsFilename = `komunikaty/${comm.year}/${comm.id}/zalaczniki/${Date.now()}_${originalFilename}`;
    const gcsPath = await uploadFileToGCS(buffer, gcsFilename);

    const attachment = await prisma.communicationAttachment.create({
      data: {
        communicationId: id,
        fileName: originalFilename,
        filePath: gcsPath,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas dodawania załącznika:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
