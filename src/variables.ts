import { SonosManager } from '@svrooij/sonos'
import { DeviceConfig } from './config.js'
import { CompanionVariableDefinition, CompanionVariableValues, InstanceBase } from '@companion-module/base'

export function updateVariables(instance: InstanceBase<DeviceConfig>, manager: SonosManager): void {
	function numToString(val: number | undefined): string {
		if (val === undefined) {
			return '-'
		} else {
			return `${val}%`
		}
	}

	const newValues: CompanionVariableValues = {}

	manager.Devices.forEach((dev) => {
		newValues[`device.${dev.Uuid}.name`] = dev.Name
		newValues[`device.${dev.Uuid}.group`] = dev.GroupName || ''
		newValues[`device.${dev.Uuid}.volume`] = numToString(dev.Volume)
		newValues[`device.${dev.Uuid}.streamUri`] = dev.CurrentTrackUri
	})

	instance.setVariableValues(newValues)
}

export function InitVariables(instance: InstanceBase<DeviceConfig>, manager: SonosManager): void {
	const variables: CompanionVariableDefinition[] = []

	manager.Devices.forEach((dev) => {
		variables.push({
			name: `Device name (${dev.Name})`,
			variableId: `device.${dev.Uuid}.name`,
		})
		variables.push({
			name: `Device group (${dev.GroupName})`,
			variableId: `device.${dev.Uuid}.group`,
		})
		variables.push({
			name: `Device volume (${dev.GroupName})`,
			variableId: `device.${dev.Uuid}.volume`,
		})
		variables.push({
			name: `Device stream URI (${dev.GroupName})`,
			variableId: `device.${dev.Uuid}.streamUri`,
		})
	})

	updateVariables(instance, manager)

	instance.setVariableDefinitions(variables)
}
