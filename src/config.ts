import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type DeviceConfig = {
	host?: string
	pollInterval?: number
	listenerHost?: string
}

export const DEFAULT_POLL_INTERVAL = 5

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
			type: 'textinput',
			id: 'listenerHost',
			label: 'Event listener IP (optional)',
			description:
				"The IP address of this computer that the speakers should send their updates to. Leave empty to detect it automatically, and set it if this computer has several network connections (VPN, virtual adapters) and updates don't arrive.",
			width: 6,
			regex: '/^$|^(\\d{1,3}\\.){3}\\d{1,3}$/',
		},
	]
}
