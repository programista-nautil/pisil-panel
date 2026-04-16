import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    // Pobieramy komunikaty posortowane od najnowszego rocznika
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
