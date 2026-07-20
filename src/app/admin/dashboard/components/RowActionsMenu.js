"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

const SZEROKOSC = 160; // px, odpowiada klasie w-40
const WYSOKOSC_POZYCJI = 32; // px, przybliżona wysokość jednej pozycji menu

// Akcje wiersza schowane pod jednym dyskretnym przyciskiem. Powód: „Edytuj" i czerwone „Usuń"
// powtórzone w każdym wierszu przyciągały wzrok do rzadko używanych operacji.
//
// Menu renderujemy w PORTALU na <body>, z pozycją stałą liczoną z położenia przycisku. Tabela siedzi
// w kontenerze z przewijaniem w poziomie, a taki kontener przycina wszystko, co z niego wystaje —
// menu ostatniego wiersza lądowało pod tabelą i dorabiało pasek przewijania. Portal omija każdy
// taki kontener. Gdy pod przyciskiem brakuje miejsca, menu otwiera się w górę.
export default function RowActionsMenu({ actions }) {
	const [open, setOpen] = useState(false);
	const [poz, setPoz] = useState({ top: 0, left: 0 });
	const btnRef = useRef(null);
	const menuRef = useRef(null);

	const przelacz = () => {
		if (open) return setOpen(false);
		const r = btnRef.current?.getBoundingClientRect();
		if (!r) return;
		const wysokosc = actions.length * WYSOKOSC_POZYCJI + 8;
		const brakMiejscaPonizej = r.bottom + wysokosc > window.innerHeight - 8;
		setPoz({
			top: brakMiejscaPonizej ? Math.max(8, r.top - wysokosc - 4) : r.bottom + 4,
			left: Math.max(8, r.right - SZEROKOSC),
		});
		setOpen(true);
	};

	useEffect(() => {
		if (!open) return;
		const pozaMenu = (e) => {
			if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const naEscape = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		// Przewinięcie albo zmiana rozmiaru rozjechałyby wyliczoną pozycję — uczciwiej zamknąć menu,
		// niż pokazywać je w złym miejscu.
		const zamknij = () => setOpen(false);

		document.addEventListener("mousedown", pozaMenu);
		document.addEventListener("keydown", naEscape);
		window.addEventListener("scroll", zamknij, true);
		window.addEventListener("resize", zamknij);
		return () => {
			document.removeEventListener("mousedown", pozaMenu);
			document.removeEventListener("keydown", naEscape);
			window.removeEventListener("scroll", zamknij, true);
			window.removeEventListener("resize", zamknij);
		};
	}, [open]);

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				onClick={przelacz}
				aria-haspopup="menu"
				aria-expanded={open}
				title="Więcej"
				className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
			>
				<EllipsisHorizontalIcon className="h-5 w-5" />
			</button>

			{open &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						style={{ position: "fixed", top: poz.top, left: poz.left, width: SZEROKOSC }}
						className="z-50 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
					>
						{actions.map((a) => (
							<button
								key={a.label}
								type="button"
								role="menuitem"
								onClick={() => {
									setOpen(false);
									a.onClick();
								}}
								className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
									a.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"
								}`}
							>
								{a.label}
							</button>
						))}
					</div>,
					document.body
				)}
		</>
	);
}
