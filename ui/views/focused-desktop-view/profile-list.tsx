import {
  API_ENDPOINTS_CONFIG,
  SWR_CONFIG,
  apiClient,
  fetcher,
} from '@/config/constants'
import {
  Badge,
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { ErrorAlert, LoadingSpinner } from '@/components'
import React, { useState } from 'react'
import { SessionStatus, WarmUpProfile } from '@/types'
import { filter, find, keys } from 'lodash'
import useSWR, { mutate } from 'swr'

import { ChevronDownIcon } from '@chakra-ui/icons'
import { formatDate } from 'date-fns'

type Props = {
  profile: WarmUpProfile
}

const ProfileListItem = ({ profile }: Props) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const toast = useToast()

  const startWarmUp = async () => {
    try {
      setIsLoading(true)
      const started = await apiClient.post(API_ENDPOINTS_CONFIG.warmUpProfile, {
        session_id: profile.session_id,
      })
      mutate(API_ENDPOINTS_CONFIG.getSessionsForDesktop(profile.desktop_id))
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const endWarmUp = async () => {
    if (profile.status === SessionStatus.RUNNING) {
      toast({
        title: 'This session was not started via API. Cannot stop it.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
      return
    }

    try {
      setIsLoading(true)
      const stopped = await apiClient.post(API_ENDPOINTS_CONFIG.endWarmUp, {
        session_id: profile.session_id,
      })
      mutate(API_ENDPOINTS_CONFIG.getSessionsForDesktop(profile.desktop_id))
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const badgeVariant = {
    [SessionStatus.AUTOMATION_RUNNING]: 'outline',
    [SessionStatus.IMPORTED]: 'solid',
    [SessionStatus.RUNNING]: 'solid',
    [SessionStatus.STOPPED]: 'subtle',
    [SessionStatus.WARMUP]: 'solid',
  }

  const canWarmUp = profile.status === SessionStatus.STOPPED

  return (
    <Tr color={'gray.100'}>
      <Td>
        <Stack direction='row' spacing={1}>
          {canWarmUp ? (
            <Button
              size='sm'
              // colorScheme='blue'
              onClick={startWarmUp}
              isLoading={isLoading}
            >
              Warm Up
            </Button>
          ) : (
            <Button
              size='sm'
              colorScheme={
                profile.status === SessionStatus.AUTOMATION_RUNNING
                  ? 'yellow'
                  : profile.status === SessionStatus.RUNNING
                  ? 'red'
                  : 'green'
              }
              disabled={profile.status === SessionStatus.RUNNING}
              isLoading={isLoading}
              onClick={endWarmUp}
            >
              <Tooltip
                label={
                  profile.status === SessionStatus.AUTOMATION_RUNNING
                    ? 'Stop Automation'
                    : profile.status === SessionStatus.RUNNING
                    ? 'This session was not started via API. Cannot stop it.'
                    : 'Stopped'
                }
              >
                <HStack>
                  {profile.status === SessionStatus.AUTOMATION_RUNNING ||
                  profile.status === SessionStatus.RUNNING ? (
                    <Spinner />
                  ) : null}
                  <Text>
                    {profile.status === SessionStatus.AUTOMATION_RUNNING
                      ? 'Stop'
                      : profile.status === SessionStatus.RUNNING
                      ? 'Running'
                      : 'Stop'}
                  </Text>
                </HStack>
              </Tooltip>
            </Button>
          )}
        </Stack>
      </Td>
      <Td>{profile.name}</Td>
      <Td>
        <Box>
          <Badge
            variant={badgeVariant[profile.status as SessionStatus]}
            colorScheme={
              profile.status === SessionStatus.AUTOMATION_RUNNING
                ? 'yellow'
                : profile.status === SessionStatus.RUNNING
                ? 'red'
                : 'white'
            }
          >
            {profile.status}
          </Badge>
        </Box>
      </Td>
      <Td>
        {profile.last_activity
          ? formatDate(new Date(profile.last_activity), 'MMM dd, yyyy HH:mm')
          : 'N/A'}
      </Td>
      <Td>{profile.last_run_success_rate}</Td>
    </Tr>
  )
}

type ProfileListProps = {
  desktop_uuid: string
  handleWarmUpAll: () => void
  isTriggeringWarmUp: boolean
  handleSyncProfiles: () => void
  isSyncingProfiles: boolean
  desktop_name: string
}

export const FILTERS = {
  ALL: 'ALL',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  AUTOMATION_RUNNING: 'AUTOMATION_RUNNING',
  _100_PERCENT_SUCCESS: '_100_PERCENT_SUCCESS',
  _LESS_THAN_100_PERCENT_SUCCESS: '_LESS_THAN_100_PERCENT_SUCCESS',
}

export const ProfileList = ({
  desktop_uuid,
  handleWarmUpAll,
  isTriggeringWarmUp,
  handleSyncProfiles,
  isSyncingProfiles,
  desktop_name,
}: ProfileListProps) => {
  const [currentFilter, setCurrentFilter] = useState(FILTERS.ALL)

  const filterOptions = [
    { value: FILTERS.ALL, label: 'All' },
    { value: FILTERS.AUTOMATION_RUNNING, label: 'Automation Running' },
    { value: FILTERS.RUNNING, label: 'Running' },
    { value: FILTERS.STOPPED, label: 'Stopped' },
    {
      value: FILTERS._100_PERCENT_SUCCESS,
      label: '100% Success Rate',
    },
    {
      value: FILTERS._LESS_THAN_100_PERCENT_SUCCESS,
      label: '< 100% Success Rate',
    },
  ]

  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS_CONFIG.getSessionsForDesktop(desktop_uuid, currentFilter),
    fetcher,
    SWR_CONFIG(10000, false),
  )

  const toast = useToast()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <ErrorAlert
        message={error.message}
        title='Error fetching Profiles for desktop'
      />
    )
  }

  const handleRefresh = () => {
    mutate()
  }

  const isDisabled =
    data?.length === 0 ||
    find(data, { status: SessionStatus.AUTOMATION_RUNNING })

  const handleClick = () => {
    isDisabled
      ? toast({
          title:
            data?.length === 0
              ? 'No profiles to warm up'
              : 'Please stop all active profiles before warming up all profiles',
          status: 'warning',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        })
      : handleWarmUpAll()
  }

  const hasRunningProfiles =
    filter(data, {
      status: SessionStatus.AUTOMATION_RUNNING,
    }).length > 0

  const isStopAllDisabled = data?.length === 0 || !hasRunningProfiles

  const handleStopAll = async () => {
    if (isStopAllDisabled) {
      toast({
        title: 'No active profiles to stop',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      })
      return
    }
    try {
      const stopped = await apiClient.post(
        API_ENDPOINTS_CONFIG.endAllWarmUpsInDesktop(desktop_uuid),
      )
      toast({
        title: 'All active profiles end initiated, This may take a few seconds',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
      mutate()
    } catch (error) {
      toast({
        title: 'Error stopping all active profiles',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
    }
  }

  return (
    <Stack>
      <HStack justifyContent={'space-between'}>
        <HStack>
          <Button
            isLoading={isSyncingProfiles}
            onClick={handleSyncProfiles}
            size='md'
            colorScheme='red'
          >
            <Text>Sync Profiles</Text>
          </Button>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              {filterOptions.find(option => option.value === currentFilter)
                ?.label || 'All'}
            </MenuButton>
            <MenuList bg={'gray.900'}>
              {keys(FILTERS).map(filter => (
                <MenuItem
                  bg={currentFilter === filter ? 'blue.500' : 'transparent'}
                  color={currentFilter === filter ? 'yellow' : 'white'}
                  key={filter}
                  onClick={() => setCurrentFilter(filter)}
                  py={2}
                  borderColor='gray.100'
                  _hover={{ bg: 'blue.500' }}
                  borderWidth={1}
                >
                  {filterOptions.find(option => option.value === filter)?.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>
        <Stack
          color='white'
          spacing={2}
          alignItems={'center'}
          justifyContent={'center'}
        >
          <Text>{desktop_name}</Text>
          <Text fontSize='sm' color='yellow.500'>
            ({data?.length} Profile
            {data?.length === 1 ? '' : 's'})
          </Text>
        </Stack>
        <HStack justifyContent={'flex-end'} px={10}>
          <Button onClick={handleRefresh} size='md' colorScheme='yellow'>
            <Text>Refresh</Text>
          </Button>
          <Button
            onClick={handleClick}
            isLoading={isTriggeringWarmUp || isLoading}
            size='md'
            cursor={isDisabled ? 'not-allowed' : 'pointer'}
            colorScheme='blue'
            _disabled={{ cursor: 'not-allowed', bg: 'gray.300' }}
          >
            <Text>Warm Up All</Text>
          </Button>
          {hasRunningProfiles && (
            <Button
              onClick={handleStopAll}
              isLoading={isTriggeringWarmUp || isLoading}
              size='md'
              cursor={isStopAllDisabled ? 'not-allowed' : 'pointer'}
              colorScheme='red'
              _disabled={{ cursor: 'not-allowed', bg: 'gray.300' }}
            >
              <Text>Stop API WarmUps</Text>
            </Button>
          )}
        </HStack>
      </HStack>

      <TableContainer>
        <Table variant='simple'>
          <TableCaption>
            <Stack
              color='white'
              spacing={2}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Text fontSize='sm' color='yellow.500'>
                ({data?.length} Profile
                {data?.length === 1 ? '' : 's'})
              </Text>
              <Text>{desktop_name}</Text>
            </Stack>
          </TableCaption>
          <Thead>
            <Tr>
              <Th color={'gray.100'}>Actions</Th>
              <Th color={'gray.100'}>Profile name</Th>
              <Th color={'gray.100'}>Status</Th>
              <Th color={'gray.100'}>Last activity</Th>
              <Th color={'gray.100'}>
                <Text>Success Rate</Text>
                <Text fontSize='xs' color='gray.500'>
                  /10 web visits
                </Text>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {data?.map((profile: WarmUpProfile) => (
              <ProfileListItem key={profile._id} profile={profile} />
            ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Th>Actions</Th>
              <Th>Profile name</Th>
              <Th>Status</Th>
              <Th>Last activity</Th>
              <Th>Success Rate</Th>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </Stack>
  )
}
