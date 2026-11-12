import type { SonosDevice } from '@svrooij/sonos'
import type { CompanionActionDefinitions, CompanionInputFieldNumber } from '@companion-module/base'
import { ActionId } from './action-ids.js'
import { OnOffTogglePicker, failed, getDevice, getOptInt, resolveOnOffToggle } from './action-utils.js'
import { DevicePicker } from './choices.js'
import type { SonosContext } from './sonos-context.js'
import type { ModuleTypes } from './types.js'

type ActionDef = NonNullable<CompanionActionDefinitions<ModuleTypes['actions']>[string]>

async function setEq(device: SonosDevice, eqType: string, value: number): Promise<boolean> {
	return device.RenderingControlService.SetEQ({ InstanceID: 0, EQType: eqType, DesiredValue: value })
}

async function getEq(device: SonosDevice, eqType: string): Promise<number> {
	return (await device.RenderingControlService.GetEQ({ InstanceID: 0, EQType: eqType })).CurrentValue
}

function LevelPicker(label: string, min: number, max: number, id = 'level'): CompanionInputFieldNumber {
	return { type: 'number', label, id, default: 0, min, max, asInteger: true }
}

export function GetEqActions(ctx: SonosContext): CompanionActionDefinitions<ModuleTypes['actions']> {
	const devices = ctx.manager.Devices

	/** An on/off/toggle action which is backed by a Sonos EQ setting (1 = on, 0 = off) */
	const eqSwitch = (name: string, eqType: string, description?: string): ActionDef => ({
		name,
		description,
		options: [DevicePicker(devices), OnOffTogglePicker()],
		callback: async (action) => {
			const device = getDevice(ctx, action)
			if (!device) return
			const on = await resolveOnOffToggle(action, async () => (await getEq(device, eqType)) === 1)
			await setEq(device, eqType, on ? 1 : 0).catch(failed(name))
		},
	})

	/** A level action which is backed by a Sonos EQ setting */
	const eqLevel = (name: string, eqType: string, min: number, max: number, description?: string): ActionDef => ({
		name,
		description,
		options: [DevicePicker(devices), LevelPicker('Level', min, max)],
		callback: async (action) => {
			const device = getDevice(ctx, action)
			if (!device) return
			await setEq(device, eqType, getOptInt(action, 'level')).catch(failed(name))
		},
	})

	return {
		[ActionId.Bass]: {
			name: 'Set bass',
			options: [DevicePicker(devices), LevelPicker('Bass', -10, 10)],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.RenderingControlService.SetBass({ InstanceID: 0, DesiredBass: getOptInt(action, 'level') })
					.catch(failed('Set bass'))
			},
		},
		[ActionId.Treble]: {
			name: 'Set treble',
			options: [DevicePicker(devices), LevelPicker('Treble', -10, 10)],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.RenderingControlService.SetTreble({ InstanceID: 0, DesiredTreble: getOptInt(action, 'level') })
					.catch(failed('Set treble'))
			},
		},
		[ActionId.Loudness]: {
			name: 'Set loudness',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const service = device.RenderingControlService
				const on = await resolveOnOffToggle(
					action,
					async () => (await service.GetLoudness({ InstanceID: 0, Channel: 'Master' })).CurrentLoudness,
				)
				await service
					.SetLoudness({ InstanceID: 0, Channel: 'Master', DesiredLoudness: on })
					.catch(failed('Set loudness'))
			},
		},
		[ActionId.Balance]: {
			name: 'Set balance',
			description: 'Left/right balance from -100 (full left) to 100 (full right). Not available on every speaker.',
			options: [DevicePicker(devices), LevelPicker('Balance', -100, 100)],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const balance = getOptInt(action, 'level')
				const service = device.RenderingControlService
				// Balance is done by lowering the volume of the channel on the opposite side
				const left = balance > 0 ? 100 - balance : 100
				const right = balance < 0 ? 100 + balance : 100
				await Promise.all([
					service.SetVolume({ InstanceID: 0, Channel: 'LF', DesiredVolume: left }),
					service.SetVolume({ InstanceID: 0, Channel: 'RF', DesiredVolume: right }),
				]).catch(failed('Set balance'))
			},
		},
		[ActionId.NightMode]: {
			name: 'Set night mode',
			description: 'For soundbars',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const on = await resolveOnOffToggle(action, async () => device.GetNightMode())
				await device.SetNightMode(on).catch(failed('Set night mode'))
			},
		},
		[ActionId.SpeechEnhancement]: {
			name: 'Set speech enhancement (dialog mode)',
			description: 'For soundbars',
			options: [DevicePicker(devices), OnOffTogglePicker()],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				const on = await resolveOnOffToggle(action, async () => device.GetSpeechEnhancement())
				await device.SetSpeechEnhancement(on).catch(failed('Set speech enhancement'))
			},
		},
		[ActionId.SubEnabled]: eqSwitch('Set subwoofer enabled', 'SubEnable', 'For speakers with a Sonos Sub'),
		[ActionId.SubGain]: eqLevel('Set subwoofer gain', 'SubGain', -15, 15, 'For speakers with a Sonos Sub'),
		[ActionId.SurroundEnabled]: eqSwitch(
			'Set surround speakers enabled',
			'SurroundEnable',
			'For soundbars with surrounds',
		),
		[ActionId.SurroundVolumeTv]: eqLevel(
			'Set surround level for TV',
			'SurroundLevel',
			-15,
			15,
			'For soundbars with surrounds',
		),
		[ActionId.SurroundVolumeMusic]: eqLevel(
			'Set surround level for music',
			'MusicSurroundLevel',
			-15,
			15,
			'For soundbars with surrounds',
		),
		[ActionId.SurroundFullVolume]: {
			name: 'Set surround music mode',
			description: 'Choose full volume or ambient surround for music. For soundbars with surrounds',
			options: [
				DevicePicker(devices),
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'full',
					choices: [
						{ id: 'full', label: 'Full' },
						{ id: 'ambient', label: 'Ambient' },
					],
				},
			],
			callback: async (action) => {
				const device = getDevice(ctx, action)
				if (!device) return
				await setEq(device, 'SurroundMode', action.options.mode === 'full' ? 1 : 0).catch(
					failed('Set surround music mode'),
				)
			},
		},
		[ActionId.RampVolume]: {
			name: 'Ramp volume',
			description: 'Gradually change the volume to a target, using the Sonos sleep timer ramp',
			options: [
				DevicePicker(devices),
				{ type: 'number', label: 'Target volume', id: 'volume', default: 0, min: 0, max: 100, asInteger: true },
			],
			callback: async (action) => {
				await getDevice(ctx, action)
					?.RenderingControlService.RampToVolume({
						InstanceID: 0,
						Channel: 'Master',
						RampType: 'SLEEP_TIMER_RAMP_TYPE',
						DesiredVolume: getOptInt(action, 'volume'),
						ResetVolumeAfter: false,
						ProgramURI: '',
					})
					.catch(failed('Ramp volume'))
			},
		},
	}
}
