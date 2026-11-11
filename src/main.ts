import { SonosDevice, SonosEvents, SonosManager } from '@svrooij/sonos'
import { GetActionsList } from './actions.js'
import { type DeviceConfig, GetConfigFields } from './config.js'
import { FeedbackId, GetFeedbacksList } from './feedback.js'
import { GetPresetsList } from './presets.js'
import { InitVariables, updateVariables, type Track, type TrackCache } from './variables.js'
import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import type { ModuleTypes } from './types.js'

export { UpgradeScripts } from './upgrades.js'

export default class ControllerInstance extends InstanceBase<ModuleTypes> {
	private manager = new SonosManager()
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

		InitVariables(this, manager, this.tracks)
		this.setPresetDefinitions(...GetPresetsList(manager))
		this.setActionDefinitions(GetActionsList(manager))
		this.setFeedbackDefinitions(GetFeedbacksList(manager))

		this.checkAllFeedbacks()
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
			this.setPresetDefinitions(...GetPresetsList(this.manager))
			refresh()
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
