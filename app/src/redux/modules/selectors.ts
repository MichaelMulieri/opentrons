import { createSelector } from 'reselect'
import sortBy from 'lodash/sortBy'

import { selectors as RobotSelectors } from '../robot'
import * as Copy from './i18n'
import * as Types from './types'

import type { State } from '../types'
import type { SessionModule } from '../robot/types'
import { PREPARABLE_MODULE_TYPES } from './constants'
import {
  THERMOCYCLER_MODULE_TYPE,
  getModuleType,
  checkModuleCompatibility,
} from '@opentrons/shared-data'

export { getModuleType } from '@opentrons/shared-data'

export const getAttachedModules: (
  state: State,
  robotName: string | null
) => Types.AttachedModule[] = createSelector(
  // TODO(IL, 2021-05-27): factor out this inner function for clarity
  (
    state: State,
    robotName: string | null
  ): { [moduleId: string]: Types.AttachedModule } =>
    robotName !== null
      ? (state.modules[robotName]?.modulesById as {
          [moduleId: string]: Types.AttachedModule
        })
      : {},
  // sort by usbPort info, if they do not exist (robot version below 4.3), sort by serial
  modulesByPort => sortBy(modulesByPort, ['usbPort.port', 'serialNumber'])
)

export const getAttachedModulesForConnectedRobot = (
  state: State
): Types.AttachedModule[] => {
  const robotName = RobotSelectors.getConnectedRobotName(state)
  return getAttachedModules(state, robotName)
}

const isModulePrepared = (module: Types.AttachedModule): boolean => {
  if (module.moduleType === THERMOCYCLER_MODULE_TYPE)
    return module.data.lidStatus === 'open'
  return false
}

export const getUnpreparedModules: (
  state: State
) => Types.AttachedModule[] = createSelector(
  getAttachedModulesForConnectedRobot,
  RobotSelectors.getModules,
  (attachedModules, protocolModules) => {
    const preparableSessionModules = protocolModules
      .filter(m => PREPARABLE_MODULE_TYPES.includes(getModuleType(m.model)))
      .map(m => m.model)

    // return actual modules that are both
    // a) required to be prepared by the session
    // b) not prepared according to isModulePrepared
    return attachedModules.filter(
      m =>
        preparableSessionModules.includes(m.moduleModel) && !isModulePrepared(m)
    )
  }
)

export const getMatchedModules: (
  state: State
) => Types.MatchedModule[] = createSelector(
  getAttachedModulesForConnectedRobot,
  RobotSelectors.getModulesByProtocolLoadOrder,
  (attachedModules, protocolModules) => {
    const matchedAmod: Types.MatchedModule[] = []
    const matchedPmod = []
    protocolModules.forEach(pmod => {
      const compatible =
        attachedModules.find(
          amod =>
            checkModuleCompatibility(amod.moduleModel, pmod.model) &&
            !matchedAmod.find(m => m.module === amod)
        ) ?? null
      if (compatible !== null) {
        matchedPmod.push(pmod)
        matchedAmod.push({ slot: pmod.slot, module: compatible })
      }
    })
    return matchedAmod
  }
)

export const getMissingModules: (
  state: State
) => SessionModule[] = createSelector(
  getAttachedModulesForConnectedRobot,
  RobotSelectors.getModules,
  (attachedModules, protocolModules) => {
    const matchedAmod: Types.AttachedModule[] = []
    const matchedPmod: typeof protocolModules = []
    protocolModules.forEach(pmod => {
      const compatible = attachedModules.find(
        amod =>
          checkModuleCompatibility(amod.moduleModel, pmod.model) &&
          !matchedAmod.includes(amod)
      )
      if (compatible) {
        matchedPmod.push(pmod)
        matchedAmod.push(compatible)
      }
    })
    return protocolModules.filter(m => !matchedPmod.includes(m))
  }
)

// selector to return a reason for module control being disabled if they
// should be disabled. Omit `robotName` arg to refer to currently connected
// RPC robot
export const getModuleControlsDisabled = (
  state: State,
  robotName?: string
): null | string => {
  const connectedRobotName = RobotSelectors.getConnectedRobotName(state)
  const protocolIsRunning = RobotSelectors.getIsRunning(state)

  if (
    connectedRobotName === null ||
    (robotName != null && connectedRobotName !== robotName)
  ) {
    return Copy.CONNECT_FOR_MODULE_CONTROL
  }

  if (protocolIsRunning) {
    return Copy.CANNOT_CONTROL_MODULE_WHILE_RUNNING
  }

  return null
}
