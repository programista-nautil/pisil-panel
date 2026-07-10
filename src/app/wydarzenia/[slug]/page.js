"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const TYP_LABEL = { SZKOLENIE: "Szkolenie", KONFERENCJA: "Konferencja" };
const TRYB_LABEL = { ONLINE: "Online", STACJONARNE: "Stacjonarnie" };

const formatDate = (d) =>
  new Date(d).toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" });
const formatPln = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} zł`;

const inputCls =
  "block w-full rounded-md border border-gray-300 p-2.5 shadow-sm focus:border-[#005698] focus:ring-[#005698] text-sm text-gray-800";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function WydarzenieDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    firmaNazwa: "",
    firmaNip: "",
    firmaAdres: "",
    zgodaRodo: false,
    company_website: "", // honeypot
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null); // { message, registration }

  useEffect(() => {
    fetch(`/api/public/events/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("notfound");
        return r.json();
      })
      .then((data) => {
        setEvent(data);
        setStatus("ok");
      })
      .catch(() => setStatus("notfound"));
  }, [slug]);

  const set = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.zgodaRodo) {
      setError("Zgoda na przetwarzanie danych (RODO) jest wymagana.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${slug}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      // 201 = zapisano, 206 = zapisano ale mail nie poszedł — oba traktujemy jako sukces
      if (res.status === 201 || res.status === 206) {
        setSuccess({ message: data.message, registration: data.registration });
      } else {
        setError(data.message || "Nie udało się zapisać zgłoszenia.");
      }
    } catch {
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <p className="text-center text-gray-500 py-20">Ładowanie…</p>;
  }
  if (status === "notfound") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Nie znaleziono wydarzenia lub rejestracja jest niedostępna.</p>
        <Link href="/wydarzenia" className="text-[#005698] hover:underline mt-4 inline-block">
          ← Wróć do listy wydarzeń
        </Link>
      </div>
    );
  }

  const mapSrc =
    event.tryb === "STACJONARNE" && event.address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}&output=embed`
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#005698] text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/wydarzenia" className="text-white/80 hover:text-white text-sm">
            ← Wszystkie wydarzenia
          </Link>
          <div className="flex flex-wrap gap-2 mt-4 mb-2">
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/20">
              {TYP_LABEL[event.typ]}
            </span>
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/20">
              {TRYB_LABEL[event.tryb]}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Szczegóły */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {event.description && (
            <p className="text-gray-700 whitespace-pre-line mb-4">{event.description}</p>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Rozpoczęcie</dt>
              <dd className="text-gray-800 font-medium">{formatDate(event.startAt)}</dd>
            </div>
            {event.endAt && (
              <div>
                <dt className="text-gray-500">Zakończenie</dt>
                <dd className="text-gray-800 font-medium">{formatDate(event.endAt)}</dd>
              </div>
            )}
            {event.prowadzacy && (
              <div>
                <dt className="text-gray-500">Prowadzący</dt>
                <dd className="text-gray-800 font-medium">{event.prowadzacy}</dd>
              </div>
            )}
            {event.tryb === "ONLINE" && event.onlineUrl && (
              <div>
                <dt className="text-gray-500">Forma</dt>
                <dd className="text-gray-800 font-medium">Online</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Cena — członkowie</dt>
              <dd className="text-gray-800 font-medium">
                {event.typ === "KONFERENCJA" && event.pulaGratisNaFirme > 0
                  ? `Bezpłatnie do ${event.pulaGratisNaFirme} os./firmę`
                  : event.cenaCzlonek != null
                    ? formatPln(event.cenaCzlonek)
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Cena — pozostali</dt>
              <dd className="text-gray-800 font-medium">
                {event.cenaNieczlonek != null ? formatPln(event.cenaNieczlonek) : "—"}
              </dd>
            </div>
            {event.registrationDeadline && (
              <div>
                <dt className="text-gray-500">Zapisy do</dt>
                <dd className="text-gray-800 font-medium">{formatDate(event.registrationDeadline)}</dd>
              </div>
            )}
            {event.dostepneMiejsca != null && (
              <div>
                <dt className="text-gray-500">Wolne miejsca</dt>
                <dd className="text-gray-800 font-medium">{event.dostepneMiejsca}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Formularz / sukces */}
        {success ? (
          <section className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <h2 className="text-xl font-semibold text-green-700 mb-2">Zgłoszenie przyjęte ✓</h2>
            <p className="text-gray-700">{success.message}</p>
            {success.registration && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
                {success.registration.statusRejestracji === "LISTA_REZERWOWA" && (
                  <p className="text-yellow-700 font-medium">
                    Limit miejsc wyczerpany — jesteś na liście rezerwowej.
                  </p>
                )}
                {Number(success.registration.kwota) > 0 ? (
                  <>
                    <p>
                      <strong>Do zapłaty:</strong> {formatPln(success.registration.kwota)}
                    </p>
                    {event.bankAccount && (
                      <p>
                        <strong>Przelew na konto:</strong> {event.bankAccount}
                      </p>
                    )}
                    <p className="text-gray-500">
                      Szczegóły płatności potwierdziliśmy również e-mailem.
                    </p>
                  </>
                ) : (
                  <p>
                    <strong>Udział bezpłatny.</strong> Potwierdzenie wysłaliśmy e-mailem.
                  </p>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Formularz zgłoszenia</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Imię *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Nazwisko *</label>
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
                <label className={labelCls}>E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Nazwa firmy *</label>
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
                  <label className={labelCls}>NIP firmy *</label>
                  <input
                    type="text"
                    value={form.firmaNip}
                    onChange={(e) => set("firmaNip", e.target.value)}
                    placeholder="10 cyfr"
                    className={inputCls}
                    required
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

              {/* Honeypot — ukryte pole dla botów */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Nie wypełniaj tego pola
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company_website}
                    onChange={(e) => set("company_website", e.target.value)}
                  />
                </label>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.zgodaRodo}
                  onChange={(e) => set("zgodaRodo", e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Wyrażam zgodę na przetwarzanie moich danych osobowych przez Polską Izbę Spedycji i
                  Logistyki w celu organizacji i obsługi udziału w wydarzeniu (RODO). *
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Wysyłanie…" : "Zapisz się"}
              </button>
            </form>
          </section>
        )}

        {/* Mapka — tylko stacjonarne, na dole */}
        {mapSrc && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 pb-3">
              <h2 className="text-xl font-semibold text-gray-800">Miejsce</h2>
              <p className="text-sm text-gray-600 mt-1">{event.address}</p>
            </div>
            <iframe
              title="Mapa dojazdu"
              src={mapSrc}
              className="w-full h-72 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </section>
        )}
      </main>
    </div>
  );
}
