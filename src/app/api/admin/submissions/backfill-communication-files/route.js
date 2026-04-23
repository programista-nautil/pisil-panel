import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateCommunicationDoc } from "@/lib/services/communicationService";
import { uploadFileToGCS } from "@/lib/gcs";

/**
 * POST /api/admin/submissions/backfill-communication-files
 *
 * Jednorazowa operacja naprawcza — dla zgłoszeń, które mają communicationNumber
 * ale nie mają communicationFilePath (wygenerowane przed migracją schematu),
 * regeneruje dokument DOCX i zapisuje go w GCS + DB.
 *
 * Nie wysyła maili. Dokument będzie zawierał aktualną datę (nie oryginalną).
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const submissions = await prisma.submission.findMany({
      where: {
        communicationNumber: { not: null },
        communicationFilePath: null,
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ message: "Brak zgłoszeń wymagających backfillu.", repaired: 0 });
    }

    const results = [];

    for (const sub of submissions) {
      try {
        const { buffer, fileName } = await generateCommunicationDoc(sub, sub.communicationNumber);
        const gcsPath = await uploadFileToGCS(buffer, `communications/${fileName}`);
        await prisma.submission.update({
          where: { id: sub.id },
          data: { communicationFilePath: gcsPath, communicationFileName: fileName },
        });
        results.push({ id: sub.id, companyName: sub.companyName, status: "ok", fileName });
      } catch (err) {
        results.push({ id: sub.id, companyName: sub.companyName, status: "error", error: err.message });
      }
    }

    const ok = results.filter((r) => r.status === "ok").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      message: `Backfill zakończony. OK: ${ok}, błędy: ${errors}.`,
      repaired: ok,
      results,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}
