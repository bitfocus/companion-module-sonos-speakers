import InstanceSkel = require('../../../instance_skel')
import { CompanionPreset } from '../../../instance_skel_types'
import { ActionId } from './actions'
import { DeviceConfig } from './config'
import { FeedbackId, VolumeComparitor } from './feedback'
import { SonosManager } from '@svrooij/sonos'

interface CompanionPresetExt extends CompanionPreset {
  feedbacks: Array<
    {
      type: FeedbackId
    } & CompanionPreset['feedbacks'][0]
  >
  actions: Array<
    {
      action: ActionId
    } & CompanionPreset['actions'][0]
  >
}

function VolumeDelta(
  instance: InstanceSkel<DeviceConfig>,
  name: string,
  actionId: ActionId,
  volumeFeedback: FeedbackId,
  delta: number
): CompanionPresetExt {
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
  return {
    category: 'Volume',
    label: `${name} Volume ${deltaStr}%`,
    bank: {
      style: 'text',
      text: `${name} ${deltaStr}%`,
      size: 'auto',
      color: instance.rgb(255, 255, 255),
      bgcolor: instance.rgb(0, 0, 0)
    },
    feedbacks: [
      {
        type: volumeFeedback,
        options: {
          bg: instance.rgb(238, 238, 0),
          fg: instance.rgb(0, 0, 0),
          volume: delta > 0 ? 100 : 0,
          comparitor: VolumeComparitor.Equal
        }
      }
    ],
    actions: [
      {
        action: actionId,
        options: {
          delta
        }
      }
    ]
  }
}

export function GetPresetsList(instance: InstanceSkel<DeviceConfig>, manager: SonosManager): CompanionPreset[] {
  const presets: CompanionPresetExt[] = []

  manager.Devices.forEach(device => {
    presets.push({
      category: 'Volume',
      label: `${device.Name} Volume 100%`,
      bank: {
        style: 'text',
        text: `${device.Name} 100%`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0)
      },
      feedbacks: [],
      actions: [
        {
          action: ActionId.Volume,
          options: {
            volume: 100
          }
        }
      ]
    })
    presets.push(VolumeDelta(instance, device.Name, ActionId.VolumeDelta, FeedbackId.Volume, +5))
    presets.push(VolumeDelta(instance, device.Name, ActionId.VolumeDelta, FeedbackId.Volume, +1))
    presets.push(VolumeDelta(instance, device.Name, ActionId.VolumeDelta, FeedbackId.Volume, -5))
    presets.push(VolumeDelta(instance, device.Name, ActionId.VolumeDelta, FeedbackId.Volume, -1))
  })

  return presets
}
