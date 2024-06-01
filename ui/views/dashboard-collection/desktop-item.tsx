import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
} from '@chakra-ui/react'
import { ErrorAlert, LoadingSpinner } from '@/components'

import { Desktop } from '@/layouts/main.layout'
import { FC } from 'react'
import { ProfileList } from '../focused-desktop-view/profile-list'

type DesktopItemProps = {
  desktop: Desktop
  isActive: boolean
  options: {
    handleWarmUpAll: () => void
    handleActiveDesktopChange: (uuid: string) => void
    isLoading: boolean
    isTriggeringWarmUp: boolean
    error: {
      message: string
    }
  }
}

export const DesktopItem: FC<DesktopItemProps> = ({
  desktop,
  isActive,
  options,
}) => {
  const {
    handleWarmUpAll,
    isTriggeringWarmUp,
    handleActiveDesktopChange,
    isLoading,
    error,
  } = options

  return (
    <AccordionItem my={2} border={'none'} rounded={'md'}>
      {({ isExpanded }) => (
        <>
          <h2>
            <AccordionButton
              bg={isActive ? 'gray.700' : 'gray.600'}
              _hover={{ bg: 'gray.700' }}
              rounded={'md'}
            >
              <Box as='span' flex='1' textAlign='left' color={'white'}>
                {desktop.name}
              </Box>
              <AccordionIcon color={'white'} />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4} color='white'>
            {isLoading ? (
              <LoadingSpinner />
            ) : error?.message ? (
              <ErrorAlert
                message={error.message}
                title='Error fetching Profiles for desktop'
              />
            ) : (
              <>
                {isExpanded && (
                  <ProfileList
                    desktop_uuid={desktop.uuid}
                    handleWarmUpAll={handleWarmUpAll}
                    isTriggeringWarmUp={isTriggeringWarmUp}
                    handleSyncProfiles={() =>
                      handleActiveDesktopChange(desktop?.uuid || '')
                    }
                    desktop_name={desktop?.name || ''}
                    isSyncingProfiles={isLoading}
                  />
                )}
              </>
            )}
          </AccordionPanel>
        </>
      )}
    </AccordionItem>
  )
}
