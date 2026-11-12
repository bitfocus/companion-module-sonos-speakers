import type { SonosManager } from '@svrooij/sonos'
import type { CompanionVariableDefinitions, CompanionVariableValues, InstanceBase } from '@companion-module/base'
import { getGroupMembers, getPlayModeState } from './device-state.js'
import type { ModuleTypes } from './types.js'

/** The subset of the library's track metadata used by this module */
export interface Track {
	Title?: string
	Artist?: string
	Album?: string
	AlbumArtUri?: string
}

/** Latest track metadata for each device, keyed by device uuid */
export type TrackCache = Map<string, Track>

export function updateVariables(instance: InstanceBase<ModuleTypes>, manager: SonosManager, tracks: TrackCache): void {
	const newValues: CompanionVariableValues = {}

	manager.Devices.forEach((dev) => {
		const track = tracks.get(dev.Uuid)
		const prefix = `device.${dev.Uuid}`

		newValues[`${prefix}.name`] = dev.Name
		newValues[`${prefix}.group`] = dev.GroupName || ''
		// `volume` is numeric so it can be used in expressions. `volume_text` is for display on buttons.
		newValues[`${prefix}.volume`] = dev.Volume
		newValues[`${prefix}.volume_text`] = dev.Volume === undefined ? '-' : `${dev.Volume}%`
		newValues[`${prefix}.muted`] = dev.Muted ?? false
		newValues[`${prefix}.state`] = dev.CurrentTransportStateSimple ?? ''
		newValues[`${prefix}.streamUri`] = dev.CurrentTrackUri ?? ''
		newValues[`${prefix}.track_title`] = track?.Title ?? ''
		newValues[`${prefix}.track_artist`] = track?.Artist ?? ''
		newValues[`${prefix}.track_album`] = track?.Album ?? ''
		newValues[`${prefix}.album_art`] = track?.AlbumArtUri ?? ''

		const playMode = getPlayModeState(dev)
		newValues[`${prefix}.repeat`] = playMode?.repeat ?? ''
		newValues[`${prefix}.shuffle`] = playMode?.shuffle ?? false
		newValues[`${prefix}.is_coordinator`] = dev.IsCoordinator
		newValues[`${prefix}.group_members`] = getGroupMembers(manager, dev)
			.map((d) => d.Name)
			.join(', ')
	})

	instance.setVariableValues(newValues)
}

export function InitVariables(instance: InstanceBase<ModuleTypes>, manager: SonosManager, tracks: TrackCache): void {
	const variables: CompanionVariableDefinitions = {}

	manager.Devices.forEach((dev) => {
		const prefix = `device.${dev.Uuid}`
		variables[`${prefix}.name`] = { name: `Device name (${dev.Name})` }
		variables[`${prefix}.group`] = { name: `Device group (${dev.Name})` }
		variables[`${prefix}.volume`] = { name: `Device volume, number 0-100 (${dev.Name})` }
		variables[`${prefix}.volume_text`] = { name: `Device volume as text, e.g. 50% (${dev.Name})` }
		variables[`${prefix}.muted`] = { name: `Device muted (${dev.Name})` }
		variables[`${prefix}.state`] = {
			name: `Device playback state: e.g. PLAYING, PAUSED_PLAYBACK, STOPPED (${dev.Name})`,
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
	updateVariables(instance, manager, tracks)
}
