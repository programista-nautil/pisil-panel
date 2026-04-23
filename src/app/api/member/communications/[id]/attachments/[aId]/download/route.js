import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { downloadFileFromGCS } from "@/lib/gcs";
import mime from "mime";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Brak autoryzacji", { status: 401 });
  }

  const { id, aId } = await params;

  try {
    const attachment = await prisma.communicationAttachment.findUnique({
      where: { id: aId },
      include: { communication: true },
    });

    if (!attachment || attachment.communicationId !== id) {
      return new NextResponse("Nie znaleziono załącznika", { status: 404 });
    }

    const comm = attachment.communication;
    const isLegacy = comm.subject == null;
    const isSent = comm.status === "SENT";
    if (!isLegacy && !isSent) {
      return new NextResponse("Komunikat nie jest dostępny", { status: 403 });
    }

    const fileBuffer = await downloadFileFromGCS(attachment.filePath);
    const mimeType = mime.getType(attachment.fileName) || "application/octet-stream";
    const encodedName = encodeURIComponent(attachment.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error) {
    console.error("Błąd podczas pobierania załącznika:", error);
    return new NextResponse("Wystąpił błąd serwera", { status: 500 });
  }
}
