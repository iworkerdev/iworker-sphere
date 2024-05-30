'use client'

import { API_ENDPOINTS_CONFIG, apiClient, fetcher } from '@/config/constants'
import { Box, Container, Stack, Text } from '@chakra-ui/react'
import { ErrorAlert, LoadingSpinner } from '@/components'
import React, { useMemo, useState } from 'react'
import { find, keys, map } from 'lodash'
import useSWR, { mutate } from 'swr'

import { FC } from 'react'
import { ProfileList } from './profile-list'
import Select from 'react-select'
import { SidebarContent } from './side-bar-content'

interface SideBarItems {
  name: string
}

interface Desktop {
  uuid: string
  name: string
  team_name: string
  is_active: string
}

const DashBoardWrapper = ({
  teams,
  desktops,
  activeDesktopId: activeDesktopIdProp,
}: {
  teams: SideBarItems[]
  desktops: Desktop[]
  activeDesktopId: string
}) => {
  const [activeDesktopId, setActiveDesktopId] = useState(activeDesktopIdProp)
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

  const options = useMemo(() => {
    return desktopsInActiveTeam.map(d => ({
      value: d.uuid,
      label: d.name,
    }))
  }, [desktopsInActiveTeam])

  const handleWarmUpAll = async () => {
    await handleActiveDesktopChange(activeDesktopId)
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

  return (
    <Box minH='100vh' bg={'gray.800'}>
      <SidebarContent
        display={{ base: 'none', md: 'block' }}
        teams={teams}
        desktops={desktops}
        activeTeam={activeTeam}
        activeDesktopId={activeDesktopId}
        handleActiveDesktopChange={handleActiveDesktopChange}
      />
      <Stack ml={{ base: 0, md: 60 }} p='4' spacing={4} direction='column'>
        <Text fontSize='xl' color={'gray.100'}>
          Team <strong>{activeTeam}</strong>
        </Text>
        <Stack direction='row' spacing={4}>
          <Text fontSize='xl' color={'gray.100'}>
            Desktop
          </Text>
          <Box flex={1} px={4}>
            <Select
              options={options}
              value={find(options, { value: activeDesktopId })}
              onChange={e => {
                const desktop = find(desktops, { uuid: e?.value })
                if (desktop) {
                  handleActiveDesktopChange(desktop.uuid)
                }
              }}
            />
          </Box>
        </Stack>
        {isLoading ? (
          <LoadingSpinner />
        ) : error?.message ? (
          <ErrorAlert
            message={error.message}
            title='Error fetching Profiles for desktop'
          />
        ) : (
          <ProfileList
            desktop_uuid={activeDesktop?.uuid || ''}
            handleWarmUpAll={handleWarmUpAll}
            isTriggeringWarmUp={isTriggeringWarmUp}
            handleSyncProfiles={() =>
              handleActiveDesktopChange(activeDesktop?.uuid || '')
            }
            isSyncingProfiles={isLoading}
          />
        )}
      </Stack>
    </Box>
  )
}

export const DashBoard: FC = () => {
  const { data, error, isLoading } = useSWR(
    API_ENDPOINTS_CONFIG.getDesktops,
    fetcher,
  )

  if (isLoading) {
    return (
      <Container maxW={'container.xl'} py={10}>
        <LoadingSpinner />
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW={'container.xl'} py={10}>
        <ErrorAlert
          message={
            error.message ||
            'This might be due to the service being down, you can restart the service in the terminal window by running `yarn dev`'
          }
          title='An error occurred while fetching data'
        />
      </Container>
    )
  }

  const { teams, desktops, active_desktop } = data || {}

  const TEAMS = map(teams, t => ({
    name: t,
  }))

  const allDesktops = keys(desktops)
    .map(k => desktops[k])
    .flat()

  return (
    <DashBoardWrapper
      teams={TEAMS}
      desktops={allDesktops}
      activeDesktopId={active_desktop?.uuid}
    />
  )
}
