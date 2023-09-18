import { CreateConvertToBooleanFeedbackUpgradeScript, type CompanionStaticUpgradeScript } from '@companion-module/base'
import type { DeviceConfig } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<DeviceConfig>[] = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		playing: true,
		paused: true,
		stopped: true,
		volume: true,
	}),
]
