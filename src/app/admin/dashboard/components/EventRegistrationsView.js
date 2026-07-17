"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

const TIER_LABEL = {
  CZLONEK_GRATIS: "Członek (gratis)",
  CZLONEK_PLATNY: "Członek",
  NIECZLONEK: "Nie-członek",
};
// Poziom członkowski w barwie PISiL, nie-członek neutralnie — widać od razu, kto jest kim.
const TIER_STYLE = {
  CZLONEK_GRATIS: "bg-[#005698]/10 text-[#005698] ring-1 ring-[#005698]/25",
  CZLONEK_PLATNY: "bg-[#005698]/10 text-[#005698] ring-1 ring-[#005698]/25",
  NIECZLONEK: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
const TIER_OPTS = [
  ["CZLONEK_GRATIS", "Członek (gratis)"],
  ["CZLONEK_PLATNY", "Członek"],
  ["NIECZLONEK", "Nie-członek"],
];
const PLATNOSC_OPTS = [
  ["ZWOLNIONY", "Zwolniony"],
  ["OCZEKUJE", "Oczekuje"],
  ["OPLACONE", "Opłacone"],
];
const REJESTRACJA_OPTS = [
  ["POTWIERDZONA", "Potwierdzona"],
  ["LISTA_REZERWOWA", "Lista rezerwowa"],
  ["ANULOWANA", "Anulowana"],
];

const formatPln = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} zł`;
const formatDzien = (d) => (d ? new Date(d).toLocaleDateString("pl-PL") : "");

const selectCls =
  "text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:border-[#005698]";
const inputCls =
  "block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm text-gray-700";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

// Podpowiedź kwoty i statusu płatności dla wybranego poziomu — odbicie reguł z serwera
// (src/lib/services/eventPricing.js). Bez tego zmiana samego poziomu zostawiałaby bzdurny wiersz
// w rodzaju „członek gratis · 500 zł · oczekuje”.
function sugerujDlaPoziomu(event, tier) {
  if (tier === "CZLONEK_GRATIS") return { kwota: 0, statusPlatnosci: "ZWOLNIONY" };
  const cena =
    tier === "CZLONEK_PLATNY" ? Number(event.cenaCzlonek || 0) : Number(event.cenaNieczlonek || 0);
  return { kwota: cena, statusPlatnosci: cena > 0 ? "OCZEKUJE" : "ZWOLNIONY" };
}

export default function EventRegistrationsView({ event, onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); // modal anulowania (z dynamiczną rezerwą)
  const [promoteTarget, setPromoteTarget] = useState(null); // modal przeniesienia z listy rezerwowej

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations`);
      if (!res.ok) throw new Error("Błąd ładowania zgłoszeń");
      setRegistrations(await res.json());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => {
    const active = registrations.filter((r) => r.statusRejestracji !== "ANULOWANA");
    const potwierdzone = active.filter((r) => r.statusRejestracji === "POTWIERDZONA").length;
    const rezerwowa = active.filter((r) => r.statusRejestracji === "LISTA_REZERWOWA").length;
    const naleznosc = active
      .filter((r) => r.statusPlatnosci !== "ZWOLNIONY")
      .reduce((sum, r) => sum + Number(r.kwota || 0), 0);
    const oplacone = active
      .filter((r) => r.statusPlatnosci === "OPLACONE")
      .reduce((sum, r) => sum + Number(r.kwota || 0), 0);
    const doSprawdzenia = active.filter((r) => !r.zweryfikowane).length;
    return { potwierdzone, rezerwowa, naleznosc, oplacone, doSprawdzenia };
  }, [registrations]);

  const applyLocal = (updated) =>
    setRegistrations((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

  const patchReg = async (reg, payload, { optimistic = true } = {}) => {
    if (optimistic) applyLocal({ id: reg.id, ...payload });
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
      applyLocal(await res.json()); // serwer domyka pola pochodne (np. datę wpłaty)
    } catch (error) {
      toast.error(error.message);
      fetchRegistrations(); // przywróć stan z serwera
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Błąd usuwania");
      setRegistrations((prev) => prev.filter((r) => r.id !== deleting.id));
      toast.success("Usunięto zgłoszenie.");
      setDeleting(null);
    } catch (error) {
      toast.error(error.message);
      setDeleting(null);
    }
  };

  const handleAdded = (reg) => {
    setRegistrations((prev) => [...prev, reg]);
    setIsAddOpen(false);
  };

  // Pierwsza osoba z listy rezerwowej = najstarsze zgłoszenie (tak samo liczy serwer).
  const firstWaitlisted = useMemo(() => {
    return registrations
      .filter((r) => r.statusRejestracji === "LISTA_REZERWOWA")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] || null;
  }, [registrations]);

  // Zmiana statusu w tabeli. Dwa przejścia niosą maila i wymagają decyzji, więc otwierają modal
  // zamiast zapisywać po cichu: ANULOWANA (+ ewentualne przeniesienie rezerwowego) oraz
  // LISTA_REZERWOWA → POTWIERDZONA (email „zwolniło się miejsce"). Reszta zapisuje się od razu.
  const handleStatusChange = (reg, nowy) => {
    if (nowy === reg.statusRejestracji) return;
    if (nowy === "ANULOWANA") {
      setCancelTarget(reg);
    } else if (nowy === "POTWIERDZONA" && reg.statusRejestracji === "LISTA_REZERWOWA") {
      setPromoteTarget(reg);
    } else {
      patchReg(reg, { statusRejestracji: nowy });
    }
  };

  const handleSaved = (reg) => {
    applyLocal(reg);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Powrót"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{event.title}</h2>
            <p className="text-sm text-gray-500">Zgłoszenia na wydarzenie</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm flex-shrink-0"
        >
          + Dopisz uczestnika
        </button>
      </div>

      {/* Podsumowanie */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBox label="Potwierdzone" value={summary.potwierdzone} />
        <StatBox label="Lista rezerwowa" value={summary.rezerwowa} />
        <StatBox label="Należność" value={formatPln(summary.naleznosc)} />
        <StatBox label="Opłacone" value={formatPln(summary.oplacone)} />
        <StatBox label="Do sprawdzenia" value={summary.doSprawdzenia} przygaszony={summary.doSprawdzenia === 0} />
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Ładowanie zgłoszeń…</p>
      ) : registrations.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Brak zgłoszeń na to wydarzenie.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["", "Uczestnik", "Firma / NIP", "Poziom", "Kwota", "Płatność", "Rejestracja", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {registrations.map((r) => {
                const anulowana = r.statusRejestracji === "ANULOWANA";
                return (
                  <tr
                    key={r.id}
                    className={anulowana ? "bg-gray-50/70 text-gray-400" : "hover:bg-gray-50"}
                  >
                    {/* Szybkie oznaczenie „sprawdzone” — jeden klik, bez otwierania okna */}
                    <td className="pl-3 pr-0 py-2">
                      <button
                        onClick={() => patchReg(r, { zweryfikowane: !r.zweryfikowane })}
                        title={
                          r.zweryfikowane
                            ? `Sprawdzone${r.zweryfikowaneAt ? ` — ${formatDzien(r.zweryfikowaneAt)}` : ""}. Kliknij, aby cofnąć.`
                            : "Oznacz jako sprawdzone (poziom i kwota zweryfikowane)"
                        }
                        className="align-middle"
                      >
                        {r.zweryfikowane ? (
                          <CheckCircleSolid className="h-5 w-5 text-[#005698]" />
                        ) : (
                          <CheckCircleIcon className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-medium ${anulowana ? "line-through text-gray-400" : "text-gray-800"}`}
                        >
                          {r.firstName} {r.lastName}
                        </span>
                        {r.zrodlo === "ADMIN" && (
                          <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200">
                            ręczne
                          </span>
                        )}
                        {r.notatka && (
                          <span title={r.notatka} className="inline-flex cursor-help">
                            <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5 text-gray-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{r.email || "— brak e-maila —"}</div>
                      <div className="text-xs text-gray-400">zgłoszenie: {formatDzien(r.createdAt)}</div>
                    </td>

                    <td className="px-3 py-2">
                      <div className={anulowana ? "text-gray-400" : "text-gray-800"}>{r.firmaNazwa}</div>
                      <div className="text-xs text-gray-500">{r.firmaNip || "— brak NIP —"}</div>
                      {r.matchedMemberId && (
                        <span
                          title="NIP rozpoznany w kartotece członków PISiL"
                          className="inline-flex mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#005698]/10 text-[#005698]"
                        >
                          Członek PISiL
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLE[r.tier] || ""}`}
                      >
                        {TIER_LABEL[r.tier] || r.tier}
                      </span>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className={anulowana ? "text-gray-400" : "text-gray-800"}>
                        {formatPln(r.kwota)}
                      </div>
                      {r.oplaconeAt && (
                        <div className="text-xs text-gray-400">wpłata: {formatDzien(r.oplaconeAt)}</div>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={r.statusPlatnosci}
                        onChange={(e) => patchReg(r, { statusPlatnosci: e.target.value })}
                        className={selectCls}
                      >
                        {PLATNOSC_OPTS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={r.statusRejestracji}
                        onChange={(e) => handleStatusChange(r, e.target.value)}
                        className={selectCls}
                      >
                        {REJESTRACJA_OPTS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditing(r)}
                        className="text-xs font-medium text-[#005698] hover:underline mr-3"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setDeleting(r)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAddOpen && (
        <AddParticipantModal
          eventId={event.id}
          onClose={() => setIsAddOpen(false)}
          onAdded={handleAdded}
        />
      )}

      {/* key → remount przy zmianie zgłoszenia; bez tego stan formularza mógłby zostać po poprzednim
          uczestniku i zapisać jego dane pod cudzym identyfikatorem. */}
      {editing && (
        <EditRegistrationModal
          key={editing.id}
          event={event}
          registration={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {cancelTarget && (
        <CancelModal
          eventId={event.id}
          reg={cancelTarget}
          firstWaitlisted={firstWaitlisted}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            setCancelTarget(null);
            fetchRegistrations();
          }}
        />
      )}

      {promoteTarget && (
        <PromoteModal
          eventId={event.id}
          reg={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onDone={() => {
            setPromoteTarget(null);
            fetchRegistrations();
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Usuń zgłoszenie"
        message={
          deleting
            ? `Usunięcie zgłoszenia „${deleting.firstName} ${deleting.lastName}” jest trwałe — zniknie też ślad wpłaty i zgody RODO. Jeśli uczestnik się wycofał, lepiej ustawić rejestrację na „Anulowana”: zgłoszenie zostanie w historii, ale wypadnie z podsumowań.`
            : ""
        }
        confirmButtonText="Usuń"
      />
    </div>
  );
}

function StatBox({ label, value, przygaszony = false }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${przygaszony ? "text-gray-300" : "text-[#005698]"}`}>
        {value}
      </p>
    </div>
  );
}

// -------- Modal pełnej edycji zgłoszenia --------
// Oferta poz. 3 obiecuje: „weryfikację zawsze mogą Państwo skorygować ręcznie”. Kluczowe: poziom,
// kwota i status płatności zapisywane RAZEM — zmiana poziomu podpowiada pozostałe dwa.
function EditRegistrationModal({ event, registration, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    firstName: registration.firstName || "",
    lastName: registration.lastName || "",
    email: registration.email || "",
    firmaNazwa: registration.firmaNazwa || "",
    firmaNip: registration.firmaNip || "",
    firmaAdres: registration.firmaAdres || "",
    tier: registration.tier,
    kwota: registration.kwota ?? "",
    statusPlatnosci: registration.statusPlatnosci,
    statusRejestracji: registration.statusRejestracji,
    zgodaRodo: !!registration.zgodaRodo,
    obecny: registration.obecny === null || registration.obecny === undefined ? "" : String(registration.obecny),
    notatka: registration.notatka || "",
    zweryfikowane: !!registration.zweryfikowane,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const set = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  // Zmiana poziomu przelicza kwotę i status płatności — admin może je potem nadpisać ręcznie.
  const handleTierChange = (tier) => {
    const s = sugerujDlaPoziomu(event, tier);
    setForm((f) => ({ ...f, tier, kwota: s.kwota, statusPlatnosci: s.statusPlatnosci }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.firmaNazwa.trim()) {
      toast.error("Imię, nazwisko i nazwa firmy są wymagane.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        obecny: form.obecny === "" ? null : form.obecny === "true",
      };
      const res = await fetch(
        `/api/admin/events/${event.id}/registrations/${registration.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd zapisu zgłoszenia.");
      }
      toast.success("Zapisano zmiany w zgłoszeniu.");
      onSaved(await res.json());
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
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-[#005698]">Edytuj zgłoszenie</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {registration.firstName} {registration.lastName} · {event.title}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            <section>
              <h4 className="text-sm font-semibold text-[#005698] mb-3">Uczestnik</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Imię <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Nazwisko <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>E-email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-[#005698]">Firma</h4>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                NIP decyduje o rozpoznaniu członka — po jego zmianie dopasowanie policzy się od nowa.
                Adres jest potrzebny do faktury i trafia na listę dla biura rachunkowego.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Nazwa firmy <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firmaNazwa}
                      onChange={(e) => set("firmaNazwa", e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>NIP</label>
                    <input
                      type="text"
                      value={form.firmaNip}
                      onChange={(e) => set("firmaNip", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Adres do faktury</label>
                  <input
                    type="text"
                    value={form.firmaAdres}
                    onChange={(e) => set("firmaAdres", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-[#005698]">Poziom i płatność</h4>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Zmiana poziomu podpowiada kwotę i status płatności — obie wartości możesz potem
                poprawić ręcznie (np. większa pula bezpłatnych miejsc dla firmy z komisji).
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Poziom</label>
                    <select
                      value={form.tier}
                      onChange={(e) => handleTierChange(e.target.value)}
                      className={inputCls}
                    >
                      {TIER_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Kwota (zł)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.kwota}
                      onChange={(e) => set("kwota", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Płatność</label>
                    <select
                      value={form.statusPlatnosci}
                      onChange={(e) => set("statusPlatnosci", e.target.value)}
                      className={inputCls}
                    >
                      {PLATNOSC_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Rejestracja</label>
                    <select
                      value={form.statusRejestracji}
                      onChange={(e) => set("statusRejestracji", e.target.value)}
                      className={inputCls}
                    >
                      {REJESTRACJA_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Obecność</label>
                    <select
                      value={form.obecny}
                      onChange={(e) => set("obecny", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Nieoznaczona</option>
                      <option value="true">Obecny</option>
                      <option value="false">Nieobecny</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-[#005698] mb-3">Pozostałe</h4>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Notatka</label>
                  <textarea
                    value={form.notatka}
                    onChange={(e) => set("notatka", e.target.value)}
                    rows={2}
                    className={inputCls}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.zgodaRodo}
                    onChange={(e) => set("zgodaRodo", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
                  />
                  <span>
                    Uczestnik wyraził zgodę RODO
                    <span className="block text-xs text-gray-500">
                      {registration.zgodaRodoAt
                        ? `Zgoda odnotowana ${formatDzien(registration.zgodaRodoAt)}.`
                        : "Brak zgody w rejestrze."}
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.zweryfikowane}
                    onChange={(e) => set("zweryfikowane", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
                  />
                  <span>
                    Sprawdzone
                    <span className="block text-xs text-gray-500">
                      Poziom i kwota zweryfikowane — zgłoszenie zniknie z licznika „Do sprawdzenia”.
                    </span>
                  </span>
                </label>
              </div>
            </section>
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
              {isSaving ? "Zapisuję…" : "Zapisz zmiany"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------- Modal ręcznego dopisania uczestnika --------
function AddParticipantModal({ eventId, onClose, onAdded }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    firmaNazwa: "",
    firmaNip: "",
    firmaAdres: "",
    notatka: "",
    zgodaRodo: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const set = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.firmaNazwa.trim()) {
      toast.error("Imię, nazwisko i nazwa firmy są wymagane.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd dopisywania.");
      }
      const reg = await res.json();
      toast.success("Dopisano uczestnika. Poziom cenowy wyliczony automatycznie.");
      onAdded(reg);
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
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-[#005698]">Dopisz uczestnika</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Poziom cenowy policzymy po NIP-ie. Bez NIP-u traktujemy jak nie-członka.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Imię <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Nazwisko <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>E-email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Nazwa firmy <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firmaNazwa}
                onChange={(e) => set("firmaNazwa", e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>NIP</label>
                <input
                  type="text"
                  value={form.firmaNip}
                  onChange={(e) => set("firmaNip", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Adres do faktury</label>
                <input
                  type="text"
                  value={form.firmaAdres}
                  onChange={(e) => set("firmaAdres", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notatka</label>
              <input
                type="text"
                value={form.notatka}
                onChange={(e) => set("notatka", e.target.value)}
                className={inputCls}
              />
            </div>
            {/* Zgoda RODO: osoba dopisana telefonicznie niczego nie kliknęła — rejestr zgód ma
                odzwierciedlać stan faktyczny, więc admin musi to potwierdzić świadomie. */}
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.zgodaRodo}
                onChange={(e) => set("zgodaRodo", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
              />
              <span>
                Uczestnik wyraził zgodę RODO (odebrana telefonicznie lub mailem).
                <span className="block text-xs text-gray-500">
                  Niezaznaczone = w rejestrze zapiszemy brak zgody. Zgodę trzeba odebrać osobno.
                </span>
              </span>
            </label>
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
              {isSaving ? "Zapisuję…" : "Dopisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------- Modal anulowania (z dynamicznym przeniesieniem pierwszej osoby z listy rezerwowej) --------
function CancelModal({ eventId, reg, firstWaitlisted, onClose, onDone }) {
  // Nie proponujemy przeniesienia osoby, którą właśnie anulujemy (gdy sama jest na liście rezerwowej).
  const waitlisted = firstWaitlisted && firstWaitlisted.id !== reg.id ? firstWaitlisted : null;

  const [notifyCancelled, setNotifyCancelled] = useState(!!reg.email);
  const [promoteWaitlisted, setPromoteWaitlisted] = useState(!!waitlisted);
  const [notifyWaitlisted, setNotifyWaitlisted] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrations/${reg.id}/actions/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyCancelled,
          promoteWaitlisted: !!waitlisted && promoteWaitlisted,
          notifyWaitlisted,
        }),
      });
      if (!res.ok) throw new Error("Nie udało się anulować.");
      const w = await res.json();
      const parts = ["Anulowano zgłoszenie"];
      if (w.emails?.cancelled?.sent) parts.push("wysłano powiadomienie");
      if (w.promoted)
        parts.push(`przeniesiono ${w.promoted.firstName} ${w.promoted.lastName} z listy rezerwowej`);
      toast.success(parts.join(", ") + ".");
      onDone();
    } catch (e) {
      toast.error(e.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">Anuluj zgłoszenie</h3>
        <p className="text-sm text-gray-600">
          Anulujesz zgłoszenie: <span className="font-medium text-gray-800">{reg.firstName} {reg.lastName}</span>
          {reg.email ? ` (${reg.email})` : ""}. Zostanie w historii ze statusem „Anulowana", ale wypadnie z podsumowań.
        </p>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifyCancelled}
            disabled={!reg.email}
            onChange={(e) => setNotifyCancelled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
          />
          <span>Wyślij email o anulowaniu {reg.email ? `do ${reg.email}` : "(brak e-maila — nie wyślemy)"}</span>
        </label>

        {waitlisted && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
            <p className="text-sm text-gray-700">
              Na liście rezerwowej pierwsza:{" "}
              <span className="font-medium">{waitlisted.firstName} {waitlisted.lastName}</span>
              <span className="text-gray-500"> (zapisana {formatDzien(waitlisted.createdAt)})</span>
            </p>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={promoteWaitlisted}
                onChange={(e) => setPromoteWaitlisted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
              />
              <span>Przenieś ją na zwolnione miejsce (status → Potwierdzona)</span>
            </label>
            {promoteWaitlisted && (
              <label className="flex items-start gap-2 text-sm text-gray-700 pl-6">
                <input
                  type="checkbox"
                  checked={notifyWaitlisted}
                  disabled={!waitlisted.email}
                  onChange={(e) => setNotifyWaitlisted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
                />
                <span>i wyślij jej „zwolniło się miejsce" (kwota, konto, prośba o potwierdzenie)</span>
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Zamknij
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
          >
            {isSaving ? "Anuluję…" : "Anuluj zgłoszenie"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Modal przeniesienia z listy rezerwowej na potwierdzone --------
function PromoteModal({ eventId, reg, onClose, onDone }) {
  const [notify, setNotify] = useState(!!reg.email);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrations/${reg.id}/actions/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify }),
      });
      if (!res.ok) throw new Error("Nie udało się przenieść.");
      const w = await res.json();
      toast.success(w.email?.sent ? "Przeniesiono i wysłano powiadomienie." : "Przeniesiono na miejsce potwierdzone.");
      onDone();
    } catch (e) {
      toast.error(e.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">Przenieś z listy rezerwowej</h3>
        <p className="text-sm text-gray-600">
          Przenosisz <span className="font-medium text-gray-800">{reg.firstName} {reg.lastName}</span> na miejsce
          potwierdzone. Status zmieni się od razu — miejsce przestanie być wolne, więc nikt z formularza go nie podbierze.
        </p>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notify}
            disabled={!reg.email}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
          />
          <span>
            Wyślij email „zwolniło się miejsce" (kwota, konto, prośba o potwierdzenie w ciągu 3 dni)
            {!reg.email && " — brak e-maila, nie wyślemy"}
          </span>
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Zamknij
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
          >
            {isSaving ? "Przenoszę…" : "Przenieś"}
          </button>
        </div>
      </div>
    </div>
  );
}
