import { SonosDevice, SonosManager } from '@svrooij/sonos'
import { TransportState } from '@svrooij/sonos/lib/models'
import InstanceSkel = require('../../../instance_skel')
import {
  CompanionFeedbackEvent,
  CompanionFeedbackResult,
  CompanionFeedbacks,
  CompanionInputFieldColor,
  CompanionInputFieldDropdown,
  InputValue
} from '../../../instance_skel_types'
import { DevicePicker, VolumePicker } from './choices'
import { DeviceConfig } from './config'
import { assertUnreachable } from './util'

export enum FeedbackId {
  Playing = 'playing',
  Paused = 'paused',
  Stopped = 'stopped',
  Volume = 'volume'
}

export enum VolumeComparitor {
  Equal = 'eq',
  LessThan = 'lt',
  GreaterThan = 'gt'
}

export function ForegroundPicker(color: number): CompanionInputFieldColor {
  return {
    type: 'colorpicker',
    label: 'Foreground color',
    id: 'fg',
    default: color
  }
}
export function BackgroundPicker(color: number): CompanionInputFieldColor {
  return {
    type: 'colorpicker',
    label: 'Background color',
    id: 'bg',
    default: color
  }
}
function VolumeComparitorPicker(): CompanionInputFieldDropdown {
  const options = [
    { id: VolumeComparitor.Equal, label: 'Equal' },
    { id: VolumeComparitor.GreaterThan, label: 'Greater than' },
    { id: VolumeComparitor.LessThan, label: 'Less than>' }
  ]
  return {
    type: 'dropdown',
    label: 'Comparitor',
    id: 'comparitor',
    default: VolumeComparitor.Equal,
    choices: options
  }
}

export function GetFeedbacksList(instance: InstanceSkel<DeviceConfig>, devices: SonosDevice[]) {
  const feedbacks: CompanionFeedbacks = {}

  feedbacks[FeedbackId.Playing] = {
    label: 'Change colors from device playing',
    description: 'If the device is playing, change colors of the bank',
    options: [ForegroundPicker(instance.rgb(0, 0, 0)), BackgroundPicker(instance.rgb(0, 255, 0)), DevicePicker(devices)]
  }
  feedbacks[FeedbackId.Paused] = {
    label: 'Change colors from device paused',
    description: 'If the device is paused, change colors of the bank',
    options: [
      ForegroundPicker(instance.rgb(0, 0, 0)),
      BackgroundPicker(instance.rgb(255, 255, 0)),
      DevicePicker(devices)
    ]
  }
  feedbacks[FeedbackId.Stopped] = {
    label: 'Change colors from device stopped',
    description: 'If the device is stopped, change colors of the bank',
    options: [
      ForegroundPicker(instance.rgb(255, 255, 255)),
      BackgroundPicker(instance.rgb(255, 0, 0)),
      DevicePicker(devices)
    ]
  }
  feedbacks[FeedbackId.Volume] = {
    label: 'Change colors from device volume',
    description: 'If the device is volume matches, change colors of the bank',
    options: [
      ForegroundPicker(instance.rgb(255, 255, 255)),
      BackgroundPicker(instance.rgb(255, 0, 0)),
      DevicePicker(devices),
      VolumeComparitorPicker(),
      VolumePicker()
    ]
  }

  return feedbacks
}

function compareVolume(target: InputValue | undefined, comparitor: InputValue | undefined, currentValue: number) {
  const targetVolume = Number(target)
  if (isNaN(targetVolume)) {
    return false
  }

  switch (comparitor) {
    case VolumeComparitor.GreaterThan:
      return currentValue > targetVolume
    case VolumeComparitor.LessThan:
      return currentValue < targetVolume
    default:
      return currentValue === targetVolume
  }
}

export function ExecuteFeedback(
  instance: InstanceSkel<DeviceConfig>,
  manager: SonosManager,
  feedback: CompanionFeedbackEvent
): CompanionFeedbackResult {
  const opt = feedback.options
  const getOptColors = () => ({ color: Number(opt.fg), bgcolor: Number(opt.bg) })

  const getDevice = () => manager.Devices.find(d => d.uuid === opt.device)

  const feedbackType = feedback.type as FeedbackId
  switch (feedbackType) {
    case FeedbackId.Playing: {
      const device = getDevice()
      if (
        device?.CurrentTransportState === TransportState.Playing ||
        device?.CurrentTransportState === TransportState.Transitioning
      ) {
        return getOptColors()
      }
      break
    }
    case FeedbackId.Paused: {
      const device = getDevice()
      if (device?.CurrentTransportState === TransportState.Paused) {
        return getOptColors()
      }
      break
    }
    case FeedbackId.Stopped: {
      const device = getDevice()
      if (device?.CurrentTransportState === TransportState.Stopped) {
        return getOptColors()
      }
      break
    }
    case FeedbackId.Volume: {
      const device = getDevice()
      if (device?.Volume !== undefined && compareVolume(opt.volume, opt.comparitor, device?.Volume)) {
        return getOptColors()
      }
      break
    }
    default:
      assertUnreachable(feedbackType)
      instance.debug('Unknown action: ' + feedback.type)
  }

  return {}
}
