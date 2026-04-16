"use client";

import { useState, useEffect } from "react";
import {
  MegaphoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleFileCategory } from "@/app/member/dashboard/components/CollapsibleFileCategory";

export default function CommunicationsSection() {
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainOpen, setIsMainOpen] = useState(false);

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

  const groupedCommunications = communications.reduce((acc, curr) => {
    if (!acc[curr.year]) acc[curr.year] = [];
    acc[curr.year].push(curr);
    return acc;
  }, {});

  const communicationCategories = Object.keys(groupedCommunications)
    .sort((a, b) => b - a) // Sortowanie roczników malejąco
    .map((year) => {
      const filesForYear = groupedCommunications[year].map((comm) => ({
        id: comm.id,
        fileName: comm.title,
        downloadUrl: `/api/member/communications/${comm.id}/download`,
      }));

      // ZAAWANSOWANE SORTOWANIE (NAPRAWIONE)
      filesForYear.sort((a, b) => {
        // Funkcja wyciągająca główny numer z tytułu
        const getNum = (title) => {
          // Najpierw szukamy wprost "nr 123" (stare formaty)
          const explicitMatch = title.match(/nr\s*(\d+)/i);
          if (explicitMatch) return parseInt(explicitMatch[1], 10);

          // Jeśli nie ma słowa "nr", wyciągamy po prostu pierwszą liczbę w nazwie (np. z "99.pdf" albo "1.01.25.pdf")
          const firstNumMatch = title.match(/(\d+)/);
          return firstNumMatch ? parseInt(firstNumMatch[0], 10) : 0;
        };

        const numA = getNum(a.fileName);
        const numB = getNum(b.fileName);

        // Jeśli wyciągnęliśmy RÓŻNE numery, sortujemy je malejąco (największe numery na górze)
        if (numA !== numB) {
          return numB - numA;
        }

        // Jeśli numery są takie same (np. obydwa to 195, bo to główny plik i jego załącznik)
        // Sprawdzamy, czy jedna nazwa zawiera się w drugiej. Krótsza (główna) ma być wyżej.
        if (a.fileName.startsWith(b.fileName)) return 1; // 'b' jest głównym plikiem, dajemy wyżej
        if (b.fileName.startsWith(a.fileName)) return -1; // 'a' jest głównym plikiem, dajemy wyżej

        // Jeśli obydwa pliki dostały numer 0 lub mają totalnie inne nazwy:
        // Używamy sortowania "naturalnego" z wbudowanego JS (localeCompare), które rozumie liczby
        return b.fileName.localeCompare(a.fileName, "pl", { numeric: true });
      });

      return {
        category: `Komunikaty - ${year}`,
        files: filesForYear,
      };
    });

  return (
    <section className="mb-8">
      <div
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MegaphoneIcon className="h-6 w-6 text-[#005698]" />
          <h2 className="text-lg font-semibold text-[#005698]">Komunikaty</h2>
        </div>
        {isMainOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isMainOpen && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200 pl-4 border-l-4 border-l-[#005698]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Ładowanie komunikatów...
            </div>
          ) : communicationCategories.length > 0 ? (
            communicationCategories.map((category) => (
              <CollapsibleFileCategory
                key={category.category}
                category={category}
              />
            ))
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">
              Brak komunikatów.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
