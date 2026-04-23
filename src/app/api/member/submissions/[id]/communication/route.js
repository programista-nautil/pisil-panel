import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { downloadFileFromGCS } from "@/lib/gcs";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Brak autoryzacji", { status: 401 });
  }

  const { id } = await params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        communicationFilePath: true,
        communicationFileName: true,
        communicationNumber: true,
      },
    });

    if (!submission?.communicationFilePath || !submission.communicationNumber) {
      return new NextResponse("Brak pliku komunikatu", { status: 404 });
    }

    const fileBuffer = await downloadFileFromGCS(submission.communicationFilePath);
    const fileName = submission.communicationFileName || "komunikat.docx";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("Błąd pobierania pliku komunikatu:", error);
    return new NextResponse("Wystąpił błąd serwera", { status: 500 });
  }
}
