"use client";

import { useState, useEffect } from "react";
import {
  MegaphoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleFileCategory } from "./CollapsibleFileCategory";

export default function NewslettersSection() {
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainOpen, setIsMainOpen] = useState(false);

  // 1. Logika dla sztywnych newsletterów (zostaje bez zmian)
  const newsletterYears = Array.from(
    { length: 2025 - 2018 + 1 },
    (_, i) => 2025 - i,
  );
  const newsletterFiles = newsletterYears.map((year) => ({
    id: `newsletter-${year}`,
    fileName: `spis-newsletterow-${year}.pdf`,
    downloadUrl: `/api/member/newsletter/spis-newsletterow-${year}.pdf`,
  }));

  const newsletterCategory = {
    category: "Spis newsletterów",
    files: newsletterFiles,
  };

  // 2. Pobieranie dynamicznych komunikatów z bazy
  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const res = await fetch("/api/member/communications");
        if (res.ok) {
          const data = await res.json();
          setCommunications(data);
        }
      } catch (error) {
        console.error("Błąd pobierania komunikatów", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunications();
  }, []);

  // 3. Grupowanie komunikatów rocznikami
  const groupedCommunications = communications.reduce((acc, curr) => {
    if (!acc[curr.year]) acc[curr.year] = [];
    acc[curr.year].push(curr);
    return acc;
  }, {});

  // Przekształcenie do formatu oczekiwanego przez CollapsibleFileCategory
  const communicationCategories = Object.keys(groupedCommunications)
    .sort((a, b) => b - a) // Sortowanie roczników malejąco (2025, 2024...)
    .map((year) => ({
      category: `Komunikaty - ${year}`,
      files: groupedCommunications[year].map((comm) => ({
        id: comm.id,
        // UX TIP: Używamy ładnego tytułu z bazy, a nie oryginalnej nazwy pliku!
        fileName: comm.title,
        downloadUrl: `/api/member/communications/${comm.id}/download`,
      })),
    }));

  return (
    <section className="mb-8">
      {/* Główny pasek klikalny (Akordeon) */}
      <div
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MegaphoneIcon className="h-6 w-6 text-[#005698]" />
          <h2 className="text-lg font-semibold text-[#005698]">
            Komunikaty i spis newsletterów
          </h2>
        </div>
        {isMainOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {/* Rozwinięta zawartość */}
      {isMainOpen && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200 pl-4 border-l-4 border-l-[#005698]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Ładowanie komunikatów...
            </div>
          ) : (
            <>
              {/* Dynamiczne Komunikaty z bazy */}
              {communicationCategories.map((category) => (
                <CollapsibleFileCategory
                  key={category.category}
                  category={category}
                />
              ))}

              {/* Sztywne Newslettery na samym dole */}
              <CollapsibleFileCategory category={newsletterCategory} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
