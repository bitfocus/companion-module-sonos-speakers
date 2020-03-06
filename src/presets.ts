import { SonosDevice, SonosManager } from '@svrooij/sonos'
import InstanceSkel = require('../../../instance_skel')
import { CompanionPreset } from '../../../instance_skel_types'
import { ActionId, PlayPauseToggle } from './actions'
import { DeviceConfig } from './config'
import { FeedbackId, VolumeComparitor } from './feedback'

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
  device: SonosDevice,
  actionId: ActionId,
  volumeFeedback: FeedbackId,
  delta: number
): CompanionPresetExt {
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
  return {
    category: 'Volume',
    label: `${device.Name} Volume ${deltaStr}%`,
    bank: {
      style: 'text',
      text: `${device.Name} ${deltaStr}%`,
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
          device: device.uuid,
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
            device: device.uuid,
            volume: 100
          }
        }
      ]
    })
    presets.push(VolumeDelta(instance, device, ActionId.VolumeDelta, FeedbackId.Volume, +5))
    presets.push(VolumeDelta(instance, device, ActionId.VolumeDelta, FeedbackId.Volume, +1))
    presets.push(VolumeDelta(instance, device, ActionId.VolumeDelta, FeedbackId.Volume, -5))
    presets.push(VolumeDelta(instance, device, ActionId.VolumeDelta, FeedbackId.Volume, -1))

    presets.push({
      category: 'Playback',
      label: `${device.Name} Play/Pause`,
      bank: {
        style: 'text',
        text: `${device.Name} P/P`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0)
      },
      feedbacks: [
        {
          type: FeedbackId.Playing,
          options: {
            bg: instance.rgb(0, 255, 0),
            fg: instance.rgb(0, 0, 0),
            device: device.uuid
          }
        },
        {
          type: FeedbackId.Paused,
          options: {
            bg: instance.rgb(255, 255, 0),
            fg: instance.rgb(0, 0, 0),
            device: device.uuid
          }
        },
        {
          type: FeedbackId.Stopped,
          options: {
            bg: instance.rgb(255, 0, 0),
            fg: instance.rgb(255, 255, 255),
            device: device.uuid
          }
        }
      ],
      actions: [
        {
          action: ActionId.PlayPause,
          options: {
            device: device.uuid,
            mode: PlayPauseToggle.Toggle
          }
        }
      ]
    })
  })

  return presets
}
