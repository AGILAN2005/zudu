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
  Flex,
  Badge,
  Stack,
  Avatar,
} from '@chakra-ui/react'
// icons are intentionally omitted to avoid extra deps; use simple buttons instead

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
  const [files, setFiles] = useState<FileList | null>(null)
  const [chats, setChats] = useState<Array<{chat_id:string,num_messages:number}>>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/chats`)
      if (!res.ok) return
      const data = await res.json()
      setChats(data)
      if (data.length > 0 && !selectedChat) setSelectedChat(data[0].chat_id)
    } catch (e) {
      console.warn('Failed to fetch chats', e)
    }
  }

  const loadChatHistory = async (chatId: string) => {
    try {
      const res = await fetch(`${API_URL}/chats/${chatId}/history`)
      if (!res.ok) return
      const data = await res.json()
      // Convert history to messages
      const msgs: Message[] = data.history.map((h: any, idx: number) => ({
        id: `${chatId}-${idx}`,
        type: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
        sources: h.sources,
        isStreaming: false,
      }))
      setMessages(msgs)
    } catch (e) {
      console.warn('Failed to load history', e)
    }
  }

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
          chat_id: selectedChat,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast({ title: 'No files selected', status: 'warning', duration: 3000 })
      return
    }

    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))

    try {
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      const data = await res.json()
      toast({ title: 'Upload successful', description: `Chat created: ${data.chat_id}`, status: 'success' })
      await fetchChats()
      setSelectedChat(data.chat_id)
      // load its history
      await loadChatHistory(data.chat_id)
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Upload error', status: 'error' })
    }
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
            {/* Chat Container (split: sidebar + main) */}
            <Card bg="white" shadow="lg" borderRadius="xl" overflow="hidden" h="72vh">
              <Flex h="100%">
                {/* Sidebar */}
                <Box w="320px" borderRight="1px solid" borderColor="gray.100" p={4}>
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Avatar name="User" />
                      <Heading size="md">Chats</Heading>
                      <Button onClick={fetchChats} size="sm" ml="auto">Refresh</Button>
                    </HStack>

                    <Stack spacing={2} overflowY="auto" maxH="36vh">
                      {chats.length === 0 && <Text color="gray.500">No chats yet — upload documents to start.</Text>}
                      {chats.map((c) => (
                        <Box
                          key={c.chat_id}
                          p={3}
                          borderRadius="md"
                          bg={selectedChat === c.chat_id ? 'blue.50' : 'transparent'}
                          cursor="pointer"
                          onClick={() => { setSelectedChat(c.chat_id); loadChatHistory(c.chat_id) }}
                        >
                          <HStack justify="space-between">
                            <Text isTruncated maxW="200px">{c.chat_id}</Text>
                            <Badge>{c.num_messages}</Badge>
                          </HStack>
                        </Box>
                      ))}
                    </Stack>

                    <Separator />

                    <Box>
                      <Text fontSize="sm" mb={2}>Upload PDFs to create a new chat</Text>
                      <Input type="file" multiple accept="application/pdf" onChange={handleFileChange} mb={2} />
                      <HStack>
                        <Button colorScheme="blue" onClick={handleUpload} isDisabled={!files || files.length === 0}>Upload & Create Chat</Button>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>

                {/* Main Chat Area */}
                <Box flex={1} display="flex" flexDirection="column">
                  <Box p={4} borderBottom="1px solid" borderColor="gray.100">
                    <HStack>
                      <Heading size="md">{selectedChat ? `Chat: ${selectedChat}` : 'No chat selected'}</Heading>
                      {selectedChat && <Badge colorScheme="green">Active</Badge>}
                    </HStack>
                  </Box>

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
                          disabled={isLoading || !selectedChat}
                        />
                        <Button
                          type="submit"
                          colorScheme="blue"
                          size="lg"
                          isLoading={isLoading}
                          disabled={!input.trim() || isLoading || !selectedChat}
                          px={8}
                        >
                          Send ➤
                        </Button>
                      </HStack>
                    </form>
                  </Box>
                </Box>
              </Flex>
            </Card>
          </VStack>
        </Container>
      </Box>
    </>
  )
}

export default ChatInterface