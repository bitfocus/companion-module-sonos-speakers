import type { SonosDevice, SonosManager } from '@svrooij/sonos'

export type RepeatState = 'off' | 'all' | 'one'

export interface PlayModeState {
	shuffle: boolean
	repeat: RepeatState
}

/** The subset of the library's track metadata used by this module */
export interface Track {
	Title?: string
	Artist?: string
	Album?: string
	AlbumArtUri?: string
}

/** State read directly from a speaker, used when it has not been delivered by an event (yet) */
interface PolledDeviceState {
	volume?: number
	muted?: boolean
	fixedVolume?: boolean
	transportState?: string
	playMode?: string
	trackUri?: string
}

/**
 * The state of the speakers.
 * Values pushed by speaker events are preferred, and values read by polling fill the gaps.
 * Events can fail to arrive (firewalls, multiple network interfaces), so polling keeps the module working then.
 */
export class DeviceStateStore {
	private readonly polled = new Map<string, PolledDeviceState>()
	private readonly tracks = new Map<string, Track>()
	private readonly polledAt = new Map<string, number>()
	private readonly eventAt = new Map<string, number>()

	public clear(): void {
		this.polled.clear()
		this.tracks.clear()
		this.polledAt.clear()
		this.eventAt.clear()
	}

	public setTrack(uuid: string, track: Track | undefined): void {
		if (track) this.tracks.set(uuid, track)
		else this.tracks.delete(uuid)
	}

	/** The track playing in the group the device is in, as stored for the group coordinator */
	public track(device: SonosDevice): Track | undefined {
		return this.tracks.get(device.Coordinator.Uuid)
	}

	/** Store newly polled state, returns true when it differs from what was known before */
	public setPolled(uuid: string, state: PolledDeviceState): boolean {
		this.polledAt.set(uuid, Date.now())
		const changed = JSON.stringify(this.polled.get(uuid)) !== JSON.stringify(state)
		this.polled.set(uuid, state)
		return changed
	}

	/** Record that a speaker event has just updated the state of the device */
	public noteEvent(uuid: string, kind: 'transport' | 'rendering'): void {
		this.eventAt.set(`${uuid}:${kind}`, Date.now())
	}

	/**
	 * Whether the value cached from speaker events is at least as recent as the polled value.
	 * If events stop arriving, the polled value takes over rather than the cache going stale.
	 */
	private eventIsFresher(uuid: string, kind: 'transport' | 'rendering'): boolean {
		return (this.eventAt.get(`${uuid}:${kind}`) ?? 0) >= (this.polledAt.get(uuid) ?? 0)
	}

	private pick<T>(
		uuid: string,
		kind: 'transport' | 'rendering',
		fromEvents: T | undefined,
		polled: T | undefined,
	): T | undefined {
		if (polled === undefined) return fromEvents
		if (fromEvents === undefined) return polled
		return this.eventIsFresher(uuid, kind) ? fromEvents : polled
	}

	public volume(device: SonosDevice): number | undefined {
		const polled = this.polled.get(device.Uuid)
		// Speakers with a fixed volume (Connect, Port) always output at full volume
		if (polled?.fixedVolume) return 100
		return this.pick(device.Uuid, 'rendering', device.Volume, polled?.volume)
	}

	public isFixedVolume(device: SonosDevice): boolean {
		return this.polled.get(device.Uuid)?.fixedVolume ?? false
	}

	public muted(device: SonosDevice): boolean | undefined {
		return this.pick(device.Uuid, 'rendering', device.Muted, this.polled.get(device.Uuid)?.muted)
	}

	/** The transport state of the group the device is in, eg PLAYING */
	public transportState(device: SonosDevice): string | undefined {
		const coordinator = device.Coordinator
		const state: string | undefined = coordinator.CurrentTransportState
		return this.pick(coordinator.Uuid, 'transport', state, this.polled.get(coordinator.Uuid)?.transportState)
	}

	public trackUri(device: SonosDevice): string | undefined {
		const coordinator = device.Coordinator
		return this.pick(
			coordinator.Uuid,
			'transport',
			coordinator.CurrentTrackUri,
			this.polled.get(coordinator.Uuid)?.trackUri,
		)
	}

	/** Shuffle and repeat state, from the play mode of the group the device is in */
	public playMode(device: SonosDevice): PlayModeState | undefined {
		const coordinator = device.Coordinator
		const mode = this.pick<string>(
			coordinator.Uuid,
			'transport',
			coordinator.CurrentPlayMode,
			this.polled.get(coordinator.Uuid)?.playMode,
		)
		if (!mode) return undefined

		const shuffle = mode.startsWith('SHUFFLE')
		let repeat: RepeatState = 'off'
		if (mode === 'REPEAT_ALL' || mode === 'SHUFFLE') repeat = 'all'
		if (mode === 'REPEAT_ONE' || mode === 'SHUFFLE_REPEAT_ONE') repeat = 'one'
		return { shuffle, repeat }
	}
}

/** All the speakers which are in the same group as the device (including the device itself) */
export function getGroupMembers(manager: SonosManager, device: SonosDevice): SonosDevice[] {
	const coordinatorUuid = device.Coordinator.Uuid
	return manager.Devices.filter((d) => d.Coordinator.Uuid === coordinatorUuid)
}

function isTrack(value: unknown): value is Track {
	return typeof value === 'object' && value !== null
}

/** Read the state of every speaker directly. Returns true when something changed since the last poll. */
export async function pollDevices(manager: SonosManager, state: DeviceStateStore): Promise<boolean> {
	let changed = false

	await Promise.all(
		manager.Devices.map(async (device) => {
			const transport = device.Coordinator.AVTransportService
			const rendering = device.RenderingControlService
			const isCoordinator = device.IsCoordinator

			const [info, settings, position, volume, mute, fixed] = await Promise.allSettled([
				isCoordinator ? transport.GetTransportInfo() : undefined,
				isCoordinator ? transport.GetTransportSettings() : undefined,
				isCoordinator ? transport.GetPositionInfo() : undefined,
				rendering.GetVolume({ InstanceID: 0, Channel: 'Master' }),
				rendering.GetMute({ InstanceID: 0, Channel: 'Master' }),
				rendering.GetOutputFixed(),
			])
			const value = <T>(r: PromiseSettledResult<T>): T | undefined => (r.status === 'fulfilled' ? r.value : undefined)

			const positionInfo = value(position)
			const next: PolledDeviceState = {
				volume: value(volume)?.CurrentVolume,
				muted: value(mute)?.CurrentMute,
				fixedVolume: value(fixed)?.CurrentFixed,
				transportState: value(info)?.CurrentTransportState,
				playMode: value(settings)?.PlayMode,
				trackUri: positionInfo?.TrackURI,
			}
			if (state.setPolled(device.Uuid, next)) changed = true

			if (isCoordinator && positionInfo) {
				const meta: unknown = positionInfo.TrackMetaData
				const before = JSON.stringify(state.track(device))
				state.setTrack(device.Uuid, isTrack(meta) ? meta : undefined)
				if (before !== JSON.stringify(state.track(device))) changed = true
			}
		}),
	)

	return changed
}
