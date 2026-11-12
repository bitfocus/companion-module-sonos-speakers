import type { SonosDevice } from '@svrooij/sonos'
import type { CompanionActionDefinitions } from '@companion-module/base'
import { ActionId } from './action-ids.js'
import { OnOffTogglePicker, failed, getDevice, getOptInt, resolveOnOffToggle } from './action-utils.js'
import { DevicePicker, VolumePicker } from './choices.js'
import type { SonosContext } from './sonos-context.js'
import type { ModuleTypes } from './types.js'

/** Make `device` join the group which `target` is in */
async function joinGroupOf(device: SonosDevice, target: SonosDevice): Promise<void> {
	const coordinatorUuid = target.Coordinator.Uuid
	if (device.Uuid === coordinatorUuid) return
	await device.AVTransportService.SetAVTransportURI({
		InstanceID: 0,
		CurrentURI: `x-rincon:${coordinatorUuid}`,
		CurrentURIMetaData: '',
	})
}

export function GetGroupActions(ctx: SonosContext): CompanionActionDefinitions<ModuleTypes['actions']> {
	const devices = ctx.manager.Devices

	return {
		[ActionId.JoinGroup]: {
			name: 'Join group',
			description:
				"Add a speaker to the group which another speaker is in. Playback follows the other speaker's group.",
			options: [
				DevicePicker(devices, 'device', 'Speaker to add'),
				DevicePicker(devices, 'target', 'Join the group of'),
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				const target = getDevice(ctx, action, 'target')
				if (!device || !target) return
				await joinGroupOf(device, target).catch(failed('Join group'))
			},
		},
		[ActionId.Ungroup]: {
			name: 'Leave group',
			description: 'Remove a speaker from its group, so it plays on its own',
			options: [DevicePicker(devices)],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.AVTransportService.BecomeCoordinatorOfStandaloneGroup()
					.catch(failed('Leave group'))
			},
		},
		[ActionId.PartyMode]: {
			name: 'Party mode',
			description: 'Group all speakers together, playing what the chosen speaker is playing',
			options: [DevicePicker(devices, 'device', 'Speaker to play from')],
			callback: async (action) => {
				const target = getDevice(ctx, action)
				if (!target) return
				const others = devices.filter((d) => d.Uuid !== target.Uuid)
				const results = await Promise.allSettled(others.map(async (d) => joinGroupOf(d, target)))
				const failedRooms = others.filter((_, i) => results[i].status === 'rejected').map((d) => d.Name)
				if (failedRooms.length > 0) {
					const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason
					failed(`Party mode (could not add ${failedRooms.join(', ')})`)(firstError)
				}
			},
		},
		[ActionId.TransferPlayback]: {
			name: 'Transfer playback',
			description: 'Move what is playing on one speaker to another speaker',
			options: [DevicePicker(devices, 'device', 'From'), DevicePicker(devices, 'target', 'To')],
			callback: async (action) => {
				const from = getDevice(ctx, action)
				const to = getDevice(ctx, action, 'target')
				if (!from || !to || from.Uuid === to.Uuid) return
				await (async () => {
					await joinGroupOf(to, from)
					await from.Coordinator.AVTransportService.DelegateGroupCoordinationTo({
						InstanceID: 0,
						NewCoordinator: to.Uuid,
						RejoinGroup: false,
					})
				})().catch(failed('Transfer playback'))
			},
		},
		[ActionId.GroupVolume]: {
			name: 'Set group volume',
			description: 'Set the volume of the whole group the speaker is in. Individual volumes are scaled proportionally.',
			options: [DevicePicker(devices), VolumePicker()],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.Coordinator.GroupRenderingControlService.SetGroupVolume({
						InstanceID: 0,
						DesiredVolume: getOptInt(action, 'volume'),
					})
					.catch(failed('Set group volume'))
			},
		},
		[ActionId.GroupVolumeDelta]: {
			name: 'Adjust group volume',
			options: [
				DevicePicker(devices),
				{ type: 'number', label: 'Delta', id: 'delta', default: 1, min: -100, max: 100 },
			],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.SetRelativeGroupVolume(getOptInt(action, 'delta'))
					.catch(failed('Adjust group volume'))
			},
		},
		[ActionId.GroupMute]: {
			name: 'Set group muted',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const service = device.Coordinator.GroupRenderingControlService
				const muted = await resolveOnOffToggle(action, async () => (await service.GetGroupMute()).CurrentMute)
				await service.SetGroupMute({ InstanceID: 0, DesiredMute: muted }).catch(failed('Set group muted'))
			},
		},
	}
}
