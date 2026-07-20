"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const MIN_SZEROKOSC = 150; // px
const WYSOKOSC_POZYCJI = 32; // px, przybliżona wysokość jednej pozycji

// Własna lista rozwijana zamiast natywnego <select>. Powód: natywnej listy nie da się ostylować —
// przeglądarka rysuje ją po swojemu (systemowy niebieski pasek), więc odstawała od reszty panelu.
//
// Odtwarzamy to, co w natywnej kontrolce jest DOBRE, a nie tylko wygląd:
//   - pełna obsługa klawiatury (Enter/Spacja/strzałki otwierają, strzałki wybierają, Escape zamyka),
//   - role ARIA (listbox/option) + aria-selected, żeby czytniki ekranu wiedziały, co się dzieje,
//   - powrót ostrości na przycisk po zamknięciu.
//
// Lista renderuje się w PORTALU na <body> — tabela siedzi w kontenerze z przewijaniem poziomym,
// a taki kontener przycina wszystko, co z niego wystaje (ten sam powód co w RowActionsMenu).
// `full` = wariant pola formularza (pełna szerokość, stała ramka) do okien edycji. Bez niego kontrolka
// jest „cicha": w spoczynku wygląda jak tekst statusu, ramka pojawia się przy najechaniu — tak wygląda
// w tabeli, gdzie osiem stale widocznych ramek robiło kratownicę.
export default function StatusSelect({ value, options, onChange, title, full = false }) {
	const [open, setOpen] = useState(false);
	const [poz, setPoz] = useState({ top: 0, left: 0, width: MIN_SZEROKOSC });
	const [aktywny, setAktywny] = useState(0);
	const btnRef = useRef(null);
	const listaRef = useRef(null);
	const id = useId(); // do powiazania listy z aktywna opcja (aria-activedescendant)

	const etykieta = options.find(([v]) => v === value)?.[1] ?? value;

	const otworz = () => {
		const r = btnRef.current?.getBoundingClientRect();
		if (!r) return;
		const width = Math.max(r.width, MIN_SZEROKOSC);
		const wysokosc = options.length * WYSOKOSC_POZYCJI + 8;
		const brakMiejscaPonizej = r.bottom + wysokosc > window.innerHeight - 8;
		setPoz({
			top: brakMiejscaPonizej ? Math.max(8, r.top - wysokosc - 4) : r.bottom + 4,
			left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
			width,
		});
		setAktywny(Math.max(0, options.findIndex(([v]) => v === value)));
		setOpen(true);
	};

	const zamknij = ({ przywrocOstrosc = true } = {}) => {
		setOpen(false);
		if (przywrocOstrosc) btnRef.current?.focus();
	};

	const wybierz = (v) => {
		zamknij();
		if (v !== value) onChange(v);
	};

	// Po otwarciu przenosimy ostrość na listę, żeby strzałki działały od razu.
	useEffect(() => {
		if (open) listaRef.current?.focus();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const pozaKontrolka = (e) => {
			if (btnRef.current?.contains(e.target) || listaRef.current?.contains(e.target)) return;
			setOpen(false); // bez przywracania ostrości — użytkownik kliknął gdzie indziej
		};
		// Przewinięcie rozjechałoby wyliczoną pozycję; uczciwiej zamknąć, niż pokazywać w złym miejscu.
		const naPrzewiniecie = () => setOpen(false);
		document.addEventListener("mousedown", pozaKontrolka);
		window.addEventListener("scroll", naPrzewiniecie, true);
		window.addEventListener("resize", naPrzewiniecie);
		return () => {
			document.removeEventListener("mousedown", pozaKontrolka);
			window.removeEventListener("scroll", naPrzewiniecie, true);
			window.removeEventListener("resize", naPrzewiniecie);
		};
	}, [open]);

	const naKlawiszPrzycisku = (e) => {
		if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
			e.preventDefault();
			otworz();
		}
	};

	const naKlawiszListy = (e) => {
		if (e.key === "Escape") return e.preventDefault(), zamknij();
		if (e.key === "Tab") return zamknij({ przywrocOstrosc: false });
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			return wybierz(options[aktywny][0]);
		}
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			const krok = e.key === "ArrowDown" ? 1 : -1;
			setAktywny((i) => (i + krok + options.length) % options.length);
		}
		if (e.key === "Home") return e.preventDefault(), setAktywny(0);
		if (e.key === "End") return e.preventDefault(), setAktywny(options.length - 1);
	};

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				title={title}
				onClick={() => (open ? zamknij() : otworz())}
				onKeyDown={naKlawiszPrzycisku}
				aria-haspopup="listbox"
				aria-expanded={open}
				className={
					full
						? `flex w-full items-center justify-between rounded-md border p-2 text-left shadow-sm sm:text-sm text-gray-700 bg-white
							focus:outline-none transition-colors ${open ? "border-[#005698]" : "border-gray-300"}`
						: `inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-700 cursor-pointer
							border transition-colors focus:outline-none
							${open ? "border-[#005698] bg-white" : "border-transparent bg-transparent hover:border-gray-300 hover:bg-white focus:border-[#005698] focus:bg-white"}`
				}
			>
				<span className={full ? "" : "whitespace-nowrap"}>{etykieta}</span>
				<ChevronDownIcon className={`text-gray-400 flex-shrink-0 ${full ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
			</button>

			{open &&
				createPortal(
					<div
						ref={listaRef}
						role="listbox"
						tabIndex={-1}
						// Ostrosc trzyma kontener listy, wiec czytnik ekranu musi dostac wskazanie, ktora
						// opcja jest w tej chwili aktywna — inaczej strzalki byly by dla niego nieme.
						aria-activedescendant={`${id}-${aktywny}`}
						onKeyDown={naKlawiszListy}
						style={{ position: "fixed", top: poz.top, left: poz.left, width: poz.width }}
						className="z-50 rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
					>
						{options.map(([v, l], i) => {
							const wybrany = v === value;
							return (
								<button
									key={v}
									id={`${id}-${i}`}
									type="button"
									role="option"
									aria-selected={wybrany}
									onMouseEnter={() => setAktywny(i)}
									onClick={() => wybierz(v)}
									className={`block w-full px-3 py-1.5 text-left text-sm transition-colors
										${wybrany ? "font-medium text-[#005698]" : "text-gray-700"}
										${i === aktywny ? (wybrany ? "bg-[#005698]/15" : "bg-gray-100") : wybrany ? "bg-[#005698]/10" : ""}`}
								>
									{l}
								</button>
							);
						})}
					</div>,
					document.body
				)}
		</>
	);
}
