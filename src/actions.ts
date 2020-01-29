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
  PlayPause = 'play_pause',
  NextTrack = 'next_track',
  PreviousTrack = 'previous_track'
}

export function GetActionsList(devices: SonosDevice[]) {
  const actions: CompanionActions = {}

  actions[ActionId.PlayPause] = {
    label: 'Play/pause',
    options: [
      DevicePicker(devices),
      {
        type: 'dropdown',
        label: 'Mode',
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
  actions[ActionId.NextTrack] = {
    label: 'Next Track',
    options: [DevicePicker(devices)]
  }
  actions[ActionId.PreviousTrack] = {
    label: 'Previous Track',
    options: [DevicePicker(devices)]
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
      case ActionId.PlayPause: {
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
      }
      case ActionId.NextTrack: {
        const device = getDevice()
        if (device) {
          device.Next().catch(e => instance.log(`Sonos: NextTrack failed: ${e}`))
        }
        break
      }
      case ActionId.PreviousTrack: {
        const device = getDevice()
        if (device) {
          device.Previous().catch(e => instance.log(`Sonos: PreviousTrack failed: ${e}`))
        }
        break
      }
      default:
        assertUnreachable(actionId)
        instance.debug('Unknown action: ' + action.action)
    }
  } catch (e) {
    instance.debug('Action failed: ' + e)
  }
}
