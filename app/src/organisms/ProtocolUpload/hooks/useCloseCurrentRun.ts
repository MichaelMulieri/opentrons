import * as React from 'react'
import { useParams } from 'react-router-dom'

import { useDismissCurrentRunMutation } from '@opentrons/react-api-client'
import { useCurrentRunId } from './useCurrentRunId'

import { useTrackEvent } from '../../../redux/analytics'
import {
  useProtocolRunAnalyticsData,
  useRobotAnalyticsData,
} from '../../Devices/hooks'

import type { UseDismissCurrentRunMutationOptions } from '@opentrons/react-api-client/src/runs/useDismissCurrentRunMutation'
import type { NavRouteParams } from '../../../App/types'

type CloseCallback = (options?: UseDismissCurrentRunMutationOptions) => void

export function useCloseCurrentRun(): {
  closeCurrentRun: CloseCallback
  isClosingCurrentRun: boolean
} {
  const currentRunId = useCurrentRunId()
  const trackEvent = useTrackEvent()
  const { getProtocolRunAnalyticsData } = useProtocolRunAnalyticsData(
    currentRunId
  )
  const { robotName } = useParams<NavRouteParams>()
  const robotAnalyticsData = useRobotAnalyticsData(robotName)
  const {
    dismissCurrentRun,
    isLoading: isDismissing,
  } = useDismissCurrentRunMutation()

  const closeCurrentRun = async (
    options?: UseDismissCurrentRunMutationOptions
  ): Promise<void> => {
    if (currentRunId != null) {
      dismissCurrentRun(currentRunId, {
        ...options,
        onError: () => console.warn('failed to dismiss current'),
      })

      try {
        const {
          protocolRunAnalyticsData,
          runTime,
        } = await getProtocolRunAnalyticsData()

        trackEvent({
          name: 'runFinish',
          properties: {
            ...robotAnalyticsData,
            ...protocolRunAnalyticsData,
            runTime,
          },
        })
      } catch (e) {
        console.error(
          `getProtocolRunAnalyticsData error during runFinish: ${
            (e as Error).message
          }; sending event without protocol properties`
        )

        trackEvent({
          name: 'runAgain',
          properties: { ...robotAnalyticsData },
        })
      }
    }
  }

  const closeCurrentRunCallback = React.useCallback(closeCurrentRun, [
    dismissCurrentRun,
    currentRunId,
    robotAnalyticsData,
  ])

  return {
    closeCurrentRun: closeCurrentRunCallback,
    isClosingCurrentRun: isDismissing,
  }
}
