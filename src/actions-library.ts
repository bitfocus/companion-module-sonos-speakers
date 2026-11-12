import { MetaDataHelper, type SonosDevice } from '@svrooij/sonos'
import type { CompanionActionDefinitions, CompanionInputFieldDropdown } from '@companion-module/base'
import { ActionId } from './action-ids.js'
import { clearQueue, failed, formatDuration, getDevice, getOptInt, getOptString } from './action-utils.js'
import { DevicePicker } from './choices.js'
import type { LibTrack, SonosContext } from './sonos-context.js'
import type { ModuleTypes } from './types.js'

const STREAM_URI_PREFIXES = [
	'x-sonosapi-stream:',
	'x-sonosapi-radio:',
	'x-sonosapi-hls:',
	'x-sonosapi-hls-static:',
	'x-rincon-mp3radio:',
	'aac:',
	'hls-radio:',
	'pndrradio:',
	'x-rincon-stream:',
	'x-sonos-htastream:',
	'x-sonosapi-vli:',
]

function isStreamUri(uri: string): boolean {
	return STREAM_URI_PREFIXES.some((prefix) => uri.startsWith(prefix))
}

/**
 * Play a favourite (or radio station) like the Sonos app does:
 * streams are loaded directly, containers (albums, playlists etc) replace the queue and play from the start.
 */
async function playLibraryItem(device: SonosDevice, item: LibTrack, what: string): Promise<void> {
	const uri = item.TrackUri
	if (!uri) {
		throw new Error(`Sonos: ${what} failed: '${item.Title ?? 'item'}' has no playable URI`)
	}
	const metadata = item.ResMD || MetaDataHelper.TrackToMetaData(item)
	const coordinator = device.Coordinator
	const transport = coordinator.AVTransportService

	if (isStreamUri(uri)) {
		await transport
			.SetAVTransportURI({ InstanceID: 0, CurrentURI: uri, CurrentURIMetaData: metadata })
			.catch(failed(what))
	} else {
		await clearQueue(device).catch(failed(what))
		await transport
			.AddURIToQueue({
				InstanceID: 0,
				EnqueuedURI: uri,
				EnqueuedURIMetaData: metadata,
				DesiredFirstTrackNumberEnqueued: 0,
				EnqueueAsNext: false,
			})
			.catch(failed(what))
		await coordinator.SwitchToQueue().catch(failed(what))
		await coordinator.SeekTrack(1).catch(failed(what))
	}
	await coordinator.Play().catch(failed(what))
}

function findByName(items: LibTrack[], name: string): LibTrack | undefined {
	const wanted = name.trim().toLowerCase()
	if (!wanted) return undefined
	return (
		items.find((i) => i.Title?.toLowerCase() === wanted) ?? items.find((i) => i.Title?.toLowerCase().includes(wanted))
	)
}

function ItemPicker(label: string, id: string, items: LibTrack[]): CompanionInputFieldDropdown {
	const choices = items.filter((i) => i.Title).map((i) => ({ id: i.Title as string, label: i.Title as string }))
	return {
		type: 'dropdown',
		label,
		id,
		default: choices.length ? choices[0].id : '',
		choices,
		allowCustom: true,
		description: 'Pick from the list, or type a name (a partial name also matches). Variables can be used.',
	}
}

export function GetLibraryActions(ctx: SonosContext): CompanionActionDefinitions<ModuleTypes['actions']> {
	const devices = ctx.manager.Devices
	const roomName = (uuid: string): string => devices.find((d) => d.Uuid === uuid)?.Name ?? 'Unknown room'

	return {
		[ActionId.PlayFavourite]: {
			name: 'Play favourite',
			description: 'Play a Sonos favourite. Favourites are loaded when the module connects.',
			options: [DevicePicker(devices), ItemPicker('Favourite', 'favourite', ctx.favourites)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const name = getOptString(action, 'favourite')
				const item = findByName(ctx.favourites, name)
				if (!item) throw new Error(`Sonos: Play favourite failed: no favourite matching '${name}'`)
				await playLibraryItem(device, item, 'Play favourite')
			},
		},
		[ActionId.PlayRadioStation]: {
			name: 'Play radio station',
			description: "Play one of the TuneIn 'My Radio Stations'. Stations are loaded when the module connects.",
			options: [DevicePicker(devices), ItemPicker('Station', 'station', ctx.radioStations)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const name = getOptString(action, 'station')
				const item = findByName(ctx.radioStations, name)
				if (!item) throw new Error(`Sonos: Play radio station failed: no station matching '${name}'`)
				await playLibraryItem(device, item, 'Play radio station')
			},
		},
		[ActionId.RefreshLists]: {
			name: 'Refresh favourites, stations and alarms',
			description: 'Reload the lists from the speakers, for example after changing favourites in the Sonos app',
			options: [],
			callback: async () => {
				await ctx.refresh()
			},
		},
		[ActionId.SleepTimer]: {
			name: 'Sleep timer',
			options: [
				DevicePicker(devices),
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'set',
					choices: [
						{ id: 'set', label: 'Set' },
						{ id: 'cancel', label: 'Cancel' },
					],
				},
				{
					type: 'number',
					label: 'Minutes',
					id: 'minutes',
					default: 30,
					min: 1,
					max: 1439,
					isVisibleExpression: `$(options:mode) == 'set'`,
				},
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const duration = action.options.mode === 'cancel' ? '' : formatDuration(getOptInt(action, 'minutes') * 60)
				await device.Coordinator.AVTransportService.ConfigureSleepTimer({
					InstanceID: 0,
					NewSleepTimerDuration: duration,
				}).catch(failed('Sleep timer'))
			},
		},
		[ActionId.AlarmEnabled]: {
			name: 'Enable/disable alarm',
			description: 'Alarms are loaded when the module connects',
			options: [
				{
					type: 'dropdown',
					label: 'Alarm',
					id: 'alarm',
					default: ctx.alarms.length ? ctx.alarms[0].ID : 0,
					choices: ctx.alarms.map((a) => ({
						id: a.ID,
						label: `${a.StartLocalTime} ${a.Recurrence} - ${roomName(a.RoomUUID)} (#${a.ID})`,
					})),
					allowCustom: true,
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'enabled',
					default: 'enable',
					choices: [
						{ id: 'enable', label: 'Enable' },
						{ id: 'disable', label: 'Disable' },
					],
				},
			],
			callback: async (action) => {
				const device = devices[0]
				if (!device) return
				await device.AlarmClockService.PatchAlarm({
					ID: getOptInt(action, 'alarm'),
					Enabled: action.options.enabled === 'enable',
				}).catch(failed('Alarm'))
				await ctx.refresh()
			},
		},
		[ActionId.SnoozeAlarm]: {
			name: 'Snooze alarm',
			description: 'Snooze an alarm which is currently sounding',
			options: [
				DevicePicker(devices),
				{ type: 'number', label: 'Minutes', id: 'minutes', default: 9, min: 1, max: 120 },
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				await device.Coordinator.AVTransportService.SnoozeAlarm({
					InstanceID: 0,
					Duration: formatDuration(getOptInt(action, 'minutes') * 60),
				}).catch(failed('Snooze alarm'))
			},
		},
	}
}
