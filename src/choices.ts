import type { CompanionInputFieldDropdown, CompanionInputFieldNumber } from '@companion-module/base'
import type { SonosDevice } from '@svrooij/sonos'

export function DevicePicker(devices: SonosDevice[]): CompanionInputFieldDropdown {
	const choices = devices.map((d) => ({
		id: d.Uuid,
		label: d.Name,
	}))

	return {
		type: 'dropdown',
		label: 'Device',
		id: 'device',
		default: choices.length ? choices[0].id : '',
		choices,
	}
}

export function VolumePicker(): CompanionInputFieldNumber {
	return {
		type: 'number',
		label: 'Volume',
		id: 'volume',
		default: 50,
		max: 100,
		min: 0,
	}
}
