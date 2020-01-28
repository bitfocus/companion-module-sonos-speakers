import { SonosDevice } from '@svrooij/sonos'
import { CompanionInputFieldDropdown } from '../../../instance_skel_types'

export function DevicePicker(devices: SonosDevice[]): CompanionInputFieldDropdown {
  const choices = devices.map(d => ({
    id: d.Uuid,
    label: d.Name
  }))

  return {
    type: 'dropdown',
    label: 'Device',
    id: 'device',
    default: choices.length ? choices[0].id : '',
    choices
  }
}
