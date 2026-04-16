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

  const { id } = await params;

  try {
    const communication = await prisma.communication.findUnique({
      where: { id },
    });

    if (!communication || !communication.filePath) {
      return new NextResponse("Nie znaleziono komunikatu lub pliku", {
        status: 404,
      });
    }

    const fileBuffer = await downloadFileFromGCS(communication.filePath);
    const mimeType =
      mime.getType(communication.fileName) || "application/octet-stream";
    const headerEncodedFilename = encodeURIComponent(communication.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="komunikat"; filename*=UTF-8''${headerEncodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Błąd podczas pobierania komunikatu z GCS:", error);
    return new NextResponse("Wystąpił błąd serwera", { status: 500 });
  }
}
