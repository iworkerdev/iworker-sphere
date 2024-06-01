import {
  Box,
  BoxProps,
  Flex,
  FlexProps,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

import { NavigationBar } from './nav-bar.layout'
import React from 'react'
import { ReactText } from 'react'
import { find } from 'lodash'

export interface Desktop {
  uuid: string
  name: string
  team_name: string
  is_active: string
}

export interface SidebarProps extends BoxProps {
  teams: SideBarItems[]
  desktops: Desktop[]
  activeDesktopId: string
  activeTeam?: string
  handleActiveDesktopChange: (uuid: string) => void
}

export interface SideBarItems {
  name: string
}

export const SidebarContent = ({
  teams,
  desktops,
  activeDesktopId: activeDesktopIdProp,
  activeTeam,
  handleActiveDesktopChange,
  ...rest
}: SidebarProps) => {
  return (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      borderRight='1px'
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos='fixed'
      h='full'
      {...rest}
    >
      <Flex h='20' alignItems='center' mx='8' justifyContent='space-between'>
        <Text fontSize='2xl' fontFamily='monospace' fontWeight='bold'>
          Teams
        </Text>
      </Flex>
      <Stack>
        {teams.map(t => (
          <NavItem
            onClick={() => {
              const desktop = find(desktops, { team_name: t.name })
              if (desktop) {
                handleActiveDesktopChange(desktop.uuid)
              }
            }}
            isActive={t.name === activeTeam}
            key={t.name}
          >
            {t.name}
          </NavItem>
        ))}
      </Stack>
    </Box>
  )
}

interface NavItemProps extends FlexProps {
  children: ReactText
  isActive?: boolean
  onClick?: () => void
}
const NavItem = ({ children, isActive, ...rest }: NavItemProps) => {
  return (
    <Flex
      align='center'
      p='4'
      mx='4'
      borderRadius='lg'
      bg={isActive ? 'gray.400' : undefined}
      role='group'
      cursor='pointer'
      _hover={{
        bg: 'cyan.400',
        color: 'white',
      }}
      {...rest}
    >
      {children}
    </Flex>
  )
}

interface MainLayoutProps {
  children: React.ReactNode
  teams: SideBarItems[]
  desktops: Desktop[]
  activeTeam: string
  activeDesktopId: string
  handleActiveDesktopChange: (uuid: string) => void
}

export const MainLayout = ({
  children,
  teams,
  desktops,
  activeTeam,
  activeDesktopId,
  handleActiveDesktopChange,
}: MainLayoutProps) => {
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
        <NavigationBar />
        {children}
      </Stack>
    </Box>
  )
}
