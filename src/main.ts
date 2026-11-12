import { SonosDevice, SonosEvents, SonosManager } from '@svrooij/sonos'
import type { SonosContext } from './sonos-context.js'
import { GetActionsList } from './actions.js'
import { type DeviceConfig, GetConfigFields } from './config.js'
import { FeedbackId, GetFeedbacksList } from './feedback.js'
import { GetPresetsList } from './presets.js'
import { InitVariables, updateVariables, type Track, type TrackCache } from './variables.js'
import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import type { ModuleTypes } from './types.js'
import type { LibTrack } from './sonos-context.js'

export { UpgradeScripts } from './upgrades.js'

export default class ControllerInstance extends InstanceBase<ModuleTypes> {
	private manager = new SonosManager()
	private context: SonosContext | undefined
	private readonly tracks: TrackCache = new Map()
	/** Incremented on every (re)initialisation so stale async results can be ignored */
	private generation = 0

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 */
	public async init(config: DeviceConfig): Promise<void> {
		await this.configUpdated(config)
	}

	/**
	 * Process an updated configuration array.
	 */
	public async configUpdated(config: DeviceConfig): Promise<void> {
		const generation = ++this.generation

		this.updateStatus(InstanceStatus.Connecting)

		this.stopManager()
		this.tracks.clear()
		this.context = undefined
		// Use a fresh manager, so event handlers of the previous one cannot fire into the new state
		this.manager = new SonosManager()
		const manager = this.manager

		if (!config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'No discovery IP configured')
			return
		}

		try {
			await manager.InitializeFromDevice(config.host)
		} catch (e) {
			if (generation !== this.generation) return

			this.stopManager()
			this.updateStatus(InstanceStatus.ConnectionFailure, `Load manager failed: ${e}`)
			return
		}
		if (generation !== this.generation) {
			// A newer configUpdated/destroy happened while we were connecting
			try {
				manager.CancelSubscription()
			} catch {
				// Ignore
			}
			return
		}

		this.updateStatus(InstanceStatus.Ok)

		manager.Devices.forEach((d) => this.subscribeEvents(d))

		const ctx: SonosContext = {
			manager,
			favourites: [],
			radioStations: [],
			alarms: [],
			refresh: async () => {
				if (generation !== this.generation) return
				await this.loadLists(ctx)
				if (generation !== this.generation) return
				this.setPresetDefinitions(...GetPresetsList(ctx))
				this.setActionDefinitions(GetActionsList(ctx))
			},
		}
		this.context = ctx
		await this.loadLists(ctx)
		if (generation !== this.generation) return

		InitVariables(this, manager, this.tracks)
		this.setPresetDefinitions(...GetPresetsList(ctx))
		this.setActionDefinitions(GetActionsList(ctx))
		this.setFeedbackDefinitions(GetFeedbacksList(ctx))

		this.checkAllFeedbacks()
	}

	/** Load the favourites, radio stations and alarms. Failing to load these should not stop the module working. */
	private async loadLists(ctx: SonosContext): Promise<void> {
		const device = ctx.manager.Devices[0]
		if (!device) return

		const asTracks = (result: { Result: unknown }): LibTrack[] => (Array.isArray(result.Result) ? result.Result : [])

		const [favourites, stations, alarms] = await Promise.allSettled([
			device.GetFavorites(),
			device.GetFavoriteRadioStations(),
			device.AlarmClockService.ListAndParseAlarms(),
		])
		if (favourites.status === 'fulfilled') ctx.favourites = asTracks(favourites.value)
		else this.log('warn', `Failed to load favourites: ${favourites.reason}`)
		if (stations.status === 'fulfilled') ctx.radioStations = asTracks(stations.value)
		else this.log('warn', `Failed to load radio stations: ${stations.reason}`)
		if (alarms.status === 'fulfilled') ctx.alarms = alarms.value
		else this.log('warn', `Failed to load alarms: ${alarms.reason}`)
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Clean up the instance before it is destroyed.
	 */
	public async destroy(): Promise<void> {
		this.generation++
		this.stopManager()
	}

	private stopManager(): void {
		try {
			this.manager.CancelSubscription()
		} catch {
			// Ignore
		}
	}

	private subscribeEvents(device: SonosDevice): void {
		const refresh = (): void => updateVariables(this, this.manager, this.tracks)

		device.Events.on(SonosEvents.CurrentTransportState, () => {
			this.checkFeedbacks(FeedbackId.Playing, FeedbackId.Paused, FeedbackId.Stopped)
			refresh()
		})
		device.Events.on(SonosEvents.GroupName, () => {
			if (this.context) this.setPresetDefinitions(...GetPresetsList(this.context))
			refresh()
			this.checkFeedbacks(FeedbackId.Grouped, FeedbackId.Coordinator)
		})
		device.Events.on(SonosEvents.Coordinator, () => {
			refresh()
			this.checkFeedbacks(FeedbackId.Grouped, FeedbackId.Coordinator)
		})
		// Fired for any AVTransport change, which includes changes of the play mode (repeat and shuffle)
		device.Events.on(SonosEvents.AVTransport, () => {
			refresh()
			this.checkFeedbacks(FeedbackId.Repeat, FeedbackId.Shuffle)
		})
		device.Events.on(SonosEvents.Volume, () => {
			this.checkFeedbacks(FeedbackId.Volume)
			refresh()
		})
		device.Events.on(SonosEvents.Mute, () => {
			this.checkFeedbacks(FeedbackId.Mute)
			refresh()
		})
		device.Events.on(SonosEvents.CurrentTrackUri, refresh)
		device.Events.on(SonosEvents.CurrentTrackMetadata, (track: Track | string) => {
			if (typeof track === 'string') {
				this.tracks.delete(device.Uuid)
			} else {
				this.tracks.set(device.Uuid, track)
			}
			refresh()
		})
	}
}
