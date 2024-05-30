import {
  Box,
  BoxProps,
  Flex,
  FlexProps,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

import React from 'react'
import { ReactText } from 'react'
import { find } from 'lodash'

interface Desktop {
  uuid: string
  name: string
  team_name: string
  is_active: string
}

interface SidebarProps extends BoxProps {
  teams: SideBarItems[]
  desktops: Desktop[]
  activeDesktopId: string
  activeTeam?: string
  handleActiveDesktopChange: (uuid: string) => void
}

interface SideBarItems {
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
