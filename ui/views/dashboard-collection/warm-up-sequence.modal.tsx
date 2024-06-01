import { API_ENDPOINTS_CONFIG, apiClient } from '@/config/constants'
import {
  Box,
  Button,
  Divider,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { FC, useMemo, useState } from 'react'
import { find, map } from 'lodash'

import { Desktop } from '@/layouts/main.layout'
import Select from 'react-select'
import { mutate } from 'swr'

type WarmUpModalProps = {
  desktops: Desktop[]
}

export const WarmUpSequenceModal: FC<WarmUpModalProps> = ({ desktops }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDesktops, setSelectedDesktops] = useState<string[]>([])

  const options = useMemo(() => {
    return desktops.map(d => ({
      label: d.name,
      value: d.uuid,
    }))
  }, [desktops])

  const renderSelectedDesktops = () => {
    return (
      <Box py={2}>
        <Text size='md' align={'center'}>
          <strong>Selected Desktops</strong>
        </Text>
        <Stack spacing={1}>
          {selectedDesktops.slice(0, 5).map(d => (
            <Box key={d}>
              <Text>{desktops.find(x => x.uuid === d)?.name}</Text>
              <Divider />
            </Box>
          ))}
        </Stack>
      </Box>
    )
  }

  const toast = useToast()

  const handleWarmUp = async () => {
    setIsLoading(true)

    const profiles = map(selectedDesktops, d => {
      const desktop = find(desktops, { uuid: d })
      return desktop?.name
    })

    console.log({
      profiles,
    })

    try {
      await apiClient.post(API_ENDPOINTS_CONFIG.bulkWarmUpDesktops, {
        profiles,
      })
      await new Promise(resolve => setTimeout(resolve, 5000))
      mutate(API_ENDPOINTS_CONFIG.getDesktops)
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any)?.message,
        status: 'error',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      })

      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button colorScheme='blue' onClick={onOpen}>
        Multiple Warm Up
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Heading size='md'>Warm Up Multiple Desktops</Heading>
            <Text align={'center'} size='sm'>
              Select a maximum of 5
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Select
              options={options}
              isMulti
              value={options.filter(o => selectedDesktops.includes(o.value))}
              onChange={e => {
                setSelectedDesktops(e.map((x: any) => x.value))
              }}
            />
            {selectedDesktops.length > 0 && renderSelectedDesktops()}
          </ModalBody>
          <ModalFooter>
            <Button
              isLoading={isLoading}
              disabled={isLoading}
              colorScheme='blue'
              mr={3}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              isLoading={isLoading}
              isDisabled={selectedDesktops.length === 0}
              colorScheme='yellow'
              onClick={handleWarmUp}
            >
              Warm Up
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
