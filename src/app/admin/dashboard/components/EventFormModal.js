"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

// ISO / Date → wartość dla <input type="datetime-local"> (lokalny czas, bez sekund)
function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputCls =
  "block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm text-gray-700";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

// Formularz ma kilkanaście pól — bez podziału jest ścianą. Sekcja = jedna decyzja do podjęcia.
function Sekcja({ tytul, opis, children }) {
  return (
    <section className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold text-[#005698]">{tytul}</h4>
      {opis && <p className="text-xs text-gray-500 mt-0.5 mb-3">{opis}</p>}
      <div className={`space-y-4 ${opis ? "" : "mt-3"}`}>{children}</div>
    </section>
  );
}

export default function EventFormModal({ isOpen, event, onClose, onSaved }) {
  const isEdit = !!event;

  const [form, setForm] = useState(() => ({
    typ: event?.typ || "SZKOLENIE",
    tryb: event?.tryb || "STACJONARNE",
    title: event?.title || "",
    description: event?.description || "",
    startAt: toLocalInput(event?.startAt),
    endAt: toLocalInput(event?.endAt),
    prowadzacy: event?.prowadzacy || "",
    address: event?.address || "",
    onlineUrl: event?.onlineUrl || "",
    limitMiejsc: event?.limitMiejsc ?? "",
    registrationDeadline: toLocalInput(event?.registrationDeadline),
    cenaCzlonek: event?.cenaCzlonek ?? "",
    cenaNieczlonek: event?.cenaNieczlonek ?? "",
    pulaGratisNaFirme: event?.pulaGratisNaFirme ?? (event?.typ === "KONFERENCJA" ? 2 : 0),
    status: event?.status || "DRAFT",
    // UWAGA: `bankAccount` i `seriesName` celowo NIE są w formularzu — pola zostają w bazie,
    // ale nie zaśmiecają okna (numer konta będzie stały i pójdzie z konfiguracji, nazwa cyklu
    // na razie nie jest potrzebna). Nie wysyłamy ich, więc PATCH ich nie rusza, a POST da null.
  }));
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleTypChange = (typ) => {
    setForm((f) => {
      // Przy przełączeniu na konferencję podpowiedz pulę 2 (jeśli pusta/0); szkolenie → 0
      const pula =
        typ === "KONFERENCJA"
          ? f.pulaGratisNaFirme && Number(f.pulaGratisNaFirme) > 0
            ? f.pulaGratisNaFirme
            : 2
          : 0;
      return { ...f, typ, pulaGratisNaFirme: pula };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startAt) {
      toast.error("Tytuł i data rozpoczęcia są wymagane.");
      return;
    }
    setIsSaving(true);
    try {
      const url = isEdit ? `/api/admin/events/${event.id}` : "/api/admin/events";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd zapisu wydarzenia.");
      }
      const saved = await res.json();
      toast.success(isEdit ? "Zapisano zmiany." : "Utworzono wydarzenie.");
      onSaved(saved);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      {/* Okno nigdy nie wychodzi poza ekran: cała wysokość ograniczona do 90vh, a przewija się
          WYŁĄCZNIE treść formularza — nagłówek i przyciski zostają widoczne cały czas. */}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-[#005698]">
            {isEdit ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            <Sekcja tytul="Podstawowe informacje">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Typ</label>
                  <select
                    value={form.typ}
                    onChange={(e) => handleTypChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="SZKOLENIE">Szkolenie</option>
                    <option value="KONFERENCJA">Konferencja</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Forma</label>
                  <select
                    value={form.tryb}
                    onChange={(e) => set("tryb", e.target.value)}
                    className={inputCls}
                  >
                    <option value="STACJONARNE">Stacjonarnie</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Tytuł <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Opis (krótki)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </div>
            </Sekcja>

            <Sekcja
              tytul="Termin i miejsce"
              opis={
                form.tryb === "STACJONARNE"
                  ? "Adres trafia na stronę wydarzenia razem z mapką dojazdu."
                  : "Link do spotkania widzą osoby zapisane."
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Rozpoczęcie <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => set("startAt", e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Zakończenie</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => set("endAt", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Prowadzący</label>
                <input
                  type="text"
                  value={form.prowadzacy}
                  onChange={(e) => set("prowadzacy", e.target.value)}
                  className={inputCls}
                />
              </div>

              {form.tryb === "STACJONARNE" ? (
                <div>
                  <label className={labelCls}>Adres (do mapki na stronie)</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="ul. Przykładowa 1, 00-000 Warszawa"
                    className={inputCls}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Link do wydarzenia online</label>
                  <input
                    type="text"
                    value={form.onlineUrl}
                    onChange={(e) => set("onlineUrl", e.target.value)}
                    placeholder="https://…"
                    className={inputCls}
                  />
                </div>
              )}
            </Sekcja>

            <Sekcja
              tytul="Zapisy i ceny"
              opis="Puste ceny oznaczają udział bezpłatny. Gdy nie podasz końca rejestracji, zapisy zamkną się automatycznie z chwilą rozpoczęcia wydarzenia."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Cena członka (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cenaCzlonek}
                    onChange={(e) => set("cenaCzlonek", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Cena nie-członka (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cenaNieczlonek}
                    onChange={(e) => set("cenaNieczlonek", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  {/* Wyjaśnienie w podpowiedzi (tooltip), a nie w etykiecie — dopisek „(konferencje)”
                      łamał ją na dwie linie i rozjeżdżał siatkę względem sąsiednich pól. */}
                  <label className={`${labelCls} flex items-center gap-1`}>
                    <span>Pula gratis / firmę</span>
                    <span
                      className="inline-flex cursor-help"
                      title={
                        form.typ === "SZKOLENIE"
                          ? "Dotyczy tylko konferencji."
                          : "Ilu pracowników z jednej firmy członkowskiej może wziąć udział bezpłatnie (liczone po NIP-ie). Kolejne osoby z tej samej firmy płacą cenę członka."
                      }
                    >
                      <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.pulaGratisNaFirme}
                    onChange={(e) => set("pulaGratisNaFirme", e.target.value)}
                    disabled={form.typ === "SZKOLENIE"}
                    className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Limit miejsc</label>
                  <input
                    type="number"
                    min="0"
                    value={form.limitMiejsc}
                    onChange={(e) => set("limitMiejsc", e.target.value)}
                    placeholder="bez limitu"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Koniec rejestracji</label>
                  <input
                    type="datetime-local"
                    value={form.registrationDeadline}
                    onChange={(e) => set("registrationDeadline", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </Sekcja>

            <Sekcja
              tytul="Publikacja"
              opis="Zamknięte i zarchiwizowane wydarzenia zostają widoczne na pisil.pl — z informacją „Rejestracja zakończona”. Ukryty jest wyłącznie szkic."
            >
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className={inputCls}
                >
                  <option value="DRAFT">Szkic (niewidoczne publicznie)</option>
                  <option value="PUBLISHED">Opublikowane (rejestracja otwarta)</option>
                  <option value="CLOSED">Rejestracja zamknięta (widoczne na stronie)</option>
                  <option value="ARCHIVED">Zarchiwizowane (porządek w panelu)</option>
                </select>
              </div>
            </Sekcja>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
            >
              {isSaving ? "Zapisuję…" : isEdit ? "Zapisz zmiany" : "Utwórz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
