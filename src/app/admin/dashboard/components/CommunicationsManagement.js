"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  MegaphoneIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import AddCommunicationModal from "./AddCommunicationModal";

export default function CommunicationsManagement() {
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/communications");
      if (!res.ok) throw new Error("Błąd ładowania komunikatów");
      const data = await res.json();
      setCommunications(data);
    } catch (error) {
      console.error(error);
      toast.error("Nie udało się pobrać komunikatów.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz usunąć "${title}"? Plik zostanie bezpowrotnie skasowany z serwera.`,
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/communications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Błąd podczas usuwania");

      setCommunications((prev) => prev.filter((c) => c.id !== id));
      toast.success("Komunikat usunięty pomyślnie.");
    } catch (error) {
      console.error(error);
      toast.error("Nie udało się usunąć komunikatu.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSuccess = (newCommunication) => {
    toast.success("Komunikat dodany pomyślnie!");

    setCommunications((prev) => {
      const updated = [newCommunication, ...prev];
      return updated.sort(
        (a, b) =>
          b.year - a.year || new Date(b.createdAt) - new Date(a.createdAt),
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <MegaphoneIcon className="h-6 w-6 text-[#005698]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Zarządzanie Komunikatami
            </h2>
            <p className="text-sm text-gray-500">
              Dodawaj pliki, które będą widoczne w panelu członka.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm"
        >
          + Dodaj komunikat
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Ładowanie komunikatów...
          </div>
        ) : communications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Brak dodanych komunikatów. Użyj przycisku powyżej, aby dodać
            pierwszy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Rok
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tytuł
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nazwa pliku
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {communications.map((comm) => (
                  <tr key={comm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {comm.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {comm.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <DocumentArrowDownIcon className="h-4 w-4 text-gray-400" />
                        {comm.fileName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/admin/communications/${comm.id}/download`}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-md transition-colors inline-block"
                          title="Pobierz plik"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => handleDelete(comm.id, comm.title)}
                          disabled={deletingId === comm.id}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors disabled:opacity-50"
                          title="Usuń komunikat"
                        >
                          {deletingId === comm.id ? (
                            "..."
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCommunicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
