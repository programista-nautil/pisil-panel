"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function AddCommunicationModal({
  isOpen,
  onClose,
  onUploadSuccess,
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Generujemy lata do wyboru (od bieżącego + 1 do 2010)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2010 + 2 },
    (_, i) => currentYear + 1 - i,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Proszę załączyć plik.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("year", year);
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Wystąpił błąd podczas dodawania.");
      }

      const newCommunication = await res.json();
      toast.success("Komunikat został dodany.");
      onUploadSuccess(newCommunication);

      // Resetowanie formularza po sukcesie
      setTitle("");
      setFile(null);
      setYear(new Date().getFullYear());
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#005698] mb-2">
          Dodaj nowy komunikat
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Plik będzie natychmiast widoczny dla członków w ich panelu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tytuł Komunikatu
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Komunikat nr 123 - Zmiany w statucie"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:ring-[#005698] focus:border-[#005698]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rok przypisania
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:ring-[#005698] focus:border-[#005698]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Plik (PDF, Excel, itp.)
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer border border-gray-300"
            />
            {file && (
              <p className="mt-2 text-xs text-green-600">
                Wybrano: {file.name}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50"
            >
              {isSubmitting ? "Wgrywanie..." : "Dodaj komunikat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
