import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadFileToGCS } from "@/lib/gcs";
import { sanitizeFilename } from "@/lib/utils";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const communications = await prisma.communication.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(communications, { status: 200 });
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

  try {
    const data = await request.formData();
    const title = data.get("title");
    const year = parseInt(data.get("year"), 10);
    const file = data.get("file");

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
      },
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
