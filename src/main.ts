import { SonosDevice, SonosEventListener, SonosEvents, SonosManager } from '@svrooij/sonos'
import type { SonosContext } from './sonos-context.js'
import { GetActionsList } from './actions.js'
import {
	type DeviceConfig,
	DEFAULT_POLL_INTERVAL,
	GetConfigFields,
	GetListenerChoices,
	LISTENER_AUTO,
} from './config.js'
import { DeviceStateStore, pollDevices, type Track } from './device-state.js'
import { FeedbackId, GetFeedbacksList } from './feedback.js'
import { GetPresetsList } from './presets.js'
import { InitVariables, updateVariables } from './variables.js'
import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import type { ModuleTypes } from './types.js'
import type { LibTrack } from './sonos-context.js'

export { UpgradeScripts } from './upgrades.js'

/** The event listener address which was detected automatically */
let autoListenerHost: string | undefined

export default class ControllerInstance extends InstanceBase<ModuleTypes> {
	private manager = new SonosManager()
	private context: SonosContext | undefined
	private readonly state = new DeviceStateStore()
	private pollTimer: NodeJS.Timeout | undefined
	private readonly reportedSubscriptionErrors = new Set<string>()
	/** Incremented on every (re)initialisation so stale async results can be ignored */
	private generation = 0

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 */
	public async init(config: DeviceConfig): Promise<void> {
		// Discovery can take a while, so connect in the background instead of delaying the startup of the module
		this.startConnecting(config)
	}

	/**
	 * Process an updated configuration array.
	 */
	public async configUpdated(config: DeviceConfig): Promise<void> {
		this.startConnecting(config)
	}

	private startConnecting(config: DeviceConfig): void {
		this.connect(config).catch((e) => {
			this.log('error', `Failed to connect: ${e}`)
			this.updateStatus(InstanceStatus.UnknownError, `Failed to connect: ${e}`)
		})
	}

	private async connect(config: DeviceConfig): Promise<void> {
		const generation = ++this.generation

		this.updateStatus(InstanceStatus.Connecting)

		this.stopManager()
		this.state.clear()
		this.reportedSubscriptionErrors.clear()
		this.context = undefined
		// Use a fresh manager, so event handlers of the previous one cannot fire into the new state
		this.manager = new SonosManager()
		const manager = this.manager

		this.applyListenerHost(config.listenerHost)

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

		// Read the current state of the speakers, as events only report changes
		await pollDevices(manager, this.state).catch((e) => this.log('warn', `Failed to read speaker status: ${e}`))
		if (generation !== this.generation) return

		manager.Devices.forEach((d) => this.subscribeEvents(d))
		const listener = SonosEventListener.DefaultInstance.GetStatus()
		this.log('info', `Listening for speaker updates on ${listener.host}:${listener.port}`)

		const ctx: SonosContext = {
			manager,
			state: this.state,
			favourites: [],
			radioStations: [],
			alarms: [],
			refresh: async () => {
				if (generation !== this.generation) return
				await this.loadLists(ctx)
				if (generation !== this.generation) return
				this.setActionDefinitions(GetActionsList(ctx))
				this.setPresetDefinitions(...GetPresetsList(ctx))
			},
		}
		this.context = ctx
		await this.loadLists(ctx)
		if (generation !== this.generation) return

		InitVariables(this, manager, this.state)
		// Presets reference actions and feedbacks, so those need to be defined first
		this.setActionDefinitions(GetActionsList(ctx))
		this.setFeedbackDefinitions(GetFeedbacksList(ctx))
		this.setPresetDefinitions(...GetPresetsList(ctx))

		this.checkAllFeedbacks()
		this.startPolling(config.pollInterval ?? DEFAULT_POLL_INTERVAL, generation)
	}

	/** Choose the network interface the speakers send their updates to. The listener is shared by the whole process. */
	private applyListenerHost(selected: string | undefined): void {
		const listener = SonosEventListener.DefaultInstance
		// Remember the automatically detected address before it is overridden, to go back to it
		autoListenerHost ??= listener.GetStatus().host

		let host = autoListenerHost
		if (selected && selected !== LISTENER_AUTO) {
			if (GetListenerChoices().some((c) => c.id === selected)) {
				host = selected
			} else {
				this.log('warn', `Network interface ${selected} no longer exists, detecting it automatically`)
			}
		}
		listener.UpdateSettings({ host })
	}

	private startPolling(intervalSeconds: number, generation: number): void {
		if (!(intervalSeconds > 0)) return

		let running = false
		this.pollTimer = setInterval(() => {
			if (running || generation !== this.generation) return
			running = true
			pollDevices(this.manager, this.state)
				.then((changed) => {
					if (changed && generation === this.generation) {
						updateVariables(this, this.manager, this.state)
						this.checkAllFeedbacks()
					}
				})
				.catch((e) => this.log('debug', `Failed to read speaker status: ${e}`))
				.finally(() => {
					running = false
				})
		}, intervalSeconds * 1000)
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
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = undefined
		}
		try {
			this.manager.CancelSubscription()
		} catch {
			// Ignore
		}
	}

	private subscribeEvents(device: SonosDevice): void {
		const refresh = (): void => updateVariables(this, this.manager, this.state)
		const onTransport = (): void => this.state.noteEvent(device.Uuid, 'transport')
		const onRendering = (): void => this.state.noteEvent(device.Uuid, 'rendering')

		device.Events.on(SonosEvents.CurrentTransportState, () => {
			onTransport()
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
			onTransport()
			refresh()
			this.checkFeedbacks(FeedbackId.Repeat, FeedbackId.Shuffle)
		})
		device.Events.on(SonosEvents.Volume, () => {
			onRendering()
			this.checkFeedbacks(FeedbackId.Volume)
			refresh()
		})
		device.Events.on(SonosEvents.Mute, () => {
			onRendering()
			this.checkFeedbacks(FeedbackId.Mute)
			refresh()
		})
		device.Events.on(SonosEvents.SubscriptionError, (e: unknown) => {
			// Only report each distinct problem once, as it would otherwise repeat on every retry
			const message = e instanceof Error ? e.message : String(e)
			if (this.reportedSubscriptionErrors.has(message)) return
			this.reportedSubscriptionErrors.add(message)
			this.log(
				'warn',
				`Speaker updates from ${device.Name} are not reaching Companion (${message}). The status is refreshed by polling instead. Check the firewall, or set the event listener IP in the module settings.`,
			)
		})
		device.Events.on(SonosEvents.CurrentTrackUri, () => {
			onTransport()
			refresh()
		})
		device.Events.on(SonosEvents.CurrentTrackMetadata, (track: Track | string) => {
			onTransport()
			this.state.setTrack(device.Uuid, typeof track === 'string' ? undefined : track)
			refresh()
		})
	}
}
