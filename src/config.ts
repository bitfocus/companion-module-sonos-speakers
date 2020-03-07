import InstanceSkel = require('../../../instance_skel')
import { SomeCompanionConfigField } from '../../../instance_skel_types'

export interface DeviceConfig {
  host?: string
  port?: string
}

export function GetConfigFields(self: InstanceSkel<DeviceConfig>): SomeCompanionConfigField[] {
  return [
    {
      type: 'textinput',
      id: 'host',
      label: 'Discovery IP (any sonos device in the system)',
      width: 6,
      regex: self.REGEX_IP
    }
  ]
}
