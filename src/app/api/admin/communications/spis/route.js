import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSpisHtml } from "@/lib/generateSpisHtml";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Brak autoryzacji", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  try {
    const [communications, spisRecords] = await Promise.all([
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
        where: {
          isSpis: true,
          ...(year && year !== "all" ? { year: Number(year) } : {}),
        },
      }),
    ]);

    const oldSpisRecords = spisRecords.reduce((acc, r) => {
      acc[r.year] = r;
      return acc;
    }, {});

    const html = generateSpisHtml(communications, year, {
      oldSpisRecords,
      downloadUrlBuilder: (id) => `/api/admin/communications/${id}/download`,
      attachmentDownloadUrlBuilder: (commId, aId) =>
        `/api/admin/communications/${commId}/attachments/${aId}/download`,
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Błąd generowania spisu:", error);
    return new NextResponse("Wystąpił błąd serwera", { status: 500 });
  }
}
