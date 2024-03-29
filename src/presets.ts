import type { SonosDevice, SonosManager } from '@svrooij/sonos'
import { ActionId, PlayPauseToggle } from './actions.js'
import { FeedbackId, VolumeComparitor } from './feedback.js'
import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionButtonPresetDefinition,
} from '@companion-module/base'

function VolumeDelta(
	device: SonosDevice,
	actionId: ActionId,
	volumeFeedback: FeedbackId,
	delta: number,
): CompanionButtonPresetDefinition {
	const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
	return {
		category: 'Volume',
		name: `${device.Name} Volume ${deltaStr}%`,
		type: 'button',
		style: {
			text: `${device.Name} ${deltaStr}%`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: volumeFeedback,
				style: {
					bgcolor: combineRgb(238, 238, 0),
					color: combineRgb(0, 0, 0),
				},
				options: {
					volume: delta > 0 ? 100 : 0,
					comparitor: VolumeComparitor.Equal,
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: actionId,
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

export function GetPresetsList(manager: SonosManager): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	manager.Devices.forEach((device) => {
		presets[`volume_100_${device.Uuid}`] = {
			category: 'Volume',
			name: `${device.Name} Volume 100%`,
			type: 'button',
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
		presets[`volume_+5_${device.Uuid}`] = VolumeDelta(device, ActionId.VolumeDelta, FeedbackId.Volume, +5)
		presets[`volume_+1_${device.Uuid}`] = VolumeDelta(device, ActionId.VolumeDelta, FeedbackId.Volume, +1)
		presets[`volume_-5_${device.Uuid}`] = VolumeDelta(device, ActionId.VolumeDelta, FeedbackId.Volume, -5)
		presets[`volume_-1_${device.Uuid}`] = VolumeDelta(device, ActionId.VolumeDelta, FeedbackId.Volume, -1)

		presets[`mute_${device.Uuid}`] = {
			category: 'Volume',
			name: `${device.Name} Mute`,
			type: 'button',
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

		presets[`play_pause_${device.Uuid}`] = {
			category: 'Playback',
			name: `${device.Name} Play/Pause`,
			type: 'button',
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
	})

	return presets
}
