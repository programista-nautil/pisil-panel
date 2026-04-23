import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET — zwraca union: CommunicationAuthor + distinct z Communication (deduplikacja)
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const [managed, fromComms] = await Promise.all([
      prisma.communicationAuthor.findMany({ orderBy: { initials: "asc" } }),
      prisma.communication.findMany({
        where: { authorInitials: { not: null } },
        select: { authorInitials: true },
        distinct: ["authorInitials"],
        orderBy: { authorInitials: "asc" },
      }),
    ]);

    const managedSet = new Set(managed.map((a) => a.initials));
    const fromCommsFiltered = fromComms
      .map((r) => r.authorInitials)
      .filter((i) => i && !managedSet.has(i));

    const all = [
      ...managed.map((a) => a.initials),
      ...fromCommsFiltered,
    ].sort();

    return NextResponse.json(all, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas pobierania inicjałów:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}

// POST — dodaje inicjały do zarządzanej listy
export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { initials } = await request.json();
    const val = (initials || "").trim().toUpperCase().slice(0, 5);
    if (!val) {
      return NextResponse.json(
        { message: "Inicjały nie mogą być puste." },
        { status: 400 },
      );
    }

    const author = await prisma.communicationAuthor.upsert({
      where: { initials: val },
      update: {},
      create: { initials: val },
    });

    return NextResponse.json(author, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas dodawania inicjałów:", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
