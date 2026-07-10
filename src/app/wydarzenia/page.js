"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TYP_LABEL = { SZKOLENIE: "Szkolenie", KONFERENCJA: "Konferencja" };
const TRYB_LABEL = { ONLINE: "Online", STACJONARNE: "Stacjonarnie" };

const formatDate = (d) =>
  new Date(d).toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" });
const formatPln = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} zł`;

function priceLine(ev) {
  const czlonek =
    ev.typ === "KONFERENCJA" && ev.pulaGratisNaFirme > 0
      ? `Członkowie: bezpłatnie do ${ev.pulaGratisNaFirme} os./firmę`
      : ev.cenaCzlonek != null
        ? `Członkowie: ${formatPln(ev.cenaCzlonek)}`
        : null;
  const inni = ev.cenaNieczlonek != null ? `Pozostali: ${formatPln(ev.cenaNieczlonek)}` : null;
  return [czlonek, inni].filter(Boolean).join(" · ");
}

export default function WydarzeniaListPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#005698] text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold">Szkolenia i konferencje</h1>
          <p className="mt-2 text-white/80">
            Polska Izba Spedycji i Logistyki — zapisy na wydarzenia
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-center text-gray-500 py-12">Ładowanie wydarzeń…</p>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            Obecnie nie ma zaplanowanych wydarzeń. Zapraszamy wkrótce.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((ev) => {
              const zamkniete = !ev.rejestracjaOtwarta;
              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"
                >
                  <div className="p-5 flex-grow">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#005698]/10 text-[#005698]">
                        {TYP_LABEL[ev.typ]}
                      </span>
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                        {TRYB_LABEL[ev.tryb]}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">{ev.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(ev.startAt)}</p>
                    {ev.tryb === "STACJONARNE" && ev.address && (
                      <p className="text-sm text-gray-500 mt-0.5">{ev.address}</p>
                    )}
                    {priceLine(ev) && (
                      <p className="text-sm text-gray-700 mt-3 font-medium">{priceLine(ev)}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {ev.dostepneMiejsca != null && (
                        <span>Wolne miejsca: {ev.dostepneMiejsca}</span>
                      )}
                      {ev.registrationDeadline && (
                        <span>Zapisy do: {formatDate(ev.registrationDeadline)}</span>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                    {zamkniete ? (
                      <span className="inline-block px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md">
                        Rejestracja zakończona
                      </span>
                    ) : (
                      <Link
                        href={`/wydarzenia/${ev.slug}`}
                        className="inline-block px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 transition-colors"
                      >
                        Szczegóły i zapis
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
