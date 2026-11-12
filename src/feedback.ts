import type { SonosDevice } from '@svrooij/sonos'
import { getGroupMembers } from './device-state.js'
import type { SonosContext } from './sonos-context.js'
import { DevicePicker, VolumePicker } from './choices.js'
import {
	combineRgb,
	type CompanionFeedbackBooleanEvent,
	type CompanionFeedbackDefinitions,
	type CompanionInputFieldDropdown,
	type JsonValue,
} from '@companion-module/base'
import type { ModuleTypes } from './types.js'

// Values of the library's TransportState enum, which is not exported from the package root
const TransportState = {
	Playing: 'PLAYING',
	Transitioning: 'TRANSITIONING',
	Paused: 'PAUSED_PLAYBACK',
	Stopped: 'STOPPED',
} as const

export enum FeedbackId {
	Playing = 'playing',
	Paused = 'paused',
	Stopped = 'stopped',
	Volume = 'volume',
	Mute = 'mute',
	Repeat = 'repeat',
	Shuffle = 'shuffle',
	Grouped = 'grouped',
	Coordinator = 'coordinator',
}

export enum VolumeComparitor {
	Equal = 'eq',
	LessThan = 'lt',
	GreaterThan = 'gt',
}

function VolumeComparitorPicker(): CompanionInputFieldDropdown {
	const options = [
		{ id: VolumeComparitor.Equal, label: 'Equal' },
		{ id: VolumeComparitor.GreaterThan, label: 'Greater than' },
		{ id: VolumeComparitor.LessThan, label: 'Less than' },
	]
	return {
		type: 'dropdown',
		label: 'Comparitor',
		id: 'comparitor',
		default: VolumeComparitor.Equal,
		choices: options,
	}
}

export function GetFeedbacksList(ctx: SonosContext): CompanionFeedbackDefinitions<ModuleTypes['feedbacks']> {
	const feedbacks: CompanionFeedbackDefinitions<ModuleTypes['feedbacks']> = {}

	const manager = ctx.manager
	const devices = manager.Devices

	const getDevice = (event: CompanionFeedbackBooleanEvent): SonosDevice | undefined =>
		manager.Devices.find((d) => d.Uuid === event.options.device)

	feedbacks[FeedbackId.Playing] = {
		name: 'Device playing',
		type: 'boolean',
		description: 'True if the device is playing',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return (
				String(device && ctx.state.transportState(device)) === TransportState.Playing ||
				String(device && ctx.state.transportState(device)) === TransportState.Transitioning
			)
		},
	}
	feedbacks[FeedbackId.Paused] = {
		name: 'Device paused',
		type: 'boolean',
		description: 'True if the device is paused',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return String(device && ctx.state.transportState(device)) === TransportState.Paused
		},
	}
	feedbacks[FeedbackId.Stopped] = {
		name: 'Device stopped',
		type: 'boolean',
		description: 'True if the device is stopped',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return String(device && ctx.state.transportState(device)) === TransportState.Stopped
		},
	}
	feedbacks[FeedbackId.Mute] = {
		name: 'Device muted',
		type: 'boolean',
		description: 'True if the device is muted',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return !!device && !!ctx.state.muted(device)
		},
	}
	feedbacks[FeedbackId.Volume] = {
		name: 'Device volume',
		type: 'boolean',
		description: 'True if the device volume matches',
		options: [DevicePicker(devices), VolumeComparitorPicker(), VolumePicker()],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			const volume = device && ctx.state.volume(device)
			return volume !== undefined && compareVolume(event.options.volume, event.options.comparitor, volume)
		},
	}

	feedbacks[FeedbackId.Repeat] = {
		name: 'Device repeat mode',
		type: 'boolean',
		description: 'True if the device has the chosen repeat mode',
		options: [
			DevicePicker(devices),
			{
				type: 'dropdown',
				label: 'Repeat mode',
				id: 'mode',
				default: 'all',
				choices: [
					{ id: 'off', label: 'Off' },
					{ id: 'all', label: 'Repeat all' },
					{ id: 'one', label: 'Repeat one' },
				],
			},
		],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return !!device && ctx.state.playMode(device)?.repeat === event.options.mode
		},
	}
	feedbacks[FeedbackId.Shuffle] = {
		name: 'Device shuffle',
		type: 'boolean',
		description: 'True if shuffle is on',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return !!device && !!ctx.state.playMode(device)?.shuffle
		},
	}
	feedbacks[FeedbackId.Grouped] = {
		name: 'Device grouped',
		type: 'boolean',
		description: 'True if the device is grouped with other speakers',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 200, 255),
		},
		callback: (event) => {
			const device = getDevice(event)
			return !!device && getGroupMembers(manager, device).length > 1
		},
	}
	feedbacks[FeedbackId.Coordinator] = {
		name: 'Device is group coordinator',
		type: 'boolean',
		description: 'True if the device is the coordinator of its group (the one which is playing)',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 165, 0),
		},
		callback: (event) => {
			return !!getDevice(event)?.IsCoordinator
		},
	}

	return feedbacks
}

function compareVolume(
	target: JsonValue | undefined,
	comparitor: JsonValue | undefined,
	currentValue: number,
): boolean {
	const targetVolume = Number(target)
	if (isNaN(targetVolume)) {
		return false
	}

	switch (comparitor) {
		case VolumeComparitor.GreaterThan:
			return currentValue > targetVolume
		case VolumeComparitor.LessThan:
			return currentValue < targetVolume
		default:
			return currentValue === targetVolume
	}
}
