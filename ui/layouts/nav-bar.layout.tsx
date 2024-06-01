import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'

import { Link } from '@chakra-ui/next-js'
import { ReactNode } from 'react'

const Links = [
  {
    name: 'Desktop Collections',
    url: '/',
  },
  {
    name: 'Focused View',
    url: '/focused',
  },
]

const NavLink = ({ children, url }: { children: ReactNode; url: string }) => (
  <Link
    px={2}
    py={1}
    rounded={'md'}
    _hover={{
      textDecoration: 'none',
      bg: useColorModeValue('gray.200', 'gray.700'),
    }}
    href={url}
  >
    {children}
  </Link>
)

export const NavigationBar = () => {
  return (
    <Box px={4} bg={'white'} rounded={'xl'}>
      <Flex h={12} alignItems={'center'} justifyContent={'space-between'}>
        <HStack spacing={8} alignItems={'center'}>
          <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
            {Links.map(link => (
              <NavLink key={link.url} url={link.url}>
                {link.name}
              </NavLink>
            ))}
          </HStack>
        </HStack>
      </Flex>
    </Box>
  )
}
