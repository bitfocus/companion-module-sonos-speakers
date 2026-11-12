import type { SonosDevice } from '@svrooij/sonos'
import type { CompanionActionDefinitions } from '@companion-module/base'
import { ActionId } from './action-ids.js'
import {
	OnOffTogglePicker,
	clearQueue,
	failed,
	formatDuration,
	getDevice,
	getOptInt,
	getOptString,
	parseDuration,
	resolveOnOffToggle,
} from './action-utils.js'
import { DevicePicker } from './choices.js'
import type { SonosContext } from './sonos-context.js'
import type { ModuleTypes } from './types.js'

type RepeatValue = Parameters<SonosDevice['SetRepeat']>[0]
// The library's Repeat enum is not exported, so use its string values
const REPEAT_OFF = 'Off' as RepeatValue
const REPEAT_ALL = 'RepeatAll' as RepeatValue
const REPEAT_ONE = 'RepeatOne' as RepeatValue

export function GetPlaybackActions(ctx: SonosContext): CompanionActionDefinitions<ModuleTypes['actions']> {
	const devices = ctx.manager.Devices

	return {
		[ActionId.Stop]: {
			name: 'Stop',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				await device?.Stop().catch(failed('Stop'))
			},
		},
		[ActionId.Seek]: {
			name: 'Seek to time',
			description: 'Jump to a position in the current track',
			options: [
				DevicePicker(devices),
				{
					type: 'textinput',
					label: 'Time (h:mm:ss)',
					id: 'time',
					default: '0:00:00',
					regex: '/^\\d+:[0-5]\\d:[0-5]\\d$/',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				const time = getOptString(action, 'time')
				if (!/^\d+:[0-5]\d:[0-5]\d$/.test(time)) {
					throw new Error(`Sonos: Seek failed: invalid time '${time}', expected h:mm:ss`)
				}
				await device?.SeekPosition(time).catch(failed('Seek'))
			},
		},
		[ActionId.SeekRelative]: {
			name: 'Seek forward/back',
			description: 'Skip forward (positive) or back (negative) within the current track',
			options: [
				DevicePicker(devices),
				{
					type: 'number',
					label: 'Seconds (negative to go back)',
					id: 'seconds',
					default: 10,
					min: -3600,
					max: 3600,
				},
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const info = await device.Coordinator.AVTransportService.GetPositionInfo().catch(failed('Seek'))
				const target = parseDuration(info.RelTime) + getOptInt(action, 'seconds')
				const duration = parseDuration(info.TrackDuration)
				const clamped = duration > 0 ? Math.min(target, Math.max(0, duration - 1)) : target
				await device.SeekPosition(formatDuration(clamped)).catch(failed('Seek'))
			},
		},
		[ActionId.Repeat]: {
			name: 'Set repeat',
			options: [
				DevicePicker(devices),
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'cycle',
					choices: [
						{ id: 'cycle', label: 'Cycle (off, all, one)' },
						{ id: 'off', label: 'Off' },
						{ id: 'all', label: 'Repeat all' },
						{ id: 'one', label: 'Repeat one' },
					],
				},
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				let target: RepeatValue
				switch (action.options.mode) {
					case 'off':
						target = REPEAT_OFF
						break
					case 'all':
						target = REPEAT_ALL
						break
					case 'one':
						target = REPEAT_ONE
						break
					default: {
						const current = await device.GetRepeat().catch(failed('Repeat'))
						target = current === REPEAT_OFF ? REPEAT_ALL : current === REPEAT_ALL ? REPEAT_ONE : REPEAT_OFF
					}
				}
				await device.SetRepeat(target).catch(failed('Repeat'))
			},
		},
		[ActionId.Shuffle]: {
			name: 'Set shuffle',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const shuffle = await resolveOnOffToggle(action, async () => device.GetShuffle())
				await device.SetShuffle(shuffle).catch(failed('Shuffle'))
			},
		},
		[ActionId.Crossfade]: {
			name: 'Set crossfade',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const transport = device.Coordinator.AVTransportService
				const crossfade = await resolveOnOffToggle(
					action,
					async () => (await transport.GetCrossfadeMode()).CrossfadeMode,
				)
				await transport.SetCrossfadeMode({ InstanceID: 0, CrossfadeMode: crossfade }).catch(failed('Crossfade'))
			},
		},
		[ActionId.SwitchToQueue]: {
			name: 'Switch to queue',
			description: 'Switch to the queue without changing the position',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				await getDevice(ctx, action)?.Coordinator.SwitchToQueue().catch(failed('Switch to queue'))
			},
		},
		[ActionId.PlayQueueTrack]: {
			name: 'Play queue track',
			options: [
				DevicePicker(devices),
				{ type: 'number', label: 'Track number (1 is the first)', id: 'track', default: 1, min: 1, max: 100000 },
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const coordinator = device.Coordinator
				await coordinator.SwitchToQueue().catch(failed('Play queue track'))
				await coordinator.SeekTrack(getOptInt(action, 'track')).catch(failed('Play queue track'))
				await coordinator.Play().catch(failed('Play queue track'))
			},
		},
		[ActionId.ClearQueue]: {
			name: 'Clear queue',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				await clearQueue(device).catch(failed('Clear queue'))
			},
		},
		[ActionId.RemoveCurrentFromQueue]: {
			name: 'Remove current track from queue',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const transport = device.Coordinator.AVTransportService
				const info = await transport.GetPositionInfo().catch(failed('Remove from queue'))
				if (info.Track < 1) return
				await transport
					.RemoveTrackFromQueue({ InstanceID: 0, ObjectID: `Q:0/${info.Track}`, UpdateID: 0 })
					.catch(failed('Remove from queue'))
			},
		},
		[ActionId.LineIn]: {
			name: 'Switch to line-in',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				await getDevice(ctx, action)?.SwitchToLineIn().catch(failed('Switch to line-in'))
			},
		},
		[ActionId.SwitchToTv]: {
			name: 'Switch to TV input',
			description: 'For soundbars and the Amp',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				await getDevice(ctx, action)?.SwitchToTV().catch(failed('Switch to TV'))
			},
		},
	}
}
