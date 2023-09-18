import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface DeviceConfig {
	host?: string
	port?: string
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
	]
}
