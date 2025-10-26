// src/components/ChatWindow.tsx
import React, { useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  IconButton,
  Tooltip,
  Text,
  Spinner,
  ScaleFade,
  Flex,
  Avatar,
  Card,
  List,
  Badge,
  Input,
  Divider as Sep,
} from '@chakra-ui/react'
import { FiMenu, FiArrowLeft, FiSend } from 'react-icons/fi'

// Types
interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
}

interface Source {
  id: number
  source: string
  parent_chunk: string
}

interface ChatWindowProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  selectedChatTitle: string | undefined
  selectedChatId: string | null
  messages: Message[]
  isLoading: boolean
  streamingStatus: string | null
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
}

export default function ChatWindow({
  isSidebarOpen,
  onToggleSidebar,
  selectedChatTitle,
  selectedChatId,
  messages,
  isLoading,
  streamingStatus,
  input,
  onInputChange,
  onSubmit,
}: ChatWindowProps) {
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingStatus])

  return (
    <Box flex={1} display="flex" flexDir="column" bg="white" h="100vh">
      {/* Header */}
      <Box p={4} borderBottom="1px" borderColor="gray.200">
        <HStack>
          <Tooltip label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"} hasArrow>
            <IconButton
              aria-label="Toggle sidebar"
              icon={isSidebarOpen ? <FiArrowLeft /> : <FiMenu />}
              size="md"
              variant="ghost"
              onClick={onToggleSidebar}
            />
          </Tooltip>
          
          <Heading size="md" color="brand.600" isTruncated>
            {selectedChatTitle || 'Select a chat'}
          </Heading>
          {selectedChatId && (
            <Badge colorScheme="green" variant="solid">
              Active
            </Badge>
          )}
        </HStack>
      </Box>

      {/* Messages */}
      <Box flex={1} overflowY="auto" p={4} bg="gray.50">
        <VStack align="stretch" spacing={4}>
          {messages.length === 0 && (
            <Box textAlign="center" py={12} color="gray.500">
              <Text fontSize="lg">
                {selectedChatId
                  ? "Ask a question to get started."
                  : "Select or create a chat to begin."}
              </Text>
            </Box>
          )}

          {messages.map(msg => (
            <ScaleFade key={msg.id} in>
              <Flex
                justify={msg.type === 'user' ? 'flex-end' : 'flex-start'}
              >
                <HStack
                  spacing={3}
                  align="flex-start"
                  maxW="85%"
                >
                  {msg.type === 'assistant' && (
                    <Avatar size="sm" name="AI" bg="gray.400" />
                  )}

                  <Card
                    bg={msg.type === 'user' ? 'brand.500' : 'white'}
                    color={msg.type === 'user' ? 'white' : 'gray.800'}
                    p={4}
                    borderRadius="lg"
                    shadow="sm"
                    width="fit-content"
                  >
                    <Text whiteSpace="pre-wrap" overflowWrap="anywhere">
                      {msg.content}
                    </Text>

                    {msg.isStreaming && (
                      <HStack mt={3} spacing={2}>
                        <Spinner size="sm" color="brand.500" />
                        <Text fontSize="sm" opacity={0.8} color="brand.700">
                          {streamingStatus || 'Generating…'}
                        </Text>
                      </HStack>
                    )}

                    {msg.sources?.length ? (
                      <>
                        <Sep my={3} />
                        <Box>
                          <Text fontWeight="semibold" fontSize="sm" mb={1}>
                            Sources
                          </Text>
                          <List spacing={1} fontSize="sm">
                            {msg.sources.map(s => (
                              <li key={s.id}>• {s.source}</li>
                            ))}
                          </List>
                        </Box>
                      </>
                    ) : null}
                  </Card>

                  {msg.type === 'user' && (
                    <Avatar size="sm" name="You" bg="brand.500" />
                  )}
                </HStack>
              </Flex>
            </ScaleFade>
          ))}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input bar */}
      <Box p={4} borderTop="1px" borderColor="gray.200" bg="white">
        <form onSubmit={onSubmit}>
          <HStack>
            <Input
              placeholder="Ask a question about your documents…"
              value={input}
              onChange={onInputChange}
              disabled={isLoading || !selectedChatId}
              flex={1}
              size="lg"
            />
            <IconButton
              aria-label="Send"
              icon={<FiSend />}
              type="submit"
              colorScheme="brand"
              size="lg"
              isLoading={isLoading}
              disabled={!input.trim() || isLoading || !selectedChatId}
            />
          </HStack>
        </form>
      </Box>
    </Box>
  )
}