import type { SonosDevice } from '@svrooij/sonos'
import { ActionId, PlayPauseToggle } from './action-ids.js'
import { GetEqActions } from './actions-eq.js'
import { GetGroupActions } from './actions-groups.js'
import { GetLibraryActions } from './actions-library.js'
import { GetPlaybackActions } from './actions-playback.js'
import type { SonosContext } from './sonos-context.js'
import { DevicePicker, MutedPicker, VolumePicker } from './choices.js'
import type {
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionInputFieldNumber,
} from '@companion-module/base'
import type { ModuleTypes } from './types.js'

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

export { ActionId, PlayPauseToggle }

export function GetActionsList(ctx: SonosContext): CompanionActionDefinitions<ModuleTypes['actions']> {
	const manager = ctx.manager
	const devices = manager.Devices

	const getDevice = (action: CompanionActionEvent): SonosDevice | undefined =>
		manager.Devices.find((d) => d.Uuid === action.options.device)

	const getOptInt = (action: CompanionActionEvent, key: string): number => {
		const val = Number(action.options[key])
		if (isNaN(val)) {
			throw new Error(`Invalid option '${key}'`)
		}
		return val
	}

	const optString = (action: CompanionActionEvent, key: string): string => {
		const val = action.options[key]
		return typeof val === 'string' ? val : ''
	}

	const actions: CompanionActionDefinitions<ModuleTypes['actions']> = {}

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
	actions[ActionId.Mute] = {
		name: 'Set Muted',
		options: [DevicePicker(devices), MutedPicker],
		callback: async (action) => {
			const device = getDevice(action)
			if (device) {
				let muted = action.options.muted === 'mute'
				if (action.options.muted === 'toggle') {
					muted = !device.Muted
				}

				await device.RenderingControlService.SetMute({
					InstanceID: 0,
					Channel: 'Master',
					DesiredMute: muted,
				}).catch((e) => {
					throw new Error(`Sonos: Set muted failed: ${e}`)
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
					throw new Error(`Sonos: Set volume failed: ${e}`)
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
					throw new Error(`Sonos: Adjust volume failed: ${e}`)
				})
			}
		},
	}

	actions[ActionId.LoadStreamUri] = {
		name: 'Load Stream Uri',
		options: [
			DevicePicker(devices),
			{
				type: 'textinput',
				label: 'Stream URI',
				id: 'streamUri',
				useVariables: true,
			},
			{
				type: 'static-text',
				id: 'help',
				value: '',
				label:
					'Read about the supported formats at https://sonos-ts.svrooij.io/sonos-device/methods.html#metadata\nIf your uri is not supported, you can follow their steps to figure out the data needed, and if it needs metadata provide that below',
			},
			{
				type: 'textinput',
				label: 'Manual Metadata',
				id: 'streamMetadata',
				useVariables: true,
			},
			{
				type: 'checkbox',
				label: 'Autoplay',
				id: 'autoplay',
				default: true,
			},
		],
		callback: async (action) => {
			const streamUri = optString(action, 'streamUri')
			const streamMetadata = optString(action, 'streamMetadata')
			const device = getDevice(action)
			if (device) {
				if (streamMetadata) {
					await device.AVTransportService.SetAVTransportURI({
						InstanceID: 0,
						CurrentURI: streamUri,
						CurrentURIMetaData: streamMetadata,
					}).catch((e) => {
						throw new Error(`Sonos: LoadStreamUri failed: ${e}`)
					})
				} else {
					await device.SetAVTransportURI(streamUri).catch((e) => {
						throw new Error(`Sonos: LoadStreamUri failed: ${e}`)
					})
				}

				if (action.options.autoplay) {
					await device.Play().catch((e) => {
						throw new Error(`Sonos: Play failed: ${e}`)
					})
				}
			}
		},
	}

	return {
		...actions,
		...GetPlaybackActions(ctx),
		...GetLibraryActions(ctx),
		...GetGroupActions(ctx),
		...GetEqActions(ctx),
	}
}
