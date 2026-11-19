import type { CompanionInputFieldDropdown, CompanionInputFieldNumber } from '@companion-module/base'
import type { SonosDevice } from '@svrooij/sonos'

export const MutedPicker: CompanionInputFieldDropdown<'muted'> = {
	type: 'dropdown',
	label: 'Muted',
	id: 'muted',
	default: 'toggle',
	choices: [
		{ id: 'toggle', label: 'Toggle' },
		{ id: 'mute', label: 'Mute' },
		{ id: 'unmute', label: 'Unmute' },
	],
}

export function DevicePicker<TId extends string = 'device'>(
	devices: SonosDevice[],
	id: TId = 'device' as TId,
	label = 'Device',
): CompanionInputFieldDropdown<TId> {
	const choices = devices.map((d) => ({
		id: d.Uuid,
		label: d.Name,
	}))

	return {
		type: 'dropdown',
		label,
		id,
		default: choices.length ? choices[0].id : '',
		choices,
	}
}

export function VolumePicker(): CompanionInputFieldNumber<'volume'> {
	return {
		type: 'number',
		label: 'Volume',
		id: 'volume',
		default: 50,
		max: 100,
		min: 0,
	}
}
