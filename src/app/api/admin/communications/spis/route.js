import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSpisHtml } from "@/lib/generateSpisHtml";
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
        where: {
          isSpis: true,
          ...(yearNum ? { year: yearNum } : {}),
        },
      }),
      prisma.submission.findMany({
        where: subWhere,
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    const submissionComms = submissions.map((sub) =>
      submissionToComm(sub, { includeDownloadUrls: true, downloadUrlBase: "/api/admin" }),
    );

    const oldSpisRecords = spisRecords.reduce((acc, r) => {
      acc[r.year] = r;
      return acc;
    }, {});

    const html = generateSpisHtml([...communications, ...submissionComms], year, {
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
