import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { submissionToComm } from "@/lib/submissionAsComm";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    // Filtr widoczności dla członka:
    //  - musi mieć plik lub treść (wyklucza czyste rekordy licznikowe bez zawartości)
    //  - musi być WYSŁANY lub być rekordem legacy (number=null + filePath != null)
    //    (legacy rekordy mają status=DRAFT z migracji defaultu, ale są archiwalnymi plikami)
    const communications = await prisma.communication.findMany({
      where: {
        AND: [
          // Warunek 1: musi mieć jakąś zawartość
          {
            OR: [
              { fileName: { not: null } },
              { body: { not: null } },
            ],
          },
          // Warunek 2: widoczny dla członka
          {
            OR: [
              { status: "SENT" },
              // Legacy — archiwalny plik sprzed redesignu (number=null, plik istnieje)
              { AND: [{ number: null }, { fileName: { not: null } }] },
            ],
          },
        ],
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: { attachments: true },
    });

    const submissions = await prisma.submission.findMany({
      where: { communicationNumber: { not: null } },
      orderBy: [{ createdAt: "desc" }],
    });

    const submissionComms = submissions.map((sub) =>
      submissionToComm(sub, { includeDownloadUrls: true, downloadUrlBase: "/api/member" }),
    );

    return NextResponse.json([...communications, ...submissionComms], { status: 200 });
  } catch (error) {
    console.error("Błąd podczas pobierania komunikatów:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera" },
      { status: 500 },
    );
  }
}
