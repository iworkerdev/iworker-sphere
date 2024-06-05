'use client'

import { API_ENDPOINTS_CONFIG, fetcher } from '@/config/constants'
import { Box, Container, Stack, Text } from '@chakra-ui/react'
import { Desktop, MainLayout, SideBarItems } from '@/layouts/main.layout'
import { ErrorAlert, LoadingSpinner } from '@/components'
import React, { FC } from 'react'
import { find, keys, map } from 'lodash'

import { ProfileList } from './profile-list'
import Select from 'react-select'
import useSWR from 'swr'
import { useWarmup } from '@/hooks'

const DesktopWrapper = ({
  teams,
  desktops,
  activeDesktopId: active_desktop_id,
}: {
  teams: SideBarItems[]
  desktops: Desktop[]
  activeDesktopId: string
}) => {
  const {
    activeTeam,
    activeDesktopId,
    handleWarmUpAll,
    handleActiveDesktopChange,
    error,
    isLoading,
    activeDesktop,
    isTriggeringWarmUp,
    activeTeamDesktopOptions,
  } = useWarmup(desktops, active_desktop_id)

  return (
    <MainLayout
      teams={teams}
      desktops={desktops}
      activeTeam={activeTeam || ''}
      activeDesktopId={activeDesktopId}
      handleActiveDesktopChange={handleActiveDesktopChange}
    >
      <Text fontSize='xl' color={'gray.100'}>
        Team <strong>{activeTeam}</strong>
      </Text>
      <Stack direction='row' spacing={4}>
        <Text fontSize='xl' color={'gray.100'}>
          Desktop
        </Text>
        <Box flex={1} px={4}>
          <Select
            options={activeTeamDesktopOptions}
            value={find(activeTeamDesktopOptions, { value: activeDesktopId })}
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
          desktop_name={activeDesktop?.name || ''}
          isSyncingProfiles={isLoading}
        />
      )}
    </MainLayout>
  )
}

export const FocusedDesktopView: FC = () => {
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
            'This might be due to the service being down, you can restart the service in the terminal window. open the terminal window and cancel any running operations by using key combination `Ctrl + c`, and the type `npm start` and press enter.'
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
    <DesktopWrapper
      teams={TEAMS}
      desktops={allDesktops}
      activeDesktopId={active_desktop?.uuid}
    />
  )
}
