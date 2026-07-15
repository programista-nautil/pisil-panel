"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import EventFormModal from "./EventFormModal";
import EventRegistrationsView from "./EventRegistrationsView";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

// Jedna barwa wiodąca (#005698) + neutralne szarości. Czerwień zarezerwowana wyłącznie dla usuwania.
// Czytelna hierarchia zamiast tęczy: pełny granat = żywe i otwarte, miękki granat = żywe ale zamknięte,
// szarość = nieaktywne (szkic / po terminie / archiwum).
const BADGE = {
  DRAFT: { text: "Szkic", style: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
  PUBLISHED: { text: "Opublikowane", style: "bg-[#005698] text-white" },
  CLOSED: {
    text: "Rejestracja zamknięta",
    style: "bg-[#005698]/10 text-[#005698] ring-1 ring-[#005698]/25",
  },
  ZAKONCZONE: { text: "Zakończone", style: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
  ARCHIVED: { text: "Zarchiwizowane", style: "bg-gray-50 text-gray-400 ring-1 ring-gray-200" },
};

const TYP_LABEL = { SZKOLENIE: "Szkolenie", KONFERENCJA: "Konferencja" };
const TRYB_LABEL = { ONLINE: "Online", STACJONARNE: "Stacjonarnie" };

// Adres strony wydarzenia powstaje automatycznie z tytułu, więc administrator nie ma go skąd znać.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pisil.pl";

const formatDate = (d) =>
  new Date(d).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const czyPoTerminie = (event) => new Date(event.startAt) < new Date();

// Status pokazywany w panelu. „Zakończone” jest WYLICZANE z daty (nie ma go w bazie) — podpowiada
// Pani Teresie, że wydarzenie się odbyło i można je zarchiwizować.
const badgeFor = (event) => {
  if (event.status === "ARCHIVED") return BADGE.ARCHIVED;
  if (event.status !== "DRAFT" && czyPoTerminie(event)) return BADGE.ZAKONCZONE;
  return BADGE[event.status] || BADGE.DRAFT;
};

const btnBase =
  "px-3 py-1.5 text-sm font-medium rounded-md border transition-colors whitespace-nowrap";
const btnBrand = `${btnBase} text-[#005698] border-[#005698]/40 hover:bg-[#005698]/5`;
const btnNeutral = `${btnBase} text-gray-700 border-gray-300 hover:bg-gray-50`;
const btnDanger = `${btnBase} text-red-600 border-red-200 hover:bg-red-50`;

export default function EventsManagement() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = nowe
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { event, typ: 'close' | 'archive' }
  const [viewingEvent, setViewingEvent] = useState(null); // podgląd zgłoszeń
  const [pokazArchiwum, setPokazArchiwum] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/events");
      if (!res.ok) throw new Error("Błąd ładowania wydarzeń");
      setEvents(await res.json());
    } catch (error) {
      console.error(error);
      toast.error("Nie udało się pobrać wydarzeń.");
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleSaved = (saved) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) return prev.map((e) => (e.id === saved.id ? { ...e, ...saved } : e));
      return [{ ...saved, _count: { registrations: 0 } }, ...prev];
    });
    setIsFormOpen(false);
  };

  const patchStatus = async (event, status, komunikat) => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Błąd zmiany statusu");
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
      toast.success(komunikat || "Zaktualizowano status wydarzenia.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { event, typ } = confirmAction;
    if (typ === "close") {
      await patchStatus(event, "CLOSED", "Rejestracja zamknięta. Wydarzenie zostaje na stronie.");
    } else {
      await patchStatus(event, "ARCHIVED", "Zarchiwizowano. Na stronie wydarzenie zostaje.");
    }
    setConfirmAction(null);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    try {
      const res = await fetch(`/api/admin/events/${deletingEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd usuwania.");
      }
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
      toast.success("Wydarzenie usunięte.");
      setDeletingEvent(null);
    } catch (error) {
      // Serwer blokuje usunięcie wydarzenia ze zgłoszeniami — podpowiedz archiwizację
      toast.error(error.message);
      setDeletingEvent(null);
    }
  };

  // Widok zgłoszeń danego wydarzenia
  if (viewingEvent) {
    return (
      <EventRegistrationsView
        event={viewingEvent}
        onBack={() => {
          setViewingEvent(null);
          fetchEvents();
        }}
      />
    );
  }

  const aktywne = events.filter((e) => e.status !== "ARCHIVED");
  const archiwum = events.filter((e) => e.status === "ARCHIVED");

  const renderRow = (event) => {
    const badge = badgeFor(event);
    const zgloszen = event._count?.registrations ?? 0;
    const poTerminie = czyPoTerminie(event);
    const maZgloszenia = zgloszen > 0;

    return (
      <div
        key={event.id}
        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex-grow min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.style}`}
            >
              {badge.text}
            </span>
            {/* Metadana, nie status — celowo cicha, żeby nie konkurowała z badge'em statusu */}
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-white text-gray-600 ring-1 ring-gray-200">
              {TYP_LABEL[event.typ]} · {TRYB_LABEL[event.tryb]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-800 truncate">{event.title}</h3>
          <p className="text-sm text-gray-500">
            {formatDate(event.startAt)}
            {event.limitMiejsc != null && ` · limit ${event.limitMiejsc}`}
            {` · zgłoszeń: ${zgloszen}`}
          </p>
          {/* Adres strony wydarzenia — szkic nie istnieje publicznie, więc nie udajemy działającego linku. */}
          {event.status === "DRAFT" ? (
            <p className="text-xs text-gray-400 mt-1" title={`${SITE_URL}/wydarzenia/${event.slug}`}>
              Adres: /wydarzenia/{event.slug} — zadziała po opublikowaniu
            </p>
          ) : (
            <a
              href={`${SITE_URL}/wydarzenia/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${SITE_URL}/wydarzenia/${event.slug}`}
              className="text-xs text-[#005698] hover:underline inline-flex items-center gap-1 mt-1"
            >
              Zobacz na stronie
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          )}
          {poTerminie && event.status !== "ARCHIVED" && event.status !== "DRAFT" && (
            <p className="text-xs text-gray-400 mt-1">
              Termin minął — możesz zarchiwizować, żeby uporządkować listę.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button onClick={() => setViewingEvent(event)} className={btnBrand}>
            Zgłoszenia ({zgloszen})
          </button>

          {event.status === "DRAFT" && (
            <button
              onClick={() => patchStatus(event, "PUBLISHED", "Opublikowano wydarzenie.")}
              className={btnNeutral}
            >
              Opublikuj
            </button>
          )}

          {event.status === "PUBLISHED" && (
            <button
              onClick={() => setConfirmAction({ event, typ: "close" })}
              className={btnNeutral}
            >
              Zamknij rejestrację
            </button>
          )}

          {event.status === "CLOSED" && (
            <button
              onClick={() => patchStatus(event, "PUBLISHED", "Zapisy otwarte ponownie.")}
              className={btnNeutral}
            >
              Otwórz ponownie
            </button>
          )}

          <button onClick={() => openEdit(event)} className={btnNeutral}>
            Edytuj
          </button>

          {event.status === "ARCHIVED" ? (
            <button
              onClick={() => patchStatus(event, "PUBLISHED", "Przywrócono z archiwum.")}
              className={btnNeutral}
            >
              Przywróć
            </button>
          ) : (
            <button
              onClick={() => setConfirmAction({ event, typ: "archive" })}
              className={btnNeutral}
            >
              Archiwizuj
            </button>
          )}

          {/* Usuwanie oferujemy tylko tam, gdzie jest wykonalne — serwer i tak blokuje kasowanie
              wydarzenia ze zgłoszeniami (chroni dane uczestników). Nie pokazujemy akcji, która nie zadziała. */}
          {!maZgloszenia && (
            <button onClick={() => setDeletingEvent(event)} className={btnDanger}>
              Usuń
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-[#005698]/10 p-2 rounded-lg">
            <CalendarDaysIcon className="h-6 w-6 text-[#005698]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Wydarzenia</h2>
            <p className="text-sm text-gray-500">
              Szkolenia i konferencje — twórz wydarzenia i zarządzaj zgłoszeniami.
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm"
        >
          + Utwórz wydarzenie
        </button>
      </div>

      {/* Lista aktywnych */}
      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Ładowanie wydarzeń…</p>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          Brak wydarzeń. Użyj przycisku powyżej, aby dodać pierwsze.
        </p>
      ) : (
        <>
          {aktywne.length > 0 ? (
            <div className="space-y-3">{aktywne.map(renderRow)}</div>
          ) : (
            <p className="text-center text-gray-400 py-8">
              Brak aktywnych wydarzeń — wszystkie są w archiwum poniżej.
            </p>
          )}

          {/* Archiwum — osobno i domyślnie zwinięte, żeby lista aktywnych nie zarastała */}
          {archiwum.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setPokazArchiwum((v) => !v)}
                aria-expanded={pokazArchiwum}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span>Zarchiwizowane ({archiwum.length})</span>
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    pokazArchiwum ? "rotate-180" : ""
                  }`}
                />
              </button>
              {pokazArchiwum && <div className="space-y-3 mt-3">{archiwum.map(renderRow)}</div>}
            </div>
          )}
        </>
      )}

      {/* key → remount przy zmianie edytowanego wydarzenia (reset stanu formularza) */}
      <EventFormModal
        key={editingEvent?.id || "new"}
        isOpen={isFormOpen}
        event={editingEvent}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleSaved}
      />

      {/* Potwierdzenie zamknięcia rejestracji / archiwizacji — wspólny modal, wariant „brand”,
          bo to operacje odwracalne (czerwień zostaje dla usuwania). */}
      <DeleteConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        variant="brand"
        title={
          confirmAction?.typ === "close" ? "Zamknij rejestrację" : "Zarchiwizuj wydarzenie"
        }
        message={
          confirmAction?.typ === "close"
            ? `Wydarzenie „${confirmAction?.event?.title}” zostanie na stronie pisil.pl, ale zamiast formularza zobaczą tam Państwo informację „Rejestracja zakończona”. Nowe zgłoszenia nie będą przyjmowane. Zapisy można otworzyć ponownie w każdej chwili.`
            : `Archiwizacja porządkuje wyłącznie panel: „${confirmAction?.event?.title}” zniknie z listy aktywnych i trafi do zwijanej sekcji „Zarchiwizowane” na dole. Na stronie pisil.pl wydarzenie zostaje widoczne, z informacją „Rejestracja zakończona”. W każdej chwili można je przywrócić.`
        }
        confirmButtonText={confirmAction?.typ === "close" ? "Zamknij rejestrację" : "Archiwizuj"}
        busyText={confirmAction?.typ === "close" ? "Zamykam…" : "Archiwizuję…"}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDelete}
        title="Usuń wydarzenie"
        message={
          deletingEvent
            ? `Usunięcie „${deletingEvent.title}” jest trwałe — wydarzenie zniknie także ze strony pisil.pl, razem ze swoim adresem. Jeśli chcesz je tylko schować z listy aktywnych, użyj archiwizacji: na stronie zostanie z informacją „Rejestracja zakończona”.`
            : ""
        }
        confirmButtonText="Usuń"
      />
    </div>
  );
}
