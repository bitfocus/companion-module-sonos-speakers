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
		newValues[`device.${dev.uuid}.name`] = dev.Name
		newValues[`device.${dev.uuid}.group`] = dev.GroupName || ''
		newValues[`device.${dev.uuid}.volume`] = numToString(dev.Volume)
	})

	instance.setVariableValues(newValues)
}

export function InitVariables(instance: InstanceBase<DeviceConfig>, manager: SonosManager): void {
	const variables: CompanionVariableDefinition[] = []

	manager.Devices.forEach((dev) => {
		variables.push({
			name: `Device name (${dev.Name})`,
			variableId: `device.${dev.uuid}.name`,
		})
		variables.push({
			name: `Device group (${dev.GroupName})`,
			variableId: `device.${dev.uuid}.group`,
		})
		variables.push({
			name: `Device volume (${dev.GroupName})`,
			variableId: `device.${dev.uuid}.volume`,
		})
	})

	updateVariables(instance, manager)

	instance.setVariableDefinitions(variables)
}
