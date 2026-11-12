import type { MetaDataHelper, SonosDevice, SonosManager } from '@svrooij/sonos'

/** The library's track type, which is not exported from the package root */
export type LibTrack = NonNullable<Parameters<typeof MetaDataHelper.TrackToMetaData>[0]>
export type LibAlarm = Awaited<ReturnType<SonosDevice['AlarmList']>>[number]

/** Everything the action, feedback and preset builders need to know about the Sonos system */
export interface SonosContext {
	manager: SonosManager
	/** Sonos favourites, loaded when connecting */
	favourites: LibTrack[]
	/** TuneIn "My Radio Stations", loaded when connecting */
	radioStations: LibTrack[]
	/** Alarms, loaded when connecting */
	alarms: LibAlarm[]
	/** Reload favourites, radio stations and alarms from the speakers */
	refresh: () => Promise<void>
}
