import { API_ENDPOINTS_CONFIG, apiClient } from '@/config/constants'
import { useMemo, useState } from 'react'

import { Desktop } from '@/layouts/main.layout'
import { find } from 'lodash'
import { mutate } from 'swr'

export const useWarmup = (desktops: Desktop[], activeDesktop_id: string) => {
  const [activeDesktopId, setActiveDesktopId] = useState(activeDesktop_id)
  const [isLoading, setIsLoading] = useState(false)
  const [isTriggeringWarmUp, setIsTriggeringWarmUp] = useState(false)

  const [error, setError] = useState({
    message: '',
  })

  const activeTeam = useMemo(() => {
    const activeDesktop = find(desktops, { uuid: activeDesktopId })
    return activeDesktop?.team_name
  }, [activeDesktopId, desktops])

  const activeDesktop = useMemo(() => {
    return find(desktops, { uuid: activeDesktopId })
  }, [activeDesktopId, desktops])

  const handleActiveDesktopChange = async (uuid: string) => {
    setError({
      message: '',
    } as any)
    try {
      setIsLoading(true)
      const { data } = await apiClient.get(
        API_ENDPOINTS_CONFIG.changeActiveDesktop(uuid),
      )
      mutate(API_ENDPOINTS_CONFIG.getDesktops)
      mutate(API_ENDPOINTS_CONFIG.getSessionsForDesktop(uuid))
      setActiveDesktopId(data.uuid)

      //delay for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (error) {
      const e = error as any
      const message = e?.response?.data?.message || e.message || ''
      setError({
        message,
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const desktopsInActiveTeam = useMemo(() => {
    return desktops.filter(d => d.team_name === activeTeam)
  }, [activeTeam, desktops])

  const activeTeamDesktopOptions = useMemo(() => {
    return desktopsInActiveTeam.map(d => ({
      value: d.uuid,
      label: d.name,
    }))
  }, [desktopsInActiveTeam])

  const handleWarmUpAll = async () => {
    setIsTriggeringWarmUp(true)
    try {
      const { data } = await apiClient.post(
        API_ENDPOINTS_CONFIG.warmUpAllProfiles,
        {
          profile_name: activeDesktop?.name,
        },
      )
      mutate(API_ENDPOINTS_CONFIG.getDesktops)
      mutate(API_ENDPOINTS_CONFIG.getSessionsForDesktop(activeDesktopId))
    } catch (error) {
      console.error(error)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 3000))
      setIsTriggeringWarmUp(false)
    }
  }

  return {
    activeDesktop,
    activeTeam,
    desktopsInActiveTeam,
    activeTeamDesktopOptions,
    isLoading,
    isTriggeringWarmUp,
    activeDesktopId,
    handleActiveDesktopChange,
    handleWarmUpAll,
    error,
  }
}
