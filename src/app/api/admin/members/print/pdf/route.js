import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateMembersListDocx } from "@/lib/generateMembersListDocx";
import { convertDocxToPdf } from "@/lib/services/docxToPdfService";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new NextResponse("Brak autoryzacji", { status: 401 });
  }

  try {
    const members = await prisma.member.findMany({
      where: { deletedAt: null },
      select: {
        memberNumber: true,
        company: true,
        address: true,
        phones: true,
        fax: true,
        email: true,
        website: true,
      },
      orderBy: { company: "asc" },
    });

    const d = new Date();
    const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    const filenameBase = `lista-czlonkow-${stamp}`;
    const docxBuffer = generateMembersListDocx(members);

    // Na devie (bez LibreOffice) zwróć DOCX
    if (process.env.NODE_ENV !== "production" && !process.env.ENABLE_PDF_CONVERSION) {
      return new NextResponse(docxBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${filenameBase}.docx`)}`,
        },
      });
    }

    const { buffer: pdfBuffer } = await convertDocxToPdf(docxBuffer, `${filenameBase}.docx`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${filenameBase}.pdf`)}`,
      },
    });
  } catch (error) {
    console.error("Błąd generowania PDF listy członków:", error);
    return new NextResponse("Nie udało się wygenerować PDF.", { status: 500 });
  }
}
