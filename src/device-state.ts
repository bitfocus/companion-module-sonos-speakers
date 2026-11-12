import type { SonosDevice, SonosManager } from '@svrooij/sonos'

export type RepeatState = 'off' | 'all' | 'one'

export interface PlayModeState {
	shuffle: boolean
	repeat: RepeatState
}

/** Work out the shuffle and repeat state from the Sonos play mode of a device */
export function getPlayModeState(device: SonosDevice): PlayModeState | undefined {
	const mode: string | undefined = device.CurrentPlayMode
	if (!mode) return undefined

	const shuffle = mode.startsWith('SHUFFLE')
	let repeat: RepeatState = 'off'
	if (mode === 'REPEAT_ALL' || mode === 'SHUFFLE') repeat = 'all'
	if (mode === 'REPEAT_ONE' || mode === 'SHUFFLE_REPEAT_ONE') repeat = 'one'
	return { shuffle, repeat }
}

/** All the speakers which are in the same group as the device (including the device itself) */
export function getGroupMembers(manager: SonosManager, device: SonosDevice): SonosDevice[] {
	const coordinatorUuid = device.Coordinator.Uuid
	return manager.Devices.filter((d) => d.Coordinator.Uuid === coordinatorUuid)
}
