import type { SonosDevice, SonosManager } from '@svrooij/sonos'
import { DevicePicker, VolumePicker } from './choices.js'
import type {
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionInputFieldNumber,
} from '@companion-module/base'

export enum PlayPauseToggle {
	Play = 'play',
	Pause = 'pause',
	Toggle = 'toggle',
}

export enum ActionId {
	PlayPause = 'play_pause',
	NextTrack = 'next_track',
	PreviousTrack = 'previous_track',
	Volume = 'volume',
	VolumeDelta = 'volume_delta',
}

function VolumeDeltaPicker(): CompanionInputFieldNumber {
	return {
		type: 'number',
		label: 'Delta',
		id: 'delta',
		default: 1,
		max: 100,
		min: -100,
	}
}

export function GetActionsList(manager: SonosManager): CompanionActionDefinitions {
	const devices = manager.Devices

	const getDevice = (action: CompanionActionEvent): SonosDevice | undefined =>
		manager.Devices.find((d) => d.uuid === action.options.device)

	const getOptInt = (action: CompanionActionEvent, key: string): number => {
		const val = Number(action.options[key])
		if (isNaN(val)) {
			throw new Error(`Invalid option '${key}'`)
		}
		return val
	}

	const actions: CompanionActionDefinitions = {}

	actions[ActionId.PlayPause] = {
		name: 'Play/pause',
		options: [
			DevicePicker(devices),
			{
				type: 'dropdown',
				label: 'Mode',
				id: 'mode',
				default: PlayPauseToggle.Toggle,
				choices: [
					{ id: PlayPauseToggle.Toggle, label: 'Toggle' },
					{ id: PlayPauseToggle.Play, label: 'Play' },
					{ id: PlayPauseToggle.Pause, label: 'Pause' },
				],
			},
		],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				switch (action.options.mode) {
					case PlayPauseToggle.Play:
						await device.Play().catch((e) => {
							throw new Error(`Sonos: Play failed: ${e}`)
						})
						break
					case PlayPauseToggle.Pause:
						await device.Pause().catch((e) => {
							throw new Error(`Sonos: Pause failed: ${e}`)
						})
						break
					default:
						await device.TogglePlayback().catch((e) => {
							throw new Error(`Sonos: Play/Pause toggle failed: ${e}`)
						})
						break
				}
			}
		},
	}
	actions[ActionId.NextTrack] = {
		name: 'Next Track',
		options: [DevicePicker(devices)],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				await device.Next().catch((e) => {
					throw new Error(`Sonos: NextTrack failed: ${e}`)
				})
			}
		},
	}
	actions[ActionId.PreviousTrack] = {
		name: 'Previous Track',
		options: [DevicePicker(devices)],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				await device.Previous().catch((e) => {
					throw new Error(`Sonos: PreviousTrack failed: ${e}`)
				})
			}
		},
	}
	actions[ActionId.Volume] = {
		name: 'Set Volume',
		options: [DevicePicker(devices), VolumePicker()],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				await device.SetVolume(getOptInt(action, 'volume')).catch((e) => {
					throw new Error(`Sonos: PreviousTrack failed: ${e}`)
				})
			}
		},
	}
	actions[ActionId.VolumeDelta] = {
		name: 'Adjust Volume',
		options: [DevicePicker(devices), VolumeDeltaPicker()],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				await device.SetRelativeVolume(getOptInt(action, 'delta')).catch((e) => {
					throw new Error(`Sonos: PreviousTrack failed: ${e}`)
				})
			}
		},
	}

	return actions
}
