import type { CompanionActionDefinitions, CompanionFeedbackDefinitions, InstanceTypes } from '@companion-module/base'
import type { DeviceConfig } from './config.js'

type OnOffToggleMode = 'on' | 'off' | 'toggle'
type Device = { device: string }
type Level = Device & { level: number }
type Switch = Device & { mode: OnOffToggleMode }

/** The options of every action, keyed by action id */
export type ActionsSchema = {
	// Playback
	play_pause: { options: Device & { mode: 'play' | 'pause' | 'toggle' } }
	stop: { options: Device }
	next_track: { options: Device }
	previous_track: { options: Device }
	seek: { options: Device & { time: string } }
	seek_relative: { options: Device & { seconds: number } }
	repeat: { options: Device & { mode: 'cycle' | 'off' | 'all' | 'one' } }
	shuffle: { options: Switch }
	crossfade: { options: Switch }
	switch_to_queue: { options: Device }
	play_queue_track: { options: Device & { track: number } }
	clear_queue: { options: Device }
	remove_current_from_queue: { options: Device }
	line_in: { options: Device }
	switch_to_tv: { options: Device }
	load_stream_uri: { options: Device & { streamUri: string; streamMetadata: string; autoplay: boolean } }

	// Volume
	mute: { options: Device & { muted: 'toggle' | 'mute' | 'unmute' } }
	volume: { options: Device & { volume: number } }
	volume_delta: { options: Device & { delta: number } }
	ramp_volume: { options: Device & { volume: number } }
	group_volume: { options: Device & { volume: number } }
	group_volume_delta: { options: Device & { delta: number } }
	group_mute: { options: Switch }

	// Favourites, sleep timer and alarms
	play_favourite: { options: Device & { favourite: string } }
	play_radio_station: { options: Device & { station: string } }
	refresh_lists: { options: Record<string, never> }
	sleep_timer: { options: Device & { mode: 'set' | 'cancel'; minutes: number } }
	alarm_enabled: { options: { alarm: number | string; enabled: 'enable' | 'disable' } }
	snooze_alarm: { options: Device & { minutes: number } }

	// Grouping
	join_group: { options: Device & { target: string } }
	ungroup: { options: Device }
	party_mode: { options: Device }
	transfer_playback: { options: Device & { target: string } }

	// EQ and home theatre
	bass: { options: Level }
	treble: { options: Level }
	loudness: { options: Switch }
	balance: { options: Level }
	night_mode: { options: Switch }
	speech_enhancement: { options: Switch }
	sub_enabled: { options: Switch }
	sub_gain: { options: Level }
	surround_enabled: { options: Switch }
	surround_volume_tv: { options: Level }
	surround_volume_music: { options: Level }
	surround_full_volume: { options: Device & { mode: 'full' | 'ambient' } }
}

/** The options of every feedback, keyed by feedback id */
export type FeedbacksSchema = {
	playing: { type: 'boolean'; options: Device }
	paused: { type: 'boolean'; options: Device }
	stopped: { type: 'boolean'; options: Device }
	volume: { type: 'boolean'; options: Device & { comparitor: 'eq' | 'lt' | 'gt'; volume: number } }
	mute: { type: 'boolean'; options: Device }
	repeat: { type: 'boolean'; options: Device & { mode: 'off' | 'all' | 'one' } }
	shuffle: { type: 'boolean'; options: Device }
	grouped: { type: 'boolean'; options: Device }
	coordinator: { type: 'boolean'; options: Device }
}

/** Variables are created for every speaker, with its uuid in the id */
export type VariablesSchema = {
	[
		K in
			| 'name'
			| 'group'
			| 'volume_text'
			| 'state'
			| 'streamUri'
			| 'track_title'
			| 'track_artist'
			| 'track_album'
			| 'album_art'
			| 'repeat'
			| 'group_members' as `device.${string}.${K}`
	]: string
} & {
	[K in 'volume_fixed' | 'muted' | 'shuffle' | 'is_coordinator' as `device.${string}.${K}`]: boolean
} & {
	[K in 'volume' as `device.${string}.${K}`]: number | undefined
}

export interface ModuleTypes extends InstanceTypes {
	config: DeviceConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

/** The definitions of the actions with the given ids */
export type ActionDefs<K extends keyof ActionsSchema> = Pick<CompanionActionDefinitions<ActionsSchema>, K>
/** The definitions of every action */
export type AllActionDefs = CompanionActionDefinitions<ActionsSchema>
/** The definitions of every feedback */
export type AllFeedbackDefs = CompanionFeedbackDefinitions<FeedbacksSchema>
