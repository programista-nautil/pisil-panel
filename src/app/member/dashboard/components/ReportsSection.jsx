"use client";

import { useState } from "react";
import {
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleFileCategory } from "./CollapsibleFileCategory";

// Ręczna konfiguracja plików pogrupowana rocznikami dla porządku
const REPORTS_DATA = [
  {
    year: "2025",
    files: ["Sprawozdanie 2025.pdf", "Informacja 2025.pdf", "Bilans 2025.pdf"],
  },
  {
    year: "2024",
    files: [
      "Rachunek zysków i strat oraz Bilans 2024.pdf",
      "Sprawozdanie finansowe za 2024 rok.pdf",
      "Sprawozdanie z działalności Polskiej Izby Spedycji i Logistyki za rok 2024.pdf",
    ],
  },
  {
    year: "2023",
    files: [
      "Sprawozdanie finansowe za 2023 rok.pdf",
      "Sprawozdanie z działalności 2023.pdf",
    ],
  },
  {
    year: "2022",
    files: [
      "Bilans i RZiS (Rachunek Zysków i Strat) 2022.pdf",
      "Sprawozdanie finansowe za 2022 rok.pdf",
      "Sprawozdanie z działalności 2022.pdf",
    ],
  },
  {
    year: "2021",
    files: [
      "Bilans i RZiS (Rachunek Zysków i Strat) 2021.pdf",
      "Sprawozdanie finansowe 2021.pdf",
      "Sprawozdanie z działalności 2021.pdf",
    ],
  },
  {
    year: "2020",
    files: [
      "Koszty 2020.xls",
      "Przychody 2020.xls",
      "Protokół z e-posiedzenia Komisji Rewizyjnej Polskiej Izby Spedycji i Logistyki w dniu 17.03.2020 roku.pdf",
      "Sprawozdanie finansowe 2020.pdf",
      "Sprawozdanie z działalności 2020.rtf",
      "Wizualizacja eSPR report (B)(1).pdf",
      "Założenia programowe działalności Polskiej Izby Spedycji i Logistyki na rok 2020.pdf",
    ],
  },
  {
    year: "2019",
    files: [
      "Sprawozdanie finansowe 2019.pdf",
      "Sprawozdanie finansowe za okres od 01.01.2019 do 31.12.2019.pdf",
      "Sprawozdanie Komisji Rewizyjnej Polskiej Izby Spedycji i Logistyki za 2019 rok.pdf",
      "Sprawozdanie z działalności Polskiej Izby Spedycji i Logistyki za rok 2019.pdf",
    ],
  },
  {
    year: "2018",
    files: ["Sprawozdanie 2018 (strony 72–89).pdf", "Sprawozdanie 2018.pdf"],
  },
  {
    year: "Inne i Publikacje",
    files: ["Całościowy wykaz publikacji.xls", "Lista publikacji.xlsx"],
  },
];

export default function ReportsSection() {
  const [isMainOpen, setIsMainOpen] = useState(false);

  const reportCategories = REPORTS_DATA.map((group) => ({
    category: `Sprawozdania - ${group.year}`,
    files: group.files.map((fileName, index) => ({
      id: `report-${group.year}-${index}`,
      fileName: fileName,

      downloadUrl: `/api/member/resources/reports/${encodeURIComponent(fileName)}`,
    })),
  }));

  return (
    <section className="mb-8">
      <div
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-6 w-6 text-[#005698]" />
          <h2 className="text-lg font-semibold text-[#005698]">
            Sprawozdania i Publikacje
          </h2>
        </div>

        {isMainOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isMainOpen && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200 pl-4 border-l-4 border-l-[#005698]">
          {reportCategories.map((category) => (
            <CollapsibleFileCategory
              key={category.category}
              category={category}
            />
          ))}
        </div>
      )}
    </section>
  );
}
