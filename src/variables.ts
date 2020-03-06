import { SonosManager } from '@svrooij/sonos'
import InstanceSkel = require('../../../instance_skel')
import { CompanionVariable } from '../../../instance_skel_types'
import { DeviceConfig } from './config'

export function updateVariables(instance: InstanceSkel<DeviceConfig>, manager: SonosManager) {
  function numToString(val: number | undefined) {
    if (val === undefined) {
      return '-'
    } else {
      return `${val}%`
    }
  }

  manager.Devices.forEach(dev => {
    instance.setVariable(`device.${dev.uuid}.name`, dev.Name)
    instance.setVariable(`device.${dev.uuid}.group`, dev.GroupName || '')
    instance.setVariable(`device.${dev.uuid}.volume`, numToString(dev.Volume))
  })
}

export function InitVariables(instance: InstanceSkel<DeviceConfig>, manager: SonosManager) {
  const variables: CompanionVariable[] = []

  manager.Devices.forEach(dev => {
    variables.push({
      label: `Device name (${dev.Name})`,
      name: `device.${dev.uuid}.name`
    })
    variables.push({
      label: `Device group (${dev.GroupName})`,
      name: `device.${dev.uuid}.group`
    })
    variables.push({
      label: `Device volume (${dev.GroupName})`,
      name: `device.${dev.uuid}.volume`
    })
  })

  updateVariables(instance, manager)

  instance.setVariableDefinitions(variables)
}
