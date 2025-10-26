import React from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import ChatInterface from './components/ChatInterface'
import { system } from './themes'

function App() {
  return (
    <ChakraProvider theme={system}>
      <ChatInterface />
    </ChakraProvider>
  )
}

export default App