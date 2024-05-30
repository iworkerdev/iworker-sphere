import {
  API_ENDPOINTS_CONFIG,
  SWR_CONFIG,
  apiClient,
  fetcher,
} from '@/config/constants'
import {
  Button,
  Checkbox,
  HStack,
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
  Tr,
} from '@chakra-ui/react'
import { ErrorAlert, LoadingSpinner } from '@/components'
import useSWR, { mutate } from 'swr'

import React from 'react'
import { formatDate } from 'date-fns'

interface Profile {
  _id: string
  team_name: string
  name: string
  session_id: string
  desktop_id: string
  desktop_name: string
  session_execution_id: number
  session_execution_batch_id: number
  user_id: string
  headless: boolean
  debug_port: string
  status: string
  last_activity: string
  last_topic_of_search: string
  createdAt: string
  updatedAt: string
  last_run_success_rate: string
}

type Props = {
  profile: Profile
}

const ProfileListItem = ({ profile }: Props) => {
  const [isLoading, setIsLoading] = React.useState(false)

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

  return (
    <Tr color={'gray.100'}>
      {/* <Td>
        <Checkbox size='sm' colorScheme='red'></Checkbox>
      </Td> */}
      <Td>{profile.name}</Td>
      <Td>{profile.status === 'ACTIVE' ? 'RUNNING' : profile.status}</Td>
      <Td>
        {profile.last_activity
          ? formatDate(new Date(profile.last_activity), 'MMM dd, yyyy HH:mm')
          : 'N/A'}
      </Td>
      <Td>{profile.last_run_success_rate}</Td>
      <Td>
        <Stack direction='row' spacing={1}>
          {profile.status === 'IDLE' ? (
            <Button
              size='sm'
              colorScheme='blue'
              onClick={startWarmUp}
              isLoading={isLoading}
            >
              Warm Up
            </Button>
          ) : (
            <Button
              size='sm'
              colorScheme='red'
              isLoading={isLoading}
              onClick={endWarmUp}
            >
              <HStack>
                {profile.status === 'ACTIVE' ? <Spinner /> : null}
                <Text>
                  {isLoading
                    ? 'Stopping...'
                    : profile.status === 'ACTIVE'
                    ? 'Stop'
                    : 'Stopped'}
                </Text>
              </HStack>
            </Button>
          )}
        </Stack>
      </Td>
    </Tr>
  )
}

type ProfileListProps = {
  desktop_uuid: string
  handleWarmUpAll: () => void
  isTriggeringWarmUp: boolean
}

export const ProfileList = ({
  desktop_uuid,
  handleWarmUpAll,
  isTriggeringWarmUp,
}: ProfileListProps) => {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS_CONFIG.getSessionsForDesktop(desktop_uuid),
    fetcher,
    SWR_CONFIG(10000, false),
  )

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

  const hasActiveProfiles = data.some(
    (profile: Profile) => profile.status === 'ACTIVE',
  )

  const handleRefresh = () => {
    mutate()
  }

  return (
    <Stack>
      <HStack justifyContent={'flex-end'} px={10}>
        <Button onClick={handleRefresh} size='md' colorScheme='yellow'>
          <Text>Refresh</Text>
        </Button>
        <Button
          onClick={handleWarmUpAll}
          disabled={isLoading || hasActiveProfiles || isTriggeringWarmUp}
          size='md'
          colorScheme='blue'
        >
          <Text>Warm Up All</Text>
        </Button>
      </HStack>

      <TableContainer>
        <Table variant='simple'>
          <TableCaption>Imperial to metric conversion factors</TableCaption>
          <Thead>
            <Tr>
              {/* <Th color={'gray.100'}>
              <Checkbox size='sm' colorScheme='red'></Checkbox>
            </Th> */}
              <Th color={'gray.100'}>Profile name</Th>
              <Th color={'gray.100'}>Status</Th>
              <Th color={'gray.100'}>Last activity</Th>
              <Th color={'gray.100'}>
                <Text>Success Rate</Text>
                <Text fontSize='xs' color='gray.500'>
                  /10 web visits
                </Text>
              </Th>
              <Th color={'gray.100'}>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((profile: Profile) => (
              <ProfileListItem key={profile._id} profile={profile} />
            ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Th>To convert</Th>
              <Th>into</Th>
              <Th isNumeric>multiply by</Th>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </Stack>
  )
}
