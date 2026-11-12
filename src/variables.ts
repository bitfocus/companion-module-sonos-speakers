import type { SonosManager } from '@svrooij/sonos'
import type { CompanionVariableDefinitions, CompanionVariableValues, InstanceBase } from '@companion-module/base'
import { getGroupMembers, type DeviceStateStore } from './device-state.js'
import type { ModuleTypes } from './types.js'

export function updateVariables(
	instance: InstanceBase<ModuleTypes>,
	manager: SonosManager,
	state: DeviceStateStore,
): void {
	const newValues: CompanionVariableValues = {}

	manager.Devices.forEach((dev) => {
		const track = state.track(dev)
		const prefix = `device.${dev.Uuid}`

		newValues[`${prefix}.name`] = dev.Name
		newValues[`${prefix}.group`] = dev.GroupName || ''
		// `volume` is numeric so it can be used in expressions. `volume_text` is for display on buttons.
		const volume = state.volume(dev)
		newValues[`${prefix}.volume`] = volume
		newValues[`${prefix}.volume_text`] = volume === undefined ? '-' : `${volume}%`
		newValues[`${prefix}.volume_fixed`] = state.isFixedVolume(dev)
		newValues[`${prefix}.muted`] = state.muted(dev) ?? false
		newValues[`${prefix}.state`] = state.transportState(dev) ?? ''
		newValues[`${prefix}.streamUri`] = state.trackUri(dev) ?? ''
		newValues[`${prefix}.track_title`] = track?.Title ?? ''
		newValues[`${prefix}.track_artist`] = track?.Artist ?? ''
		newValues[`${prefix}.track_album`] = track?.Album ?? ''
		newValues[`${prefix}.album_art`] = track?.AlbumArtUri ?? ''

		const playMode = state.playMode(dev)
		newValues[`${prefix}.repeat`] = playMode?.repeat ?? ''
		newValues[`${prefix}.shuffle`] = playMode?.shuffle ?? false
		newValues[`${prefix}.is_coordinator`] = dev.IsCoordinator
		newValues[`${prefix}.group_members`] = getGroupMembers(manager, dev)
			.map((d) => d.Name)
			.join(', ')
	})

	instance.setVariableValues(newValues)
}

export function InitVariables(
	instance: InstanceBase<ModuleTypes>,
	manager: SonosManager,
	state: DeviceStateStore,
): void {
	const variables: CompanionVariableDefinitions = {}

	manager.Devices.forEach((dev) => {
		const prefix = `device.${dev.Uuid}`
		variables[`${prefix}.name`] = { name: `Device name (${dev.Name})` }
		variables[`${prefix}.group`] = { name: `Device group (${dev.Name})` }
		variables[`${prefix}.volume`] = { name: `Device volume, number 0-100 (${dev.Name})` }
		variables[`${prefix}.volume_text`] = { name: `Device volume as text, e.g. 50% (${dev.Name})` }
		variables[`${prefix}.volume_fixed`] = { name: `Device has a fixed volume (${dev.Name})` }
		variables[`${prefix}.muted`] = { name: `Device muted (${dev.Name})` }
		variables[`${prefix}.state`] = {
			name: `Device playback state: e.g. PLAYING, PAUSED_PLAYBACK, STOPPED, TRANSITIONING (${dev.Name})`,
		}
		variables[`${prefix}.streamUri`] = { name: `Device stream URI (${dev.Name})` }
		variables[`${prefix}.track_title`] = { name: `Current track title (${dev.Name})` }
		variables[`${prefix}.track_artist`] = { name: `Current track artist (${dev.Name})` }
		variables[`${prefix}.track_album`] = { name: `Current track album (${dev.Name})` }
		variables[`${prefix}.album_art`] = { name: `Current album art URL (${dev.Name})` }
		variables[`${prefix}.repeat`] = { name: `Repeat mode: off, all or one (${dev.Name})` }
		variables[`${prefix}.shuffle`] = { name: `Shuffle enabled (${dev.Name})` }
		variables[`${prefix}.is_coordinator`] = { name: `Is the coordinator of its group (${dev.Name})` }
		variables[`${prefix}.group_members`] = { name: `Names of all speakers in the group (${dev.Name})` }
	})

	instance.setVariableDefinitions(variables)
	updateVariables(instance, manager, state)
}
