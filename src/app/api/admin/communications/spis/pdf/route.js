import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSpisDocx } from "@/lib/generateSpisDocx";
import { convertDocxToPdf } from "@/lib/services/docxToPdfService";
import { submissionToComm } from "@/lib/submissionAsComm";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Brak autoryzacji", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  try {
    const yearNum = year && year !== "all" ? Number(year) : null;
    const subWhere = {
      communicationNumber: { not: null },
      ...(yearNum ? {
        createdAt: { gte: new Date(yearNum, 0, 1), lt: new Date(yearNum + 1, 0, 1) },
      } : {}),
    };

    const [communications, spisRecords, submissions] = await Promise.all([
      prisma.communication.findMany({
        where: {
          isSpis: false,
          OR: [
            { status: "SENT" },
            { AND: [{ number: null }, { fileName: { not: null } }] },
          ],
        },
        orderBy: [{ year: "desc" }, { number: "desc" }],
        include: { attachments: true },
      }),
      prisma.communication.findMany({
        where: { isSpis: true, ...(yearNum ? { year: yearNum } : {}) },
      }),
      prisma.submission.findMany({ where: subWhere, orderBy: [{ createdAt: "desc" }] }),
    ]);

    const submissionComms = submissions.map((sub) => submissionToComm(sub));

    const oldSpisRecords = spisRecords.reduce((acc, r) => {
      acc[r.year] = r;
      return acc;
    }, {});

    const yearSuffix = year && year !== "all" ? `-${year}` : "";
    const filenameBase = `spis-komunikatow${yearSuffix}`;

    const docxBuffer = generateSpisDocx([...communications, ...submissionComms], year, {
      oldSpisRecords,
    });

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
    console.error("Błąd generowania PDF spisu:", error);
    return new NextResponse("Nie udało się wygenerować PDF.", { status: 500 });
  }
}
