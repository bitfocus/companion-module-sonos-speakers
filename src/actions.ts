import { SonosDevice, SonosManager } from '@svrooij/sonos'
import InstanceSkel = require('../../../instance_skel')
import { CompanionActionEvent, CompanionActions } from '../../../instance_skel_types'
import { DevicePicker } from './choices'
import { DeviceConfig } from './config'
import { assertUnreachable } from './util'

export enum PlayPauseToggle {
  Play = 'play',
  Pause = 'pause',
  Toggle = 'toggle'
}

export enum ActionId {
  PlayPause = 'play_pause'
  // MicVolume = 'mic_volume',
  // MicVolumeDelta = 'mic_volume_delta',
  // MicMuted = 'mic_muted',
  // MicMutedToggle = 'mic_muted_toggle',
  // SpeakerVolume = 'speaker_volume',
  // SpeakerVolumeDelta = 'speaker_volume_delta',
  // SpeakerMuted = 'speaker_muted',
  // SpeakerMutedToggle = 'speaker_muted_toggle'
}

// export function VolumeDeltaPicker(): CompanionInputFieldNumber {
//   return {
//     type: 'number',
//     label: 'Delta',
//     id: 'delta',
//     default: 1,
//     max: 100,
//     min: -100
//   }
// }

export function GetActionsList(devices: SonosDevice[]) {
  const actions: CompanionActions = {}

  actions[ActionId.PlayPause] = {
    label: 'Play/pause',
    options: [
      DevicePicker(devices),
      {
        type: 'dropdown',
        label: 'Device',
        id: 'mode',
        default: PlayPauseToggle.Toggle,
        choices: [
          { id: PlayPauseToggle.Toggle, label: 'Toggle' },
          { id: PlayPauseToggle.Play, label: 'Play' },
          { id: PlayPauseToggle.Pause, label: 'Pause' }
        ]
      }
    ]
  }

  return actions
}

export function HandleAction(
  instance: InstanceSkel<DeviceConfig>,
  manager: SonosManager,
  action: CompanionActionEvent
) {
  const opt = action.options
  // const getOptInt = (key: string) => {
  //   const val = Number(opt[key])
  //   if (isNaN(val)) {
  //     throw new Error(`Invalid option '${key}'`)
  //   }
  //   return val
  // }
  // const getOptBool = (key: string) => {
  //   return !!opt[key]
  // }

  const getDevice = () => manager.Devices.find(d => d.uuid === opt.device)

  try {
    const actionId = action.action as ActionId
    switch (actionId) {
      case ActionId.PlayPause:
        const device = getDevice()
        if (device) {
          switch (opt.mode) {
            case PlayPauseToggle.Play:
              device.Play().catch(e => instance.log(`Sonos: Play failed: ${e}`))
              break
            case PlayPauseToggle.Pause:
              device.Pause().catch(e => instance.log(`Sonos: Pause failed: ${e}`))
              break
            default:
              device.TogglePlayback().catch(e => instance.log(`Sonos: Play/Pause toggle failed: ${e}`))
              break
          }
        }
        break
      default:
        assertUnreachable(actionId)
        instance.debug('Unknown action: ' + action.action)
    }
  } catch (e) {
    instance.debug('Action failed: ' + e)
  }
}
