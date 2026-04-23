import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  const { initials: originalInitials } = await params;
  if (!originalInitials) {
    return NextResponse.json({ message: "Brak inicjałów." }, { status: 400 });
  }

  try {
    const { initials: newInitialsRaw, name, position, label } = await request.json();
    const newInitials = (newInitialsRaw || originalInitials).trim().toUpperCase().slice(0, 5);

    let updated;

    if (newInitials !== originalInitials) {
      // Rename: create new, update references, delete old
      [updated] = await prisma.$transaction([
        prisma.communicationAuthor.create({
          data: {
            initials: newInitials,
            name: name?.trim() || null,
            position: position?.trim() || null,
            label: label?.trim() || null,
          },
        }),
        prisma.communication.updateMany({
          where: { authorInitials: originalInitials },
          data: { authorInitials: newInitials },
        }),
        prisma.communicationAuthor.deleteMany({ where: { initials: originalInitials } }),
      ]);
    } else {
      updated = await prisma.communicationAuthor.update({
        where: { initials: originalInitials },
        data: {
          name: name?.trim() || null,
          position: position?.trim() || null,
          label: label?.trim() || null,
        },
      });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas aktualizacji autora:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}

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
      prisma.communicationAuthor.deleteMany({ where: { initials } }),
      prisma.communication.updateMany({
        where: { authorInitials: initials, status: "DRAFT" },
        data: { authorInitials: null },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas usuwania autora:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}
