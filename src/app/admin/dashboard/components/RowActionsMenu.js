"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

// Akcje wiersza schowane pod jednym dyskretnym przyciskiem. Powód: „Edytuj" i czerwone „Usuń"
// powtórzone w każdym wierszu przyciągały wzrok do rzadko używanych operacji i robiły z tabeli
// kratownicę. Usuwanie zostaje czerwone, ale dopiero po otwarciu menu — czyli świadomie.
export default function RowActionsMenu({ actions }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return;
		const naZewnatrz = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const naEscape = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", naZewnatrz);
		document.addEventListener("keydown", naEscape);
		return () => {
			document.removeEventListener("mousedown", naZewnatrz);
			document.removeEventListener("keydown", naEscape);
		};
	}, [open]);

	return (
		<div className="relative inline-block text-left" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
				title="Więcej"
				className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
			>
				<EllipsisHorizontalIcon className="h-5 w-5" />
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
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
				</div>
			)}
		</div>
	);
}
