import { SonosDevice, SonosEvents, SonosManager } from '@svrooij/sonos'
import InstanceSkel = require('../../../instance_skel')
import {
  CompanionActionEvent,
  CompanionConfigField,
  CompanionFeedbackEvent,
  CompanionFeedbackResult,
  CompanionSystem
} from '../../../instance_skel_types'
import { GetActionsList, HandleAction } from './actions'
import { DeviceConfig, GetConfigFields } from './config'
import { ExecuteFeedback, FeedbackId, GetFeedbacksList } from './feedback'
import { GetPresetsList } from './presets'
import { InitVariables, updateVariables } from './variables'

class ControllerInstance extends InstanceSkel<DeviceConfig> {
  private initDone: boolean
  private manager: SonosManager

  constructor(system: CompanionSystem, id: string, config: DeviceConfig) {
    super(system, id, config)

    this.manager = new SonosManager()
    this.initDone = false
  }

  // Override base types to make types stricter
  public checkFeedbacks(feedbackId?: FeedbackId, ignoreInitDone?: boolean) {
    if (ignoreInitDone || this.initDone) {
      super.checkFeedbacks(feedbackId)
    }
  }

  /**
   * Main initialization function called once the module
   * is OK to start doing things.
   */
  public init() {
    this.status(this.STATUS_UNKNOWN)
    this.updateConfig(this.config)
  }

  /**
   * Process an updated configuration array.
   */
  public updateConfig(config: DeviceConfig) {
    this.config = config

    try {
      this.manager.CancelSubscription()
    } catch (e) {
      // Ignore
    }

    this.initDone = false
    this.manager
      .InitializeFromDevice(config.host || '')
      .then(() => {
        this.status(this.STATUS_OK)
        this.initDone = true

        // subscribe to events
        this.manager.Devices.forEach(d => this.subscribeEvents(d))

        InitVariables(this, this.manager)
        this.setPresetDefinitions(GetPresetsList(this, this.manager))
        this.setActions(GetActionsList(this.manager.Devices))
        this.setFeedbackDefinitions(GetFeedbacksList(this, this.manager.Devices))

        this.checkFeedbacks()
      })
      .catch(e => {
        this.manager.CancelSubscription()

        this.status(this.STATUS_ERROR, `Load manager failed: ${e}`)
      })
  }

  public upgradeConfig() {
    // Nothing to do
  }

  /**
   * Executes the provided action.
   */
  public action(action: CompanionActionEvent) {
    HandleAction(this, this.manager, action)
  }

  /**
   * Creates the configuration fields for web config.
   */
  public config_fields(): CompanionConfigField[] {
    return GetConfigFields(this)
  }

  /**
   * Clean up the instance before it is destroyed.
   */
  public destroy() {
    try {
      // if (this.manager) {
      this.manager.CancelSubscription()
      // }
    } catch (e) {
      // Ignore
    }

    this.debug('destroy', this.id)
  }

  /**
   * Processes a feedback state.
   */
  public feedback(feedback: CompanionFeedbackEvent): CompanionFeedbackResult {
    return ExecuteFeedback(this, this.manager, feedback)
  }

  private subscribeEvents(device: SonosDevice) {
    device.Events.on(SonosEvents.CurrentTransportState, () => {
      this.checkFeedbacks(FeedbackId.Playing)
      this.checkFeedbacks(FeedbackId.Paused)
      this.checkFeedbacks(FeedbackId.Stopped)
    })
    device.Events.on(SonosEvents.GroupName, () => {
      // this.checkFeedbacks(FeedbackId.GroupName) // TODO
      this.setPresetDefinitions(GetPresetsList(this, this.manager))
      updateVariables(this, this.manager)
    })
    device.Events.on(SonosEvents.Volume, () => {
      this.checkFeedbacks(FeedbackId.Volume)
      updateVariables(this, this.manager)
    })
  }
}

export = ControllerInstance
