import { Spinner, VStack } from '@chakra-ui/react'

import React from 'react'

export const LoadingSpinner = () => {
  return (
    <VStack p={16}>
      <Spinner
        thickness='4px'
        speed='0.65s'
        emptyColor='gray.200'
        color='blue.500'
        size='xl'
      />
    </VStack>
  )
}
