"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { TEMPLATES, getTemplate } from "@/lib/eventMailTemplate";
import { MAX_ATTACHMENTS_BYTES } from "@/lib/services/eventBulkMail";

const formatMb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

const inputCls =
  "block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm text-gray-700";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const FILTER_LABELS = {
  CONFIRMED: "Wszyscy potwierdzeni",
  PAID: "Tylko opłaceni",
  WAITLIST: "Lista rezerwowa",
  CONFIRMED_AND_WAITLIST: "Potwierdzeni + lista rezerwowa",
};

// Odbicie grup odbiorców z serwera (src/lib/services/eventBulkMail.js) — tu tylko do policzenia
// podglądu. Źródłem prawdy przy wysyłce jest serwer; anulowani nie należą do żadnej grupy.
function matchesFilter(r, f) {
  const potwierdzona = r.statusRejestracji === "POTWIERDZONA";
  const rezerwowa = r.statusRejestracji === "LISTA_REZERWOWA";
  if (f === "CONFIRMED") return potwierdzona;
  if (f === "PAID") return potwierdzona && r.statusPlatnosci === "OPLACONE";
  if (f === "WAITLIST") return rezerwowa;
  if (f === "CONFIRMED_AND_WAITLIST") return potwierdzona || rezerwowa;
  return false;
}

const hasEmail = (r) => !!(r.email && r.email.includes("@"));
const normalize = (e) => e.trim().toLowerCase();

// Klucz „co zostało przetestowane" — pozwala unieważnić test po każdej zmianie treści.
const contentKey = (subject, body) => `${subject} ${body}`;

// -------- Modal masowej wysyłki do zapisanych --------
// Jedna treść dla wszystkich (WYSIWYG — bez placeholderów per-osoba). Wysyłka idzie przez kolejkę
// (worker: idempotentnie, partiami pod limit Exchange), każdy dostaje osobnego maila (RODO: jeden adres
// w polu DO). Test do siebie jest OBOWIĄZKOWY — bez niego wysyłka jest zablokowana, a zmiana tematu lub
// treści po teście wymaga ponownego testu. Zamknięcie klikiem poza modalem WYŁĄCZONE (łatwo o utratę
// długiej wiadomości). Rodzaj wiadomości determinuje dozwolone grupy odbiorców — patrz TEMPLATES.
export default function BulkMailModal({ event, registrations, onClose, onEnqueued, initialTemplate = "INFO" }) {
  const [template, setTemplate] = useState(getTemplate(initialTemplate) ? initialTemplate : "INFO");
  const tpl = getTemplate(template);

  const [recipientFilter, setRecipientFilter] = useState(tpl.allowedFilters[0]);
  const [{ subject, body }, setTresc] = useState(() => tpl.build(event));
  const [attachments, setAttachments] = useState([]); // {path, filename, size, mimeType}
  const [isUploading, setIsUploading] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testedKey, setTestedKey] = useState(null); // treść, która przeszła test do siebie
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Zmiana rodzaju podmienia temat, treść i grupę odbiorców — dlatego wybiera się go PIERWSZY.
  const changeTemplate = (kind) => {
    const nowy = getTemplate(kind);
    if (!nowy) return;
    setTemplate(kind);
    setRecipientFilter(nowy.allowedFilters[0]);
    setTresc(nowy.build(event));
    setTestedKey(null); // nowa treść = test trzeba powtórzyć
  };

  const setSubject = (v) => setTresc((s) => ({ ...s, subject: v }));
  const setBody = (v) => setTresc((s) => ({ ...s, body: v }));

  // Liczniki liczone na żywo z aktualnego stanu tabeli. Rozbicie na opłaconych, zwolnionych z opłaty
  // (gratis) i zalegających — inaczej „opłaceni: 0" i „1 bez wpłaty" wyglądają sprzecznie, choć się sumują.
  const stats = useMemo(() => {
    const pool = registrations.filter((r) => matchesFilter(r, recipientFilter));
    const emails = new Set(pool.filter(hasEmail).map((r) => normalize(r.email)));
    return {
      recipientCount: emails.size,
      noEmail: pool.filter((r) => !hasEmail(r)).length,
      poolCount: pool.length,
      exempt: pool.filter((r) => r.statusPlatnosci === "ZWOLNIONY").length,
      owed: pool.filter((r) => r.statusPlatnosci === "OCZEKUJE").length,
    };
  }, [registrations, recipientFilter]);

  const countFor = (f) =>
    new Set(registrations.filter((r) => matchesFilter(r, f)).filter(hasEmail).map((r) => normalize(r.email))).size;

  const rozmiarZalacznikow = attachments.reduce((s, a) => s + a.size, 0);
  const zaDuzo = rozmiarZalacznikow > MAX_ATTACHMENTS_BYTES;

  // Twarda walidacja: maila z linkiem nie da się wysłać, gdy wydarzenie nie ma zapisanego linku.
  const brakLinku = !!tpl.requiresOnlineUrl && !(event.onlineUrl || "").trim();
  const trescPusta = !subject.trim() || !body.trim();
  const brakOdbiorcow = stats.recipientCount === 0;
  const testZgodnyZTrescia = testedKey !== null && testedKey === contentKey(subject, body);
  // isUploading w blokadzie: dopóki plik leci do chmury, nie wolno ani wysłać, ani testować — inaczej
  // poszłaby wiadomość bez załącznika albo test bez niego.
  const zablokowane = trescPusta || brakOdbiorcow || brakLinku || zaDuzo || isUploading;

  // Plik ląduje w chmurze od razu przy wyborze — okno nie musi wtedy nieść megabajtów przy wysyłce,
  // a test do siebie może użyć dokładnie tego samego pliku.
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // pozwala wybrać ten sam plik ponownie po usunięciu
    if (!file) return;
    if (rozmiarZalacznikow + file.size > MAX_ATTACHMENTS_BYTES) {
      return toast.error(`Załączniki przekroczyłyby limit ${formatMb(MAX_ATTACHMENTS_BYTES)}.`);
    }
    // Test unieważniamy OD RAZU, jeszcze przed wysłaniem pliku. Gdyby dopiero po odpowiedzi serwera,
    // przez cały czas wgrywania przycisk „Wyślij" zostawałby odblokowany starym testem i dało się wysłać
    // kampanię BEZ załącznika, mimo że treść go obiecuje.
    setTestedKey(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/events/${event.id}/actions/attachments`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Nie udało się wgrać pliku.");
      setAttachments((prev) => [...prev, d]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (path) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
    setTestedKey(null);
    // Sprzątamy plik z chmury — kampania jeszcze nie istnieje, więc nic go nie trzyma.
    fetch(`/api/admin/events/${event.id}/actions/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  };

  const handleTest = async () => {
    if (trescPusta) return toast.error("Uzupełnij temat i treść przed wysyłką testową.");
    if (brakLinku) return toast.error("Uzupełnij link do spotkania w edycji wydarzenia.");
    if (!testTo.trim()) return toast.error("Podaj adres do wysyłki testowej.");
    setIsTesting(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/actions/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, to: testTo.trim(), attachments }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Nie udało się wysłać testu.");
      }
      setTestedKey(contentKey(subject, body)); // odblokowuje wysyłkę dla DOKŁADNIE tej treści
      toast.success(`Wysłano testowy na ${testTo.trim()}. Sprawdź skrzynkę.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Właściwa wysyłka — wywoływana przez modal potwierdzenia (onConfirm). Nie rzucamy dalej błędu,
  // żeby modal potwierdzenia został otwarty i dało się ponowić; na sukcesie zamykamy całość.
  const handleSend = async () => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}/actions/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipientFilter, template, attachments }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Nie udało się zakolejkować wysyłki.");
      onEnqueued(d); // rodzic pokazuje toast z „Cofnij" i odświeża statusy
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      {/* Brak onClick na tle — klik poza modalem NIE zamyka (ochrona przed utratą długiej wiadomości). */}
      <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-bold text-[#005698]">Wyślij wiadomość do zapisanych</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {event.title} · każdy odbiorca dostaje osobnego maila (adresy nie są widoczne między sobą)
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            {/* Rodzaj wiadomości — wybierany PIERWSZY, bo ustawia treść i grupę odbiorców */}
            <section>
              <label className={labelCls}>Rodzaj wiadomości</label>
              <select value={template} onChange={(e) => changeTemplate(e.target.value)} className={inputCls}>
                {Object.entries(TEMPLATES).map(([kind, t]) => (
                  <option key={kind} value={kind}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Zmiana rodzaju podmienia temat, treść i grupę odbiorców — wybierz go przed pisaniem.
              </p>
            </section>

            {/* Odbiorcy — tylko grupy dozwolone dla tego rodzaju wiadomości */}
            <section>
              <label className={labelCls}>Odbiorcy</label>
              <div className="space-y-2">
                {tpl.allowedFilters.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="recipientFilter"
                      checked={recipientFilter === f}
                      onChange={() => setRecipientFilter(f)}
                      className="h-4 w-4 border-gray-300 text-[#005698] focus:ring-[#005698]"
                    />
                    <span>
                      {FILTER_LABELS[f]} <span className="text-gray-500">({countFor(f)})</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Blokada: mail z linkiem bez linku */}
            {brakLinku && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                To wydarzenie nie ma zapisanego linku do spotkania. Uzupełnij go w edycji wydarzenia —
                inaczej uczestnicy dostaliby wiadomość bez linku. Wysyłka jest zablokowana.
              </div>
            )}

            {/* Temat + treść */}
            <section className="space-y-4">
              <div>
                <label className={labelCls}>Temat</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Treść</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">
                  Zwykły tekst. Pusta linia rozdziela akapity. Ta sama treść trafi do wszystkich odbiorców.
                </p>
              </div>
            </section>

            {/* Załączniki — np. program w PDF. Plik trafia do chmury od razu, wysyłka dokleja go każdemu. */}
            <section>
              <label className={labelCls}>Załączniki</label>
              {attachments.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {attachments.map((a) => (
                    <li
                      key={a.path}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="text-gray-700 truncate">
                        {a.filename} <span className="text-gray-400">({formatMb(a.size)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(a.path)}
                        className="text-xs text-red-600 hover:text-red-800 flex-shrink-0"
                      >
                        Usuń
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="file"
                onChange={handleUpload}
                disabled={isUploading}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#005698]/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#005698] hover:file:bg-[#005698]/20 disabled:opacity-50"
              />
              <p className={`text-xs mt-1 ${zaDuzo ? "text-red-600" : "text-gray-500"}`}>
                {isUploading
                  ? "Wgrywam plik…"
                  : `Łącznie ${formatMb(rozmiarZalacznikow)} z ${formatMb(MAX_ATTACHMENTS_BYTES)}. Każdy odbiorca dostaje własną kopię, więc duże pliki wydłużają wysyłkę.`}
              </p>
            </section>

            {/* Notatki o odbiorcach — w barwach aplikacji. Rozbicie sumuje się do liczby w grupie. */}
            {(stats.noEmail > 0 || (recipientFilter === "CONFIRMED" && stats.owed > 0)) && (
              <div className="rounded-md border border-[#005698]/20 bg-[#005698]/5 p-3 text-xs text-[#005698] space-y-1">
                {stats.noEmail > 0 && (
                  <p>{stats.noEmail} zgłosz. bez poprawnego adresu e-mail — te osoby zostaną pominięte.</p>
                )}
                {recipientFilter === "CONFIRMED" && stats.owed > 0 && (
                  <p>
                    {stats.owed} z {stats.poolCount} potwierdzonych ma nieuregulowaną wpłatę
                    {stats.exempt > 0 ? ` (${stats.exempt} zwolnionych z opłaty)` : ""} — wiadomość dostaną wszyscy.
                  </p>
                )}
              </div>
            )}

            {/* Test do siebie — OBOWIĄZKOWY, odblokowuje wysyłkę */}
            <section className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className={labelCls}>Najpierw wyślij testowy do siebie (wymagane)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="twój@email"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || isUploading || trescPusta || brakLinku}
                  className="px-4 py-2 text-sm font-medium text-[#005698] bg-white border border-[#005698]/40 rounded-md hover:bg-[#005698]/5 disabled:opacity-50 whitespace-nowrap"
                >
                  {isTesting ? "Wysyłam…" : "Wyślij testowy"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {testZgodnyZTrescia
                  ? "✓ Treść przetestowana — wysyłka odblokowana. Zmiana tematu lub treści wymaga ponownego testu."
                  : "To jedyny sposób zobaczyć, jak wiadomość wygląda w skrzynce. Temat testu ma prefiks [TEST]."}
              </p>
            </section>
          </div>

          {/* Stopka */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {isUploading
                  ? "Trwa wgrywanie załącznika…"
                  : zaDuzo
                  ? `Załączniki przekraczają limit ${formatMb(MAX_ATTACHMENTS_BYTES)}.`
                  : brakLinku
                  ? "Brakuje linku do spotkania."
                  : brakOdbiorcow
                    ? "Brak odbiorców w wybranej grupie."
                    : !testZgodnyZTrescia
                      ? "Wyślij najpierw test do siebie, aby odblokować wysyłkę."
                      : `Gotowe do wysłania do ${stats.recipientCount} os.`}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={zablokowane || !testZgodnyZTrescia}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
                >
                  Wyślij do {stats.recipientCount} os.
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Potwierdzenie w standardowym modalu (wariant marki). onConfirm sam zarządza stanem ładowania. */}
      <DeleteConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        variant="brand"
        title={tpl.label}
        message={`Wiadomość „${subject}" trafi do ${stats.recipientCount} os. (${FILTER_LABELS[recipientFilter]?.toLowerCase()}). Każdy dostanie osobnego maila. Wysyłki nie da się cofnąć.`}
        confirmButtonText={`Wyślij do ${stats.recipientCount} os.`}
        busyText="Kolejkuję…"
      />
    </>
  );
}
