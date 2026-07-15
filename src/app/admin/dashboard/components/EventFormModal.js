"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { InformationCircleIcon, PaperClipIcon } from "@heroicons/react/24/outline";

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

// Rozwijane bloki na stronie wydarzenia — odwzorowanie tego, co dotąd było dodawane ręcznie
// w Elementorze. Kolejność jak na pisil.pl: najpierw informacje, potem program, a galeria
// i relacja dochodzą po wydarzeniu.
const SEKCJE_DEF = [
  {
    klucz: "INFORMACJE",
    tytul: "Informacje",
    placeholder:
      "Zostaw puste, a pokażemy tutaj opis wydarzenia z sekcji „Podstawowe informacje”. Wpisz coś, żeby go zastąpić.",
  },
  {
    klucz: "PROGRAM",
    tytul: "Program",
    placeholder: "Np. ramowy plan dnia. Możesz zamiast tego (albo dodatkowo) dołączyć plik z programem.",
  },
  {
    klucz: "GALERIA",
    tytul: "Galeria zdjęć",
    placeholder: "Zwykle uzupełniane po wydarzeniu — np. link do galerii zdjęć.",
  },
  {
    klucz: "RELACJA",
    tytul: "Relacja wideo",
    placeholder: "Zwykle uzupełniane po wydarzeniu — np. link do playlisty na YouTube.",
  },
];

const sekcjaPusta = (s) => !s.tekst.trim() && !s.link.trim() && !s.plikNazwa && !s.nowyPlik;

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
    // UWAGA: `bankAccount` celowo NIE jest w formularzu — pole zostaje w bazie, ale numer konta
    // będzie stały i pójdzie z konfiguracji. Nie wysyłamy go, więc PATCH go nie rusza, a POST da null.
  }));

  // Treści rozwijanych bloków. Plik trzymamy jako obiekt do wysłania — wyślemy go dopiero,
  // gdy wydarzenie ma już swój identyfikator (przy nowym powstaje dopiero po zapisie).
  const [sekcje, setSekcje] = useState(() => {
    const stan = {};
    for (const d of SEKCJE_DEF) {
      const istniejaca = (event?.sections || []).find((s) => s.klucz === d.klucz);
      stan[d.klucz] = {
        tekst: istniejaca?.tekst || "",
        link: istniejaca?.link || "",
        plikNazwa: istniejaca?.plikNazwa || "",
        nowyPlik: null,
        usunPlik: false,
      };
    }
    return stan;
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setSekcja = (klucz, pole, wartosc) =>
    setSekcje((s) => ({ ...s, [klucz]: { ...s[klucz], [pole]: wartosc } }));

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

      // Bloki dopiero teraz — przy nowym wydarzeniu identyfikator (a więc i miejsce na plik)
      // powstaje razem z nim.
      const zapisaneSekcje = await zapiszSekcje(saved.id);

      toast.success(isEdit ? "Zapisano zmiany." : "Utworzono wydarzenie.");
      onSaved({ ...saved, sections: zapisaneSekcje });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Zapis idzie blok po bloku (jeden na raz) — bloki niosą pliki, więc nie ma po co
  // zasypywać serwera równoległymi wysyłkami.
  const zapiszSekcje = async (eventId) => {
    const wynik = [];
    for (const d of SEKCJE_DEF) {
      const s = sekcje[d.klucz];
      const istniala = (event?.sections || []).some((x) => x.klucz === d.klucz);
      if (!istniala && sekcjaPusta(s)) continue; // nic nie było i nic nie ma — nie ruszamy serwera

      const fd = new FormData();
      fd.append("tekst", s.tekst);
      fd.append("link", s.link);
      if (s.nowyPlik) fd.append("file", s.nowyPlik);
      if (s.usunPlik) fd.append("usunPlik", "1");

      // eslint-disable-next-line no-await-in-loop
      const odp = await fetch(`/api/admin/events/${eventId}/sections/${d.klucz.toLowerCase()}`, {
        method: "PUT",
        body: fd,
      });
      if (!odp.ok) throw new Error(`Nie udało się zapisać bloku „${d.tytul}”.`);
      // eslint-disable-next-line no-await-in-loop
      const zapisana = await odp.json();
      if (!zapisana.pusty) wynik.push(zapisana);
    }
    return wynik;
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
              tytul="Treści na stronie (rozwijane bloki)"
              opis="Wypełnij tylko to, co chcesz pokazać — pusty blok NIE pojawi się na pisil.pl. Każdy blok może mieć tekst, plik i link (dowolnie, także wszystko naraz). Treści można dokładać stopniowo: program przed wydarzeniem, galerię i relację po nim."
            >
              <div className="space-y-3">
                {SEKCJE_DEF.map((d) => {
                  const s = sekcje[d.klucz];
                  const pusty = sekcjaPusta(s);
                  return (
                    <div key={d.klucz} className="rounded-md border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{d.tytul}</span>
                        {/* Od razu widać, co wyląduje na stronie, a co nie — bez zgadywania. */}
                        <span
                          className={`text-[10px] rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${
                            pusty
                              ? "bg-gray-100 text-gray-500"
                              : "bg-[#005698]/10 text-[#005698]"
                          }`}
                        >
                          {pusty
                            ? d.klucz === "INFORMACJE"
                              ? "pokażemy opis wydarzenia"
                              : "nie pojawi się"
                            : "będzie widoczny"}
                        </span>
                      </div>

                      <textarea
                        value={s.tekst}
                        onChange={(e) => setSekcja(d.klucz, "tekst", e.target.value)}
                        rows={2}
                        placeholder={d.placeholder}
                        className={inputCls}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="url"
                          value={s.link}
                          onChange={(e) => setSekcja(d.klucz, "link", e.target.value)}
                          placeholder="Link (opcjonalnie), np. https://…"
                          className={inputCls}
                        />

                        {s.nowyPlik ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700 border border-gray-300 rounded-md p-2">
                            <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate flex-1">{s.nowyPlik.name}</span>
                            <button
                              type="button"
                              onClick={() => setSekcja(d.klucz, "nowyPlik", null)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cofnij
                            </button>
                          </div>
                        ) : s.plikNazwa && !s.usunPlik ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700 border border-gray-300 rounded-md p-2">
                            <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate flex-1">{s.plikNazwa}</span>
                            <button
                              type="button"
                              onClick={() => setSekcja(d.klucz, "usunPlik", true)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Usuń
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              onChange={(e) => {
                                setSekcja(d.klucz, "nowyPlik", e.target.files?.[0] || null);
                                setSekcja(d.klucz, "usunPlik", false);
                              }}
                              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#005698]/10 file:text-[#005698] hover:file:bg-[#005698]/20"
                            />
                            {s.usunPlik && (
                              <p className="text-[11px] text-red-600 mt-1">
                                Dotychczasowy plik zostanie usunięty przy zapisie.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
