'use client'

import { API_ENDPOINTS_CONFIG, apiClient, fetcher } from '@/config/constants'
import { Accordion, Container, HStack, Text } from '@chakra-ui/react'
import { Desktop, MainLayout, SideBarItems } from '@/layouts/main.layout'
import { ErrorAlert, LoadingSpinner } from '@/components'
import React, { useMemo, useState } from 'react'
import { find, keys, map } from 'lodash'
import useSWR, { mutate } from 'swr'

import { DesktopItem } from './desktop-item'
import { FC } from 'react'
import { WarmUpSequenceModal } from './warm-up-sequence.modal'
import { useWarmup } from '@/hooks'

type DashboardCollectionContentProps = {
  teams: SideBarItems[]
  desktops: Desktop[]
  active_desktop: Desktop
}

const DashboardCollectionContent: FC<DashboardCollectionContentProps> = ({
  teams,
  desktops,
  active_desktop,
}) => {
  const {
    activeTeam,
    activeDesktopId,
    handleWarmUpAll,
    handleActiveDesktopChange,
    error,
    isLoading,
    activeDesktop,
    desktopsInActiveTeam,
    isTriggeringWarmUp,
  } = useWarmup(desktops, active_desktop?.uuid)

  return (
    <MainLayout
      teams={teams}
      desktops={desktops}
      activeDesktopId={active_desktop?.uuid}
      activeTeam={activeTeam || ''}
      handleActiveDesktopChange={handleActiveDesktopChange}
    >
      <HStack justifyContent={'space-between'} w={'full'} px={2}>
        <Text fontSize='xl' color={'gray.100'}>
          Team <strong>{activeDesktop?.team_name || 'No team selected'}</strong>
        </Text>
        <WarmUpSequenceModal desktops={desktopsInActiveTeam} />
      </HStack>
      <Accordion
        allowToggle
        onChange={x => {
          const d = desktopsInActiveTeam[Number(x)]
          if (d && d.uuid && d.uuid !== activeDesktopId) {
            handleActiveDesktopChange(d.uuid)
          }
        }}
      >
        {map(desktopsInActiveTeam, d => (
          <DesktopItem
            key={d.uuid}
            desktop={d}
            isActive={d.uuid === activeDesktopId}
            options={{
              handleWarmUpAll,
              handleActiveDesktopChange,
              isLoading,
              isTriggeringWarmUp,
              error,
            }}
          />
        ))}
      </Accordion>
    </MainLayout>
  )
}

export const DashboardCollection: FC = () => {
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
            'This might be due to the service being down, you can restart the service in the terminal window. open the terminal window and cancel any running operations by using key combination `Ctrl + c`, and the type `yarn dev` and press enter.'
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
    <DashboardCollectionContent
      active_desktop={active_desktop}
      teams={TEAMS}
      desktops={allDesktops}
    />
  )
}
