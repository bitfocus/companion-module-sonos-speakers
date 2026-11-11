import type { SonosDevice, SonosManager } from '@svrooij/sonos'
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

export function GetFeedbacksList(manager: SonosManager): CompanionFeedbackDefinitions<ModuleTypes['feedbacks']> {
	const feedbacks: CompanionFeedbackDefinitions<ModuleTypes['feedbacks']> = {}

	const devices = manager.Devices

	const getDevice = (event: CompanionFeedbackBooleanEvent): SonosDevice | undefined =>
		manager.Devices.find((d) => d.Uuid === event.options.device)

	feedbacks[FeedbackId.Playing] = {
		name: 'Device playing',
		type: 'boolean',
		description: 'If the device is playing, change colors of the bank',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(0, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return (
				String(device?.CurrentTransportState) === TransportState.Playing ||
				String(device?.CurrentTransportState) === TransportState.Transitioning
			)
		},
	}
	feedbacks[FeedbackId.Paused] = {
		name: 'Device paused',
		type: 'boolean',
		description: 'If the device is paused, change colors of the bank',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return String(device?.CurrentTransportState) === TransportState.Paused
		},
	}
	feedbacks[FeedbackId.Stopped] = {
		name: 'Device stopped',
		type: 'boolean',
		description: 'If the device is stopped, change colors of the bank',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return String(device?.CurrentTransportState) === TransportState.Stopped
		},
	}
	feedbacks[FeedbackId.Mute] = {
		name: 'Device muted',
		type: 'boolean',
		description: 'If the device is muted, change style of the bank',
		options: [DevicePicker(devices)],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return !!device?.Muted
		},
	}
	feedbacks[FeedbackId.Volume] = {
		name: 'Device volume',
		type: 'boolean',
		description: 'If the device is volume matches, change colors of the bank',
		options: [DevicePicker(devices), VolumeComparitorPicker(), VolumePicker()],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		callback: (event) => {
			const device = getDevice(event)
			return (
				device?.Volume !== undefined && compareVolume(event.options.volume, event.options.comparitor, device?.Volume)
			)
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
