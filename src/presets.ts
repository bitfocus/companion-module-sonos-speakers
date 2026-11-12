import type { SonosDevice } from '@svrooij/sonos'
import { ActionId, PlayPauseToggle } from './actions.js'
import { FeedbackId, VolumeComparitor } from './feedback.js'
import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
	type CompanionOptionValues,
} from '@companion-module/base'
import type { LibTrack, SonosContext } from './sonos-context.js'
import type { ModuleTypes } from './types.js'

type Preset = CompanionSimplePresetDefinition<ModuleTypes>
type PresetFeedback = Preset['feedbacks'][number]

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

/** Build a simple button which runs a single action when pressed */
function button(
	name: string,
	text: string,
	actionId: ActionId,
	options: CompanionOptionValues,
	feedbacks: PresetFeedback[] = [],
): Preset {
	return {
		name,
		type: 'simple',
		style: { text, size: 'auto', color: WHITE, bgcolor: BLACK },
		feedbacks,
		steps: [{ down: [{ actionId, options }], up: [] }],
	}
}

function VolumeDelta(device: SonosDevice, delta: number): Preset {
	const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
	return button(
		`${device.Name} Volume ${deltaStr}%`,
		`${device.Name} ${deltaStr}%`,
		ActionId.VolumeDelta,
		{ device: device.Uuid, delta },
		[
			{
				feedbackId: FeedbackId.Volume,
				style: { bgcolor: combineRgb(238, 238, 0), color: BLACK },
				options: { device: device.Uuid, volume: delta > 0 ? 100 : 0, comparitor: VolumeComparitor.Equal },
			},
		],
	)
}

function activeStyle(): { bgcolor: number; color: number } {
	return { bgcolor: combineRgb(0, 255, 0), color: BLACK }
}

function itemButton(item: LibTrack, device: SonosDevice, actionId: ActionId, optionId: string): Preset {
	const title = item.Title ?? 'Unknown'
	return button(`${title} on ${device.Name}`, title, actionId, { device: device.Uuid, [optionId]: title })
}

type Presets = [CompanionPresetSection<ModuleTypes>[], CompanionPresetDefinitions<ModuleTypes>]

export function GetPresetsList(ctx: SonosContext): Presets {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {}
	const sections: CompanionPresetSection<ModuleTypes>[] = []

	ctx.manager.Devices.forEach((device) => {
		const id = (name: string): string => `${name}_${device.Uuid}`
		const uuid = device.Uuid
		const name = device.Name

		// Playback
		presets[id('play_pause')] = button(
			`${name} Play/Pause`,
			`${name} P/P`,
			ActionId.PlayPause,
			{
				device: uuid,
				mode: PlayPauseToggle.Toggle,
			},
			[
				{
					feedbackId: FeedbackId.Playing,
					style: { bgcolor: combineRgb(0, 255, 0), color: BLACK },
					options: { device: uuid },
				},
				{
					feedbackId: FeedbackId.Paused,
					style: { bgcolor: combineRgb(255, 255, 0), color: BLACK },
					options: { device: uuid },
				},
				{
					feedbackId: FeedbackId.Stopped,
					style: { bgcolor: combineRgb(255, 0, 0), color: WHITE },
					options: { device: uuid },
				},
			],
		)
		presets[id('stop')] = button(`${name} Stop`, `${name} Stop`, ActionId.Stop, { device: uuid })
		presets[id('next')] = button(`${name} Next Track`, `${name} Next`, ActionId.NextTrack, { device: uuid })
		presets[id('previous')] = button(`${name} Previous Track`, `${name} Prev`, ActionId.PreviousTrack, {
			device: uuid,
		})
		presets[id('repeat')] = button(
			`${name} Repeat`,
			`${name} Repeat`,
			ActionId.Repeat,
			{ device: uuid, mode: 'cycle' },
			[
				{ feedbackId: FeedbackId.Repeat, style: activeStyle(), options: { device: uuid, mode: 'all' } },
				{
					feedbackId: FeedbackId.Repeat,
					style: { bgcolor: combineRgb(255, 255, 0), color: BLACK },
					options: { device: uuid, mode: 'one' },
				},
			],
		)
		presets[id('shuffle')] = button(
			`${name} Shuffle`,
			`${name} Shuffle`,
			ActionId.Shuffle,
			{ device: uuid, mode: 'toggle' },
			[{ feedbackId: FeedbackId.Shuffle, style: activeStyle(), options: { device: uuid } }],
		)
		presets[id('sleep_30')] = button(`${name} Sleep in 30 minutes`, `${name} Sleep 30m`, ActionId.SleepTimer, {
			device: uuid,
			mode: 'set',
			minutes: 30,
		})

		// Volume
		presets[id('volume_100')] = button(`${name} Volume 100%`, `${name} 100%`, ActionId.Volume, {
			device: uuid,
			volume: 100,
		})
		presets[id('volume_+5')] = VolumeDelta(device, +5)
		presets[id('volume_+1')] = VolumeDelta(device, +1)
		presets[id('volume_-5')] = VolumeDelta(device, -5)
		presets[id('volume_-1')] = VolumeDelta(device, -1)
		presets[id('mute')] = button(`${name} Mute`, `${name} Mute`, ActionId.Mute, { device: uuid, muted: 'toggle' }, [
			{
				feedbackId: FeedbackId.Mute,
				style: { color: WHITE, bgcolor: combineRgb(255, 0, 0) },
				options: { device: uuid },
			},
		])

		// Grouping
		presets[id('party')] = button(`${name} Party mode`, `Party from ${name}`, ActionId.PartyMode, { device: uuid })
		presets[id('ungroup')] = button(`${name} Leave group`, `${name} Leave group`, ActionId.Ungroup, { device: uuid }, [
			{
				feedbackId: FeedbackId.Grouped,
				style: { bgcolor: combineRgb(0, 200, 255), color: BLACK },
				options: { device: uuid },
			},
		])
		presets[id('group_mute')] = button(`${name} Mute group`, `${name} Mute group`, ActionId.GroupMute, {
			device: uuid,
			mode: 'toggle',
		})
		presets[id('group_vol_up')] = button(`${name} Group volume +5%`, `${name} Group +5%`, ActionId.GroupVolumeDelta, {
			device: uuid,
			delta: 5,
		})
		presets[id('group_vol_down')] = button(`${name} Group volume -5%`, `${name} Group -5%`, ActionId.GroupVolumeDelta, {
			device: uuid,
			delta: -5,
		})

		sections.push({
			id: `device_${uuid}`,
			name,
			definitions: [
				{
					id: id('playback'),
					type: 'simple',
					name: 'Playback',
					presets: ['play_pause', 'stop', 'next', 'previous', 'repeat', 'shuffle', 'sleep_30'].map(id),
				},
				{
					id: id('volume'),
					type: 'simple',
					name: 'Volume',
					presets: ['volume_100', 'volume_+5', 'volume_+1', 'volume_-5', 'volume_-1', 'mute'].map(id),
				},
				{
					id: id('grouping'),
					type: 'simple',
					name: 'Grouping',
					presets: ['party', 'ungroup', 'group_mute', 'group_vol_up', 'group_vol_down'].map(id),
				},
			],
		})
	})

	// Favourites and radio stations are shown for the first speaker, the speaker can be changed after adding the button
	const firstDevice = ctx.manager.Devices[0]
	if (firstDevice) {
		const favouriteIds: string[] = []
		ctx.favourites.forEach((item, i) => {
			const key = `favourite_${i}`
			presets[key] = itemButton(item, firstDevice, ActionId.PlayFavourite, 'favourite')
			favouriteIds.push(key)
		})
		if (favouriteIds.length) {
			sections.push({
				id: 'favourites',
				name: 'Favourites',
				description: `Plays on ${firstDevice.Name} by default. Change the speaker after adding the button.`,
				definitions: [{ id: 'favourites_group', type: 'simple', name: 'Favourites', presets: favouriteIds }],
			})
		}

		const stationIds: string[] = []
		ctx.radioStations.forEach((item, i) => {
			const key = `station_${i}`
			presets[key] = itemButton(item, firstDevice, ActionId.PlayRadioStation, 'station')
			stationIds.push(key)
		})
		if (stationIds.length) {
			sections.push({
				id: 'radio_stations',
				name: 'Radio stations',
				description: `Plays on ${firstDevice.Name} by default. Change the speaker after adding the button.`,
				definitions: [{ id: 'radio_stations_group', type: 'simple', name: 'Radio stations', presets: stationIds }],
			})
		}
	}

	return [sections, presets]
}
