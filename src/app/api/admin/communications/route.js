import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS } from "@/lib/gcs";
import { sanitizeFilename } from "@/lib/utils";
import { submissionToComm } from "@/lib/submissionAsComm";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const [communications, submissions] = await Promise.all([
      prisma.communication.findMany({
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        include: { attachments: true },
      }),
      prisma.submission.findMany({
        where: { communicationNumber: { not: null } },
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    const submissionComms = submissions.map((sub) =>
      submissionToComm(sub, { includeDownloadUrls: true, downloadUrlBase: "/api/admin" }),
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

export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    // -----------------------------------------------------------------------
    // JSON body → tworzenie nowego komunikatu jako SZKIC z auto-numerem
    // -----------------------------------------------------------------------
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { subject, body: bodyText, authorInitials, sentAt, isSpis } = body;

      if (!subject) {
        return NextResponse.json(
          { message: "Pole 'subject' (sprawa) jest wymagane." },
          { status: 400 },
        );
      }

      const date = sentAt ? new Date(sentAt) : new Date();
      const year = date.getFullYear();

      const newCommunication = await prisma.communication.create({
        data: {
          title: subject,
          year,
          month: null,
          number: null,
          subject,
          body: bodyText || null,
          authorInitials: authorInitials || null,
          sentAt: date,
          isSpis: !!isSpis,
          status: "DRAFT",
        },
        include: { attachments: true },
      });

      return NextResponse.json(newCommunication, { status: 201 });
    }

    // -----------------------------------------------------------------------
    // multipart/form-data → upload pliku (legacy lub spis PDF)
    // -----------------------------------------------------------------------
    const data = await request.formData();
    const title = data.get("title");
    const year = parseInt(data.get("year"), 10);
    const file = data.get("file");
    const isSpis = data.get("isSpis") === "true";

    if (!title || !year || !file) {
      return NextResponse.json(
        { message: "Brakujące wymagane pola." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalFilename = sanitizeFilename(file.name);
    const gcsFilename = `komunikaty/${year}/${Date.now()}_${originalFilename}`;

    const gcsPath = await uploadFileToGCS(buffer, gcsFilename);
    const newCommunication = await prisma.communication.create({
      data: {
        title,
        year,
        fileName: originalFilename,
        filePath: gcsPath,
        isSpis,
        status: "SENT", // wgrany plik = od razu widoczny
      },
      include: { attachments: true },
    });

    return NextResponse.json(newCommunication, { status: 201 });
  } catch (error) {
    console.error("Błąd podczas dodawania komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
