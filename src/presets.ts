// import InstanceSkel = require('../../../instance_skel')
// import { CompanionPreset } from '../../../instance_skel_types'
// import { ActionId } from './actions'
// import { DeviceConfig } from './config'
// import { FeedbackId, VolumeComparitor } from './feedback'

// interface CompanionPresetExt extends CompanionPreset {
//   feedbacks: Array<
//     {
//       type: FeedbackId
//     } & CompanionPreset['feedbacks'][0]
//   >
//   actions: Array<
//     {
//       action: ActionId
//     } & CompanionPreset['actions'][0]
//   >
// }

// function VolumeDelta(
//   instance: InstanceSkel<DeviceConfig>,
//   name: string,
//   actionId: ActionId,
//   volumeFeedback: FeedbackId,
//   delta: number
// ): CompanionPresetExt {
//   const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
//   return {
//     category: name,
//     label: `Volume ${deltaStr}%`,
//     bank: {
//       style: 'text',
//       text: `${name} ${deltaStr}%`,
//       size: 'auto',
//       color: instance.rgb(255, 255, 255),
//       bgcolor: instance.rgb(0, 0, 0)
//     },
//     feedbacks: [
//       {
//         type: volumeFeedback,
//         options: {
//           bg: instance.rgb(238, 238, 0),
//           fg: instance.rgb(0, 0, 0),
//           volume: delta > 0 ? 100 : 0,
//           comparitor: VolumeComparitor.Equal
//         }
//       }
//     ],
//     actions: [
//       {
//         action: actionId,
//         options: {
//           volume: delta
//         }
//       }
//     ]
//   }
// }

// export function GetPresetsList(instance: InstanceSkel<DeviceConfig>): CompanionPreset[] {
//   const presets: CompanionPresetExt[] = []

//   presets.push({
//     category: 'Mic',
//     label: 'Volume',
//     bank: {
//       style: 'text',
//       text: '$(win-audio-controller:mic_volume)',
//       size: '24',
//       color: instance.rgb(255, 255, 255),
//       bgcolor: instance.rgb(0, 0, 0)
//     },
//     feedbacks: [
//       {
//         type: FeedbackId.MicMuted,
//         options: {
//           bg: instance.rgb(255, 0, 0),
//           fg: instance.rgb(255, 255, 255),
//           muted: true
//         }
//       }
//     ],
//     actions: [
//       {
//         action: ActionId.MicMutedToggle,
//         options: {}
//       }
//     ]
//   })
//   presets.push({
//     category: 'Mic',
//     label: 'Volume 100%',
//     bank: {
//       style: 'text',
//       text: 'Mic 100%',
//       size: 'auto',
//       color: instance.rgb(255, 255, 255),
//       bgcolor: instance.rgb(0, 0, 0)
//     },
//     feedbacks: [],
//     actions: [
//       {
//         action: ActionId.MicVolume,
//         options: {
//           volume: 100
//         }
//       }
//     ]
//   })
//   presets.push(VolumeDelta(instance, 'Mic', ActionId.MicVolumeDelta, FeedbackId.MicVolume, +5))
//   presets.push(VolumeDelta(instance, 'Mic', ActionId.MicVolumeDelta, FeedbackId.MicVolume, +1))
//   presets.push(VolumeDelta(instance, 'Mic', ActionId.MicVolumeDelta, FeedbackId.MicVolume, -5))
//   presets.push(VolumeDelta(instance, 'Mic', ActionId.MicVolumeDelta, FeedbackId.MicVolume, -1))

//   presets.push({
//     category: 'Speaker',
//     label: 'Volume',
//     bank: {
//       style: 'text',
//       text: '$(win-audio-controller:speaker_volume)',
//       size: '24',
//       color: instance.rgb(255, 255, 255),
//       bgcolor: instance.rgb(0, 0, 0)
//     },
//     feedbacks: [
//       {
//         type: FeedbackId.SpeakerMuted,
//         options: {
//           bg: instance.rgb(255, 0, 0),
//           fg: instance.rgb(255, 255, 255),
//           muted: true
//         }
//       }
//     ],
//     actions: [
//       {
//         action: ActionId.SpeakerMutedToggle,
//         options: {}
//       }
//     ]
//   })
//   presets.push({
//     category: 'Speaker',
//     label: 'Volume 100%',
//     bank: {
//       style: 'text',
//       text: 'Speaker 100%',
//       size: 'auto',
//       color: instance.rgb(255, 255, 255),
//       bgcolor: instance.rgb(0, 0, 0)
//     },
//     feedbacks: [],
//     actions: [
//       {
//         action: ActionId.SpeakerVolume,
//         options: {
//           volume: 100
//         }
//       }
//     ]
//   })
//   presets.push(VolumeDelta(instance, 'Speaker', ActionId.SpeakerVolumeDelta, FeedbackId.SpeakerVolume, +5))
//   presets.push(VolumeDelta(instance, 'Speaker', ActionId.SpeakerVolumeDelta, FeedbackId.SpeakerVolume, +1))
//   presets.push(VolumeDelta(instance, 'Speaker', ActionId.SpeakerVolumeDelta, FeedbackId.SpeakerVolume, -5))
//   presets.push(VolumeDelta(instance, 'Speaker', ActionId.SpeakerVolumeDelta, FeedbackId.SpeakerVolume, -1))

//   return presets
// }
