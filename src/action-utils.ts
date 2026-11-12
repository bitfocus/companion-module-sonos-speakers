import type { SonosDevice } from '@svrooij/sonos'
import type { CompanionActionEvent, CompanionInputFieldDropdown } from '@companion-module/base'
import type { SonosContext } from './sonos-context.js'

export type OnOffToggle = 'on' | 'off' | 'toggle'

/** Create a `.catch` handler which reports a failed operation with a readable message */
export function failed(what: string): (e: unknown) => never {
	return (e) => {
		throw new Error(`Sonos: ${what} failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}

export function getDevice(ctx: SonosContext, action: CompanionActionEvent, key = 'device'): SonosDevice | undefined {
	return ctx.manager.Devices.find((d) => d.Uuid === action.options[key])
}

export function getOptInt(action: CompanionActionEvent, key: string): number {
	const val = Number(action.options[key])
	if (isNaN(val)) {
		throw new Error(`Invalid option '${key}'`)
	}
	return Math.round(val)
}

export function getOptString(action: CompanionActionEvent, key: string): string {
	const val = action.options[key]
	return typeof val === 'string' ? val : ''
}

export function getOptBool(action: CompanionActionEvent, key: string): boolean {
	return action.options[key] === true
}

export function OnOffTogglePicker(label = 'Mode'): CompanionInputFieldDropdown {
	return {
		type: 'dropdown',
		label,
		id: 'mode',
		default: 'toggle',
		choices: [
			{ id: 'toggle', label: 'Toggle' },
			{ id: 'on', label: 'On' },
			{ id: 'off', label: 'Off' },
		],
	}
}

/** Work out the new state for an on/off/toggle option, only reading the current state when it is needed */
export async function resolveOnOffToggle(
	action: CompanionActionEvent,
	getCurrent: () => Promise<boolean> | boolean,
): Promise<boolean> {
	const mode = action.options.mode
	if (mode === 'on') return true
	if (mode === 'off') return false
	return !(await getCurrent())
}

/** Convert a number of seconds to the `h:mm:ss` format used by Sonos */
export function formatDuration(totalSeconds: number): string {
	const secs = Math.max(0, Math.round(totalSeconds))
	const h = Math.floor(secs / 3600)
	const m = Math.floor((secs % 3600) / 60)
	const s = secs % 60
	return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Parse a Sonos `h:mm:ss` time into seconds. Returns 0 when it cannot be parsed. */
export function parseDuration(value: string): number {
	const parts = value.split(':').map(Number)
	if (parts.length !== 3 || parts.some((p) => isNaN(p))) return 0
	return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

/**
 * Empty the queue of the group the device is in.
 * Sonos reports an error when clearing a queue which is already empty, so only clear when there is something to remove.
 */
export async function clearQueue(device: SonosDevice): Promise<void> {
	const coordinator = device.Coordinator
	const queue = await coordinator.GetQueue().catch(() => undefined)
	if (queue && queue.TotalMatches === 0) return
	await coordinator.AVTransportService.RemoveAllTracksFromQueue()
}
