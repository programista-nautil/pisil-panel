import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// DELETE — usuwa inicjały z zarządzanej listy i czyści pole authorInitials
// we wszystkich komunikatach, które je używają.
export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { initials } = await params;
  if (!initials) {
    return NextResponse.json({ message: "Brak inicjałów." }, { status: 400 });
  }

  try {
    await prisma.$transaction([
      // Usuń z zarządzanej listy (jeśli tam jest)
      prisma.communicationAuthor.deleteMany({ where: { initials } }),
      // Wyczyść pole authorInitials ze wszystkich komunikatów używających tych inicjałów
      prisma.communication.updateMany({
        where: { authorInitials: initials },
        data: { authorInitials: null },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas usuwania inicjałów:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
