import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
    const extra = fromComms
      .map((r) => r.authorInitials)
      .filter((i) => i && !managedSet.has(i))
      .map((i) => ({ initials: i, name: null, position: null, label: null }));

    const all = [...managed, ...extra].sort((a, b) =>
      a.initials.localeCompare(b.initials),
    );

    return NextResponse.json(all, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas pobierania autorów:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { initials, name, position, label } = await request.json();
    const val = (initials || "").trim().toUpperCase().slice(0, 5);
    if (!val) {
      return NextResponse.json({ message: "Inicjały nie mogą być puste." }, { status: 400 });
    }

    const author = await prisma.communicationAuthor.upsert({
      where: { initials: val },
      update: {
        name: name?.trim() || null,
        position: position?.trim() || null,
        label: label?.trim() || null,
      },
      create: {
        initials: val,
        name: name?.trim() || null,
        position: position?.trim() || null,
        label: label?.trim() || null,
      },
    });

    return NextResponse.json(author, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas dodawania autora:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}
