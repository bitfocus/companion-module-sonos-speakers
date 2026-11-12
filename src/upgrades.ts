import { CreateConvertToBooleanFeedbackUpgradeScript, type CompanionStaticUpgradeScript } from '@companion-module/base'
import { DEFAULT_POLL_INTERVAL, LISTENER_AUTO, type DeviceConfig } from './config.js'

const AddDefaultSettings: CompanionStaticUpgradeScript<DeviceConfig> = (_context, props) => ({
	updatedConfig: props.config && {
		...props.config,
		pollInterval: props.config.pollInterval ?? DEFAULT_POLL_INTERVAL,
		listenerHost: props.config.listenerHost ?? LISTENER_AUTO,
	},
	updatedActions: [],
	updatedFeedbacks: [],
})

export const UpgradeScripts: CompanionStaticUpgradeScript<DeviceConfig>[] = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		playing: true,
		paused: true,
		stopped: true,
		volume: true,
	}),
	// Fill in the settings added in v2.0.0 for existing connections.
	// Without values the settings form is invalid, which stops it from being saved.
	AddDefaultSettings,
]
