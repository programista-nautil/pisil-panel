export const getFormTypeName = formType => {
	switch (formType) {
		case 'DEKLARACJA_CZLONKOWSKA':
			return 'Deklaracja członkowska'
		case 'PATRONAT':
			return 'Patronat'
		case 'MLODY_SPEDYTOR_ROKU':
			return 'Młody Spedytor Roku'
		case 'ANKIETA_SPEDYTOR_ROKU':
			return 'Spedytor Roku'
		default:
			return formType || '—'
	}
}
