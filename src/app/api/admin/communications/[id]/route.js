import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteFileFromGCS } from "@/lib/gcs";

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const communication = await prisma.communication.findUnique({
      where: { id },
    });

    if (!communication) {
      return NextResponse.json(
        { message: "Nie znaleziono komunikatu" },
        { status: 404 },
      );
    }

    if (communication.filePath) {
      await deleteFileFromGCS(communication.filePath);
    }

    await prisma.communication.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Komunikat i plik zostały usunięte" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Błąd podczas usuwania komunikatu:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera" },
      { status: 500 },
    );
  }
}
