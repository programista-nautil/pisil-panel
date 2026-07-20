"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const formatPln = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} zł`;

// -------- Modal odnotowania wpłaty (#7) --------
// Zamiast checkboxa „powiadom" dajemy DWA przyciski: wybór jest wtedy świadomy, a nie zależny od tego,
// czy ktoś zauważył zaznaczony ptaszek. Obie ścieżki zapisują wpłatę — różnią się tylko mailem.
export default function PaymentConfirmModal({ eventId, reg, onClose, onDone }) {
	const [saving, setSaving] = useState(null); // 'notify' | 'silent' — który przycisk pracuje
	const brakMaila = !reg.email;

	const zapisz = async (notify) => {
		setSaving(notify ? "notify" : "silent");
		try {
			const res = await fetch(`/api/admin/events/${eventId}/registrations/${reg.id}/actions/confirm-payment`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notify }),
			});
			const d = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(d.message || "Nie udało się zapisać wpłaty.");

			if (notify && d.email && !d.email.sent) {
				// Wpłata zapisana, ale mail nie wyszedł — nie udawaj sukcesu.
				toast.error(`Wpłatę zapisano, ale mail nie wyszedł: ${d.email.reason || "błąd wysyłki"}`);
			} else {
				toast.success(notify ? "Zapisano wpłatę i wysłano potwierdzenie." : "Zapisano wpłatę.");
			}
			onDone();
		} catch (e) {
			toast.error(e.message);
			setSaving(null);
		}
	};

	return (
		<div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
				<h3 className="text-lg font-bold text-gray-800">Odnotuj wpłatę</h3>
				<p className="text-sm text-gray-600">
					Oznaczasz zgłoszenie{" "}
					<span className="font-medium text-gray-800">
						{reg.firstName} {reg.lastName}
					</span>{" "}
					jako opłacone{Number(reg.kwota) > 0 ? ` (${formatPln(reg.kwota)})` : ""}. Data wpłaty zapisze się
					automatycznie.
				</p>
				<p className="text-sm text-gray-600">
					Potwierdzenie mailem jest opcjonalne — wybierz, czy uczestnik ma je dostać.
					{brakMaila && (
						<span className="block text-xs text-gray-500 mt-1">
							To zgłoszenie nie ma adresu e-mail, więc wysyłka jest niemożliwa.
						</span>
					)}
				</p>

				<div className="flex flex-col gap-2 pt-2">
					<button
						type="button"
						onClick={() => zapisz(true)}
						disabled={!!saving || brakMaila}
						className="w-full px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
					>
						{saving === "notify"
							? "Zapisuję…"
							: `Zapisz i wyślij potwierdzenie${reg.email ? ` (${reg.email})` : ""}`}
					</button>
					<button
						type="button"
						onClick={() => zapisz(false)}
						disabled={!!saving}
						className="w-full px-4 py-2 text-sm font-medium text-[#005698] bg-white border border-[#005698]/40 rounded-md hover:bg-[#005698]/5 disabled:opacity-50"
					>
						{saving === "silent" ? "Zapisuję…" : "Zapisz bez maila"}
					</button>
					<button
						type="button"
						onClick={onClose}
						disabled={!!saving}
						className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
					>
						Anuluj
					</button>
				</div>
			</div>
		</div>
	);
}
