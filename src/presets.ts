import type { SonosDevice, SonosManager } from '@svrooij/sonos'
import { ActionId, PlayPauseToggle } from './actions.js'
import { FeedbackId, VolumeComparitor } from './feedback.js'
import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
} from '@companion-module/base'
import type { ModuleTypes } from './types.js'

type Preset = CompanionSimplePresetDefinition<ModuleTypes>

function VolumeDelta(device: SonosDevice, delta: number): Preset {
	const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
	return {
		name: `${device.Name} Volume ${deltaStr}%`,
		type: 'simple',
		style: {
			text: `${device.Name} ${deltaStr}%`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.Volume,
				style: {
					bgcolor: combineRgb(238, 238, 0),
					color: combineRgb(0, 0, 0),
				},
				options: {
					device: device.Uuid,
					volume: delta > 0 ? 100 : 0,
					comparitor: VolumeComparitor.Equal,
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: ActionId.VolumeDelta,
						options: {
							device: device.Uuid,
							delta,
						},
					},
				],
				up: [],
			},
		],
	}
}

export function GetPresetsList(
	manager: SonosManager,
): [CompanionPresetSection<ModuleTypes>[], CompanionPresetDefinitions<ModuleTypes>] {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {}
	const sections: CompanionPresetSection<ModuleTypes>[] = []

	manager.Devices.forEach((device) => {
		const volumeIds = [
			`volume_100_${device.Uuid}`,
			`volume_+5_${device.Uuid}`,
			`volume_+1_${device.Uuid}`,
			`volume_-5_${device.Uuid}`,
			`volume_-1_${device.Uuid}`,
			`mute_${device.Uuid}`,
		]
		const playbackIds = [`play_pause_${device.Uuid}`, `next_${device.Uuid}`, `previous_${device.Uuid}`]

		presets[volumeIds[0]] = {
			name: `${device.Name} Volume 100%`,
			type: 'simple',
			style: {
				text: `${device.Name} 100%`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [],
			steps: [
				{
					down: [
						{
							actionId: ActionId.Volume,
							options: {
								device: device.Uuid,
								volume: 100,
							},
						},
					],
					up: [],
				},
			],
		}
		presets[volumeIds[1]] = VolumeDelta(device, +5)
		presets[volumeIds[2]] = VolumeDelta(device, +1)
		presets[volumeIds[3]] = VolumeDelta(device, -5)
		presets[volumeIds[4]] = VolumeDelta(device, -1)

		presets[volumeIds[5]] = {
			name: `${device.Name} Mute`,
			type: 'simple',
			style: {
				text: `${device.Name} Mute`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: FeedbackId.Mute,
					style: {
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(255, 0, 0),
					},
					options: {
						device: device.Uuid,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: ActionId.Mute,
							options: {
								device: device.Uuid,
								muted: 'toggle',
							},
						},
					],
					up: [],
				},
			],
		}

		presets[playbackIds[0]] = {
			name: `${device.Name} Play/Pause`,
			type: 'simple',
			style: {
				text: `${device.Name} P/P`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: FeedbackId.Playing,
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(0, 0, 0),
					},
					options: {
						device: device.Uuid,
					},
				},
				{
					feedbackId: FeedbackId.Paused,
					style: {
						bgcolor: combineRgb(255, 255, 0),
						color: combineRgb(0, 0, 0),
					},
					options: {
						device: device.Uuid,
					},
				},
				{
					feedbackId: FeedbackId.Stopped,
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255),
					},
					options: {
						device: device.Uuid,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: ActionId.PlayPause,
							options: {
								device: device.Uuid,
								mode: PlayPauseToggle.Toggle,
							},
						},
					],
					up: [],
				},
			],
		}
		presets[playbackIds[1]] = {
			name: `${device.Name} Next Track`,
			type: 'simple',
			style: {
				text: `${device.Name} Next`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [],
			steps: [{ down: [{ actionId: ActionId.NextTrack, options: { device: device.Uuid } }], up: [] }],
		}
		presets[playbackIds[2]] = {
			name: `${device.Name} Previous Track`,
			type: 'simple',
			style: {
				text: `${device.Name} Prev`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [],
			steps: [{ down: [{ actionId: ActionId.PreviousTrack, options: { device: device.Uuid } }], up: [] }],
		}

		sections.push({
			id: `device_${device.Uuid}`,
			name: device.Name,
			definitions: [
				{ id: `playback_${device.Uuid}`, type: 'simple', name: 'Playback', presets: playbackIds },
				{ id: `volume_${device.Uuid}`, type: 'simple', name: 'Volume', presets: volumeIds },
			],
		})
	})

	return [sections, presets]
}
