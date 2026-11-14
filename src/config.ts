import { networkInterfaces } from 'node:os'
import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type DeviceConfig = {
	/** Speaker picked from the devices Companion discovered with Bonjour, as `host:port`. Empty means manual */
	bonjour_host?: string | null
	/** IP address entered manually */
	host?: string
	pollInterval?: number
	listenerHost?: string
}

export const DEFAULT_POLL_INTERVAL = 5

/** The default port of the Sonos control API */
const DEFAULT_SONOS_PORT = 1400

/**
 * Work out which speaker to connect to: the one picked from the discovered devices,
 * or else the manually entered IP address.
 *
 * The port Bonjour reports (1443) is the speaker's HTTPS port, while the control API
 * used by this module is plain HTTP on 1400, so the discovered port is ignored.
 */
export function ResolveSpeaker(config: DeviceConfig): { host: string; port: number } | undefined {
	const picked = config.bonjour_host?.trim()
	if (picked) {
		// Drop the port, splitting on the last colon so IPv6 addresses keep working
		const split = picked.lastIndexOf(':')
		const hasPort =
			split > 0 && /^\d+$/.test(picked.slice(split + 1)) && !(picked.match(/:/g)!.length > 1 && !picked.includes(']'))
		const host = hasPort ? picked.slice(0, split) : picked
		return { host: host.replace(/^\[|\]$/g, ''), port: DEFAULT_SONOS_PORT }
	}

	const manual = config.host?.trim()
	return manual ? { host: manual, port: DEFAULT_SONOS_PORT } : undefined
}

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
			type: 'bonjour-device',
			id: 'bonjour_host',
			label: 'Sonos speaker (any speaker in the system)',
			width: 6,
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Discovery IP (any sonos device in the system)',
			width: 6,
			regex: Regex.IP,
			isVisibleExpression: '!$(options:bonjour_host)',
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
