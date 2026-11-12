import { networkInterfaces } from 'node:os'
import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type DeviceConfig = {
	host?: string
	pollInterval?: number
	listenerHost?: string
}

export const DEFAULT_POLL_INTERVAL = 5

/** Value of the event listener dropdown which means: work out the address automatically */
export const LISTENER_AUTO = 'auto'

/** The IPv4 addresses of the network interfaces of this computer */
export function GetListenerChoices(): { id: string; label: string }[] {
	const choices = [{ id: LISTENER_AUTO, label: 'Automatic' }]
	for (const [name, addresses] of Object.entries(networkInterfaces())) {
		for (const address of addresses ?? []) {
			if (address.family === 'IPv4' && !address.internal) {
				choices.push({ id: address.address, label: `${address.address} (${name})` })
			}
		}
	}
	return choices
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Discovery IP (any sonos device in the system)',
			width: 6,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Status refresh interval (seconds, 0 to disable)',
			description:
				'How often to read the status of the speakers directly. Speakers also push changes to Companion, but those can be blocked by firewalls, so this keeps variables and feedbacks accurate.',
			width: 6,
			default: DEFAULT_POLL_INTERVAL,
			min: 0,
			max: 3600,
			asInteger: true,
		},
		{
			type: 'dropdown',
			id: 'listenerHost',
			label: 'Network interface for speaker updates',
			description:
				"The network connection of this computer that the speakers send their updates to. Leave on Automatic unless this computer has several network connections (VPN, virtual adapters) and updates don't arrive.",
			width: 6,
			default: LISTENER_AUTO,
			choices: GetListenerChoices(),
		},
	]
}
