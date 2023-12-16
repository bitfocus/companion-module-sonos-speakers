import type { SonosDevice, SonosManager } from '@svrooij/sonos'
import { DevicePicker, MutedPicker, VolumePicker } from './choices.js'
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
	Mute = 'mute',
	Volume = 'volume',
	VolumeDelta = 'volume_delta',
	LoadStreamUri = 'load_stream_uri',
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
		manager.Devices.find((d) => d.Uuid === action.options.device)

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
		callback: async (action, context) => {
			const streamUri = await context.parseVariablesInString(String(action.options.streamUri))
			const streamMetadata = await context.parseVariablesInString(String(action.options.streamMetadata ?? ''))
			console.log('try', streamUri, streamMetadata)
			const device = getDevice(action)
			if (device) {
				if (streamMetadata) {
					await device.AVTransportService.SetAVTransportURI({
						InstanceID: 0,
						CurrentURI: streamUri,
						CurrentURIMetaData: streamMetadata,
					})
				} else {
					await device.SetAVTransportURI(streamUri).catch((e) => {
						throw new Error(`Sonos: LoadStreamUri failed: ${e}`)
					})
				}

				if (action.options.autoplay) {
					await device.Play()
				}
			}
		},
	}

	return actions
}
