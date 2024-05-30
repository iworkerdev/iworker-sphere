import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  VStack,
} from '@chakra-ui/react'

import React from 'react'

type Props = {
  message: string
  title: string
}

export const ErrorAlert = ({ message, title }: Props) => {
  return (
    <VStack>
      <Alert status='error'>
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {message ||
            'This might be due to the service being down, you can restart the service in the terminal window by running `yarn dev`.'}
        </AlertDescription>
      </Alert>
    </VStack>
  )
}
