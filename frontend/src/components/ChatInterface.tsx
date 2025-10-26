import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Heading,
  Card,
  Spinner,
  Divider as Separator,
  List,
  useToast,
} from '@chakra-ui/react'

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

const API_URL = 'http://localhost:8000'

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const handleStream = async (question: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setIsLoading(true)
    setStreamingContent('')

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          k: 10,
          stream: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let sources: Source[] = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6)

              try {
                const parsed = JSON.parse(data)

                if (parsed.type === 'content') {
                  accumulatedContent += parsed.content
                  setStreamingContent(accumulatedContent)
                } else if (parsed.type === 'status') {
                  console.log('Status:', parsed.content)
                } else if (parsed.type === 'sources') {
                  sources = parsed.content
                } else if (parsed.type === 'done') {
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage.type === 'assistant') {
                      lastMessage.content = accumulatedContent
                      lastMessage.sources = sources
                      lastMessage.isStreaming = false
                    }
                    return newMessages
                  })
                  setStreamingContent('')
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.content)
                }
              } catch (e) {
                console.error('Parse error:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        status: 'error',
        duration: 5000,
      })

      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.type === 'assistant') {
          lastMessage.content = 'Sorry, I encountered an error processing your request.'
          lastMessage.isStreaming = false
        }
        return newMessages
      })
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    handleStream(input.trim())
    setInput('')
  }

  return (
    <>
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={6} align="stretch">
            {/* Header */}
            <Box textAlign="center">
              <Heading size="4xl" mb={2} color="blue.600">
                📚 RAG Document Assistant
              </Heading>
              <Text color="gray.600" fontSize="lg">
                Ask questions about your documents
              </Text>
            </Box>

            {/* Chat Container */}
            <Card
              bg="white"
              shadow="lg"
              borderRadius="xl"
              overflow="hidden"
              h="70vh"
              display="flex"
              flexDirection="column"
            >
              <Box p={0} display="flex" flexDirection="column" flex={1}>
                {/* Messages */}
                <Box flex={1} overflowY="auto" p={6}>
                  <VStack gap={4} align="stretch">
                    {messages.length === 0 && (
                      <Box textAlign="center" py={10} color="gray.500">
                        <Text fontSize="xl">👋 Welcome! Ask me anything about your documents.</Text>
                      </Box>
                    )}

                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
                        maxW="80%"
                      >
                        <Card
                          bg={message.type === 'user' ? 'blue.500' : 'gray.100'}
                          color={message.type === 'user' ? 'white' : 'gray.800'}
                          variant="elevated"
                        >
                          <Box>
                            <Text whiteSpace="pre-wrap">
                              {message.isStreaming ? streamingContent : message.content}
                            </Text>

                            {message.isStreaming && (
                              <HStack mt={2} gap={2}>
                                <Spinner size="sm" />
                                <Text fontSize="sm" opacity={0.8}>
                                  Generating...
                                </Text>
                              </HStack>
                            )}

                            {message.sources && message.sources.length > 0 && (
                              <>
                                <Separator my={3} />
                                <Box>
                                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                                    📖 Sources:
                                  </Text>
                                  <List spacing={1}>
                                    {message.sources.map((source) => (
                                      <li key={source.id}>
                                        <Text fontSize="sm">
                                          <Text as="span" mr={2}>•</Text>
                                          {source.source}
                                        </Text>
                                      </li>
                                    ))}
                                  </List>
                                </Box>
                              </>
                            )}
                          </Box>
                        </Card>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </VStack>
                </Box>

                {/* Input */}
                <Box p={4} bg="gray.50" borderTop="1px" borderColor="gray.200">
                  <form onSubmit={handleSubmit}>
                    <HStack gap={2}>
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your documents..."
                        size="lg"
                        bg="white"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        colorScheme="blue"
                        size="lg"
                        isLoading={isLoading}
                        disabled={!input.trim() || isLoading}
                        px={8}
                      >
                        Send ➤
                      </Button>
                    </HStack>
                  </form>
                </Box>
              </Box>
            </Card>
          </VStack>
        </Container>
      </Box>
    </>
  )
}

export default ChatInterface