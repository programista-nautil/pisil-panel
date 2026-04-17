import { PATCH as _PATCH } from '../route'
import { logDeprecated } from '@/lib/deprecatedLogger'

export async function PATCH(request, ctx) {
	logDeprecated(request)
	return _PATCH(request, ctx)
}
