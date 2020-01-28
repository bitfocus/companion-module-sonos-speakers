import { SonosDevice, SonosManager } from '@svrooij/sonos'
import { TransportState } from '@svrooij/sonos/lib/models'
import InstanceSkel = require('../../../instance_skel')
import {
  CompanionFeedbackEvent,
  CompanionFeedbackResult,
  CompanionFeedbacks,
  CompanionInputFieldColor
} from '../../../instance_skel_types'
import { DevicePicker } from './choices'
import { DeviceConfig } from './config'
import { assertUnreachable } from './util'

export enum FeedbackId {
  Playing = 'playing',
  Paused = 'paused',
  Stopped = 'stopped'
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

  return feedbacks
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
    default:
      assertUnreachable(feedbackType)
      instance.debug('Unknown action: ' + feedback.type)
  }

  return {}
}
