import type { InstanceTypes } from '@companion-module/base'
import type { DeviceConfig } from './config.js'

export interface ModuleTypes extends InstanceTypes {
	config: DeviceConfig
	secrets: undefined
}
