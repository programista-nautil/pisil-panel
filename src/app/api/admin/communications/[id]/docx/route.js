import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { buildCommunicationDocx } from "@/lib/communicationDocx";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session) return new NextResponse("Brak autoryzacji", { status: 401 });

  const { id } = await params;

  try {
    const comm = await prisma.communication.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!comm || !comm.subject) {
      return new NextResponse("Nie znaleziono komunikatu.", { status: 404 });
    }

    const buffer = buildCommunicationDocx(comm);

    const filename =
      comm.number != null
        ? `komunikat-${comm.number}-${String(comm.month).padStart(2, "0")}-${comm.year}.docx`
        : `komunikat-szkic.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Błąd podczas generowania DOCX:", error);
    return new NextResponse("Wystąpił błąd serwera.", { status: 500 });
  }
}
