"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import EventFormModal from "./EventFormModal";
import EventRegistrationsView from "./EventRegistrationsView";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

const STATUS_BADGE = {
  DRAFT: { text: "Szkic", style: "bg-gray-100 text-gray-600" },
  PUBLISHED: { text: "Opublikowane", style: "bg-green-100 text-green-700" },
  CLOSED: { text: "Rejestracja zamknięta", style: "bg-yellow-100 text-yellow-800" },
  ARCHIVED: { text: "Zarchiwizowane", style: "bg-gray-100 text-gray-400" },
};

const TYP_LABEL = { SZKOLENIE: "Szkolenie", KONFERENCJA: "Konferencja" };
const TRYB_LABEL = { ONLINE: "Online", STACJONARNE: "Stacjonarnie" };

const formatDate = (d) =>
  new Date(d).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

export default function EventsManagement() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = nowe
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null); // podgląd zgłoszeń

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

  const patchStatus = async (event, status) => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Błąd zmiany statusu");
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
      toast.success("Zaktualizowano status wydarzenia.");
    } catch (error) {
      toast.error(error.message);
    }
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

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
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

      {/* Lista */}
      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Ładowanie wydarzeń…</p>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          Brak wydarzeń. Użyj przycisku powyżej, aby dodać pierwsze.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const badge = STATUS_BADGE[event.status] || STATUS_BADGE.DRAFT;
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
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#005698]/10 text-[#005698]">
                      {TYP_LABEL[event.typ]} · {TRYB_LABEL[event.tryb]}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 truncate">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(event.startAt)}
                    {event.limitMiejsc != null && ` · limit ${event.limitMiejsc}`}
                    {` · zgłoszeń: ${event._count?.registrations ?? 0}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setViewingEvent(event)}
                    className="px-3 py-1.5 text-sm font-medium text-[#005698] border border-[#005698]/40 rounded-md hover:bg-[#005698]/5 transition-colors"
                  >
                    Zgłoszenia ({event._count?.registrations ?? 0})
                  </button>
                  {event.status === "DRAFT" && (
                    <button
                      onClick={() => patchStatus(event, "PUBLISHED")}
                      className="px-3 py-1.5 text-sm font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-50 transition-colors"
                    >
                      Opublikuj
                    </button>
                  )}
                  {event.status === "PUBLISHED" && (
                    <button
                      onClick={() => patchStatus(event, "CLOSED")}
                      className="px-3 py-1.5 text-sm font-medium text-yellow-700 border border-yellow-300 rounded-md hover:bg-yellow-50 transition-colors"
                    >
                      Zamknij rejestrację
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(event)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Edytuj
                  </button>
                  {event.status !== "ARCHIVED" && (
                    <button
                      onClick={() => patchStatus(event, "ARCHIVED")}
                      className="px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Archiwizuj
                    </button>
                  )}
                  <button
                    onClick={() => setDeletingEvent(event)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* key → remount przy zmianie edytowanego wydarzenia (reset stanu formularza) */}
      <EventFormModal
        key={editingEvent?.id || "new"}
        isOpen={isFormOpen}
        event={editingEvent}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleSaved}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDelete}
        title="Usuń wydarzenie"
        message={
          deletingEvent
            ? `Czy na pewno chcesz usunąć „${deletingEvent.title}"? Jeśli ma zgłoszenia, użyj archiwizacji zamiast usuwania.`
            : ""
        }
        confirmButtonText="Usuń"
      />
    </div>
  );
}
