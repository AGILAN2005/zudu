// // import React, { useState, useRef, useEffect,useCallback, useMemo } from 'react'

// // import {
// //   Box,
// //   Container,
// //   VStack,
// //   HStack,
// //   Input,
// //   Button,
// //   Text,
// //   Heading,
// //   Card,
// //   Spinner,
// //   Divider as Separator,
// //   List,
// //   useToast,
// //   Flex,
// //   Badge,
// //   Stack,
// //   Avatar,
// // } from '@chakra-ui/react'
// // // icons are intentionally omitted to avoid extra deps; use simple buttons instead

// // interface Message {
// //   id: string
// //   type: 'user' | 'assistant'
// //   content: string
// //   sources?: Source[]
// //   isStreaming?: boolean
// // }

// // interface Source {
// //   id: number
// //   source: string
// //   parent_chunk: string
// // }

// // const API_URL = 'http://localhost:8000'

// // // const ChatInterface = () => {
// // //   const [messages, setMessages] = useState<Message[]>([])
// // //   const [input, setInput] = useState('')
// // //   const [isLoading, setIsLoading] = useState(false)
// // //   const [streamingContent, setStreamingContent] = useState('')
// // //   const [files, setFiles] = useState<FileList | null>(null)
// // //   const [chats, setChats] = useState<Array<{chat_id:string,num_messages:number}>>([])
// // //   const [selectedChat, setSelectedChat] = useState<string | null>(null)
// // //   const messagesEndRef = useRef<HTMLDivElement>(null)
// // //   const toast = useToast()

// // //   const scrollToBottom = () => {
// // //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
// // //   }

// // //   useEffect(() => {
// // //     scrollToBottom()
// // //   }, [messages, streamingContent])

// // //   useEffect(() => {
// // //     fetchChats()
// // //   }, [])

// // //   const fetchChats = async () => {
// // //     try {
// // //       const res = await fetch(`${API_URL}/chats`)
// // //       if (!res.ok) return
// // //       const data = await res.json()
// // //       setChats(data)
// // //       if (data.length > 0 && !selectedChat) setSelectedChat(data[0].chat_id)
// // //     } catch (e) {
// // //       console.warn('Failed to fetch chats', e)
// // //     }
// // //   }

// // //   const loadChatHistory = async (chatId: string) => {
// // //     try {
// // //       const res = await fetch(`${API_URL}/chats/${chatId}/history`)
// // //       if (!res.ok) return
// // //       const data = await res.json()
// // //       // Convert history to messages
// // //       const msgs: Message[] = data.history.map((h: any, idx: number) => ({
// // //         id: `${chatId}-${idx}`,
// // //         type: h.role === 'user' ? 'user' : 'assistant',
// // //         content: h.content,
// // //         sources: h.sources,
// // //         isStreaming: false,
// // //       }))
// // //       setMessages(msgs)
// // //     } catch (e) {
// // //       console.warn('Failed to load history', e)
// // //     }
// // //   }

// // //   const handleStream = async (question: string) => {
// // //     const userMessage: Message = {
// // //       id: Date.now().toString(),
// // //       type: 'user',
// // //       content: question,
// // //     }

// // //     const assistantMessage: Message = {
// // //       id: (Date.now() + 1).toString(),
// // //       type: 'assistant',
// // //       content: '',
// // //       isStreaming: true,
// // //     }

// // //     setMessages((prev) => [...prev, userMessage, assistantMessage])
// // //     setIsLoading(true)
// // //     setStreamingContent('')

// // //     try {
// // //       const response = await fetch(`${API_URL}/query`, {
// // //         method: 'POST',
// // //         headers: {
// // //           'Content-Type': 'application/json',
// // //         },
// // //         body: JSON.stringify({
// // //           question,
// // //           k: 10,
// // //           stream: true,
// // //           chat_id: selectedChat,
// // //         }),
// // //       })

// // //       if (!response.ok) {
// // //         throw new Error('Failed to fetch')
// // //       }

// // //       const reader = response.body?.getReader()
// // //       const decoder = new TextDecoder()
// // //       let accumulatedContent = ''
// // //       let sources: Source[] = []

// // //       if (reader) {
// // //         while (true) {
// // //           const { done, value } = await reader.read()
// // //           if (done) break

// // //           const chunk = decoder.decode(value)
// // //           const lines = chunk.split('\n\n')

// // //           for (const line of lines) {
// // //             if (line.startsWith('data: ')) {
// // //               const data = line.substring(6)

// // //               try {
// // //                 const parsed = JSON.parse(data)

// // //                 if (parsed.type === 'content') {
// // //                   accumulatedContent += parsed.content
// // //                   setStreamingContent(accumulatedContent)
// // //                 } else if (parsed.type === 'status') {
// // //                   console.log('Status:', parsed.content)
// // //                 } else if (parsed.type === 'sources') {
// // //                   sources = parsed.content
// // //                 } else if (parsed.type === 'done') {
// // //                   setMessages((prev) => {
// // //                     const newMessages = [...prev]
// // //                     const lastMessage = newMessages[newMessages.length - 1]
// // //                     if (lastMessage.type === 'assistant') {
// // //                       lastMessage.content = accumulatedContent
// // //                       lastMessage.sources = sources
// // //                       lastMessage.isStreaming = false
// // //                     }
// // //                     return newMessages
// // //                   })
// // //                   setStreamingContent('')
// // //                 } else if (parsed.type === 'error') {
// // //                   throw new Error(parsed.content)
// // //                 }
// // //               } catch (e) {
// // //                 console.error('Parse error:', e)
// // //               }
// // //             }
// // //           }
// // //         }
// // //       }
// // //     } catch (error) {
// // //       toast({
// // //         title: 'Error',
// // //         description: error instanceof Error ? error.message : 'Failed to get response',
// // //         status: 'error',
// // //         duration: 5000,
// // //       })

// // //       setMessages((prev) => {
// // //         const newMessages = [...prev]
// // //         const lastMessage = newMessages[newMessages.length - 1]
// // //         if (lastMessage.type === 'assistant') {
// // //           lastMessage.content = 'Sorry, I encountered an error processing your request.'
// // //           lastMessage.isStreaming = false
// // //         }
// // //         return newMessages
// // //       })
// // //       setStreamingContent('')
// // //     } finally {
// // //       setIsLoading(false)
// // //     }
// // //   }

// // //   const handleSubmit = (e: React.FormEvent) => {
// // //     e.preventDefault()
// // //     if (!input.trim() || isLoading) return

// // //     handleStream(input.trim())
// // //     setInput('')
// // //   }

// // //   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     setFiles(e.target.files)
// // //   }

// // //   const handleUpload = async () => {
// // //     if (!files || files.length === 0) {
// // //       toast({ title: 'No files selected', status: 'warning', duration: 3000 })
// // //       return
// // //     }

// // //     const fd = new FormData()
// // //     Array.from(files).forEach((f) => fd.append('files', f))

// // //     try {
// // //       const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
// // //       if (!res.ok) {
// // //         const err = await res.text()
// // //         throw new Error(err)
// // //       }
// // //       const data = await res.json()
// // //       toast({ title: 'Upload successful', description: `Chat created: ${data.chat_id}`, status: 'success' })
// // //       await fetchChats()
// // //       setSelectedChat(data.chat_id)
// // //       // load its history
// // //       await loadChatHistory(data.chat_id)
// // //     } catch (e) {
// // //       toast({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Upload error', status: 'error' })
// // //     }
// // //   }

// // //   return (
// // //     <>
// // //       <Box minH="100vh" bg="gray.50" py={8}>
// // //         <Container maxW="container.xl">
// // //           <VStack gap={6} align="stretch">
// // //             {/* Header */}
// // //             <Box textAlign="center">
// // //               <Heading size="4xl" mb={2} color="blue.600">
// // //                 📚 RAG Document Assistant
// // //               </Heading>
// // //               <Text color="gray.600" fontSize="lg">
// // //                 Ask questions about your documents
// // //               </Text>
// // //             </Box>
// // //             {/* Chat Container (split: sidebar + main) */}
// // //             <Card bg="white" shadow="lg" borderRadius="xl" overflow="hidden" h="72vh">
// // //               <Flex h="100%">
// // //                 {/* Sidebar */}
// // //                 <Box w="320px" borderRight="1px solid" borderColor="gray.100" p={4}>
// // //                   <VStack align="stretch" spacing={4}>
// // //                     <HStack>
// // //                       <Avatar name="User" />
// // //                       <Heading size="md">Chats</Heading>
// // //                       <Button onClick={fetchChats} size="sm" ml="auto">Refresh</Button>
// // //                     </HStack>

// // //                     <Stack spacing={2} overflowY="auto" maxH="36vh">
// // //                       {chats.length === 0 && <Text color="gray.500">No chats yet — upload documents to start.</Text>}
// // //                       {chats.map((c) => (
// // //                         <Box
// // //                           key={c.chat_id}
// // //                           p={3}
// // //                           borderRadius="md"
// // //                           bg={selectedChat === c.chat_id ? 'blue.50' : 'transparent'}
// // //                           cursor="pointer"
// // //                           onClick={() => { setSelectedChat(c.chat_id); loadChatHistory(c.chat_id) }}
// // //                         >
// // //                           <HStack justify="space-between">
// // //                             <Text isTruncated maxW="200px">{c.chat_id}</Text>
// // //                             <Badge>{c.num_messages}</Badge>
// // //                           </HStack>
// // //                         </Box>
// // //                       ))}
// // //                     </Stack>

// // //                     <Separator />

// // //                     <Box>
// // //                       <Text fontSize="sm" mb={2}>Upload PDFs to create a new chat</Text>
// // //                       <Input type="file" multiple accept="application/pdf" onChange={handleFileChange} mb={2} />
// // //                       <HStack>
// // //                         <Button colorScheme="blue" onClick={handleUpload} isDisabled={!files || files.length === 0}>Upload & Create Chat</Button>
// // //                       </HStack>
// // //                     </Box>
// // //                   </VStack>
// // //                 </Box>

// // //                 {/* Main Chat Area */}
// // //                 <Box flex={1} display="flex" flexDirection="column">
// // //                   <Box p={4} borderBottom="1px solid" borderColor="gray.100">
// // //                     <HStack>
// // //                       <Heading size="md">{selectedChat ? `Chat: ${selectedChat}` : 'No chat selected'}</Heading>
// // //                       {selectedChat && <Badge colorScheme="green">Active</Badge>}
// // //                     </HStack>
// // //                   </Box>

// // //                   <Box flex={1} overflowY="auto" p={6}>
// // //                     <VStack gap={4} align="stretch">
// // //                       {messages.length === 0 && (
// // //                         <Box textAlign="center" py={10} color="gray.500">
// // //                           <Text fontSize="xl">👋 Welcome! Ask me anything about your documents.</Text>
// // //                         </Box>
// // //                       )}

// // //                       {messages.map((message) => (
// // //                         <Box
// // //                           key={message.id}
// // //                           alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
// // //                           maxW="80%"
// // //                         >
// // //                           <Card
// // //                             bg={message.type === 'user' ? 'blue.500' : 'gray.100'}
// // //                             color={message.type === 'user' ? 'white' : 'gray.800'}
// // //                             variant="elevated"
// // //                           >
// // //                             <Box>
// // //                               <Text whiteSpace="pre-wrap">
// // //                                 {message.isStreaming ? streamingContent : message.content}
// // //                               </Text>

// // //                               {message.isStreaming && (
// // //                                 <HStack mt={2} gap={2}>
// // //                                   <Spinner size="sm" />
// // //                                   <Text fontSize="sm" opacity={0.8}>
// // //                                     Generating...
// // //                                   </Text>
// // //                                 </HStack>
// // //                               )}

// // //                               {message.sources && message.sources.length > 0 && (
// // //                                 <>
// // //                                   <Separator my={3} />
// // //                                   <Box>
// // //                                     <Text fontSize="sm" fontWeight="bold" mb={2}>
// // //                                       📖 Sources:
// // //                                     </Text>
// // //                                     <List spacing={1}>
// // //                                       {message.sources.map((source) => (
// // //                                         <li key={source.id}>
// // //                                           <Text fontSize="sm">
// // //                                             <Text as="span" mr={2}>•</Text>
// // //                                             {source.source}
// // //                                           </Text>
// // //                                         </li>
// // //                                       ))}
// // //                                     </List>
// // //                                   </Box>
// // //                                 </>
// // //                               )}
// // //                             </Box>
// // //                           </Card>
// // //                         </Box>
// // //                       ))}
// // //                       <div ref={messagesEndRef} />
// // //                     </VStack>
// // //                   </Box>

// // //                   {/* Input */}
// // //                   <Box p={4} bg="gray.50" borderTop="1px" borderColor="gray.200">
// // //                     <form onSubmit={handleSubmit}>
// // //                       <HStack gap={2}>
// // //                         <Input
// // //                           value={input}
// // //                           onChange={(e) => setInput(e.target.value)}
// // //                           placeholder="Ask a question about your documents..."
// // //                           size="lg"
// // //                           bg="white"
// // //                           disabled={isLoading || !selectedChat}
// // //                         />
// // //                         <Button
// // //                           type="submit"
// // //                           colorScheme="blue"
// // //                           size="lg"
// // //                           isLoading={isLoading}
// // //                           disabled={!input.trim() || isLoading || !selectedChat}
// // //                           px={8}
// // //                         >
// // //                           Send ➤
// // //                         </Button>
// // //                       </HStack>
// // //                     </form>
// // //                   </Box>
// // //                 </Box>
// // //               </Flex>
// // //             </Card>
// // //           </VStack>
// // //         </Container>
// // //       </Box>
// // //     </>
// // //   )
// // // }

// // // export default ChatInterface


// // // Replace the ChatInterface component with optimized version:

// // const ChatInterface = () => {
// //   const [messages, setMessages] = useState<Message[]>([])
// //   const [input, setInput] = useState('')
// //   const [isLoading, setIsLoading] = useState(false)
// //   const [streamingContent, setStreamingContent] = useState('')
// //   const [files, setFiles] = useState<FileList | null>(null)
// //   const [chats, setChats] = useState<Array<{chat_id:string,num_messages:number,files:string[]}>>([])
// //   const [selectedChat, setSelectedChat] = useState<string | null>(null)
// //   const [isLoadingChats, setIsLoadingChats] = useState(false)
// //   const messagesEndRef = useRef<HTMLDivElement>(null)
// //   const toast = useToast()
// //   const abortControllerRef = useRef<AbortController | null>(null)

// //   const scrollToBottom = useCallback(() => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
// //   }, [])

// //   useEffect(() => {
// //     scrollToBottom()
// //   }, [messages.length, streamingContent, scrollToBottom])

// //   // Load chats only once on mount
// //   useEffect(() => {
// //     fetchChats()
// //   }, [])

// //   // Load history when chat changes
// //   useEffect(() => {
// //     if (selectedChat) {
// //       loadChatHistory(selectedChat)
// //     }
// //   }, [selectedChat])

// //   const fetchChats = useCallback(async () => {
// //     setIsLoadingChats(true)
// //     try {
// //       const res = await fetch(`${API_URL}/chats`)
// //       if (!res.ok) return
// //       const data = await res.json()
// //       setChats(data)
      
// //       // Auto-select first chat if none selected
// //       if (data.length > 0 && !selectedChat) {
// //         setSelectedChat(data[0].chat_id)
// //       }
// //     } catch (e) {
// //       console.warn('Failed to fetch chats', e)
// //     } finally {
// //       setIsLoadingChats(false)
// //     }
// //   }, [selectedChat])

// //   const loadChatHistory = useCallback(async (chatId: string) => {
// //     try {
// //       const res = await fetch(`${API_URL}/chats/${chatId}/history`)
// //       if (!res.ok) return
// //       const data = await res.json()
      
// //       const msgs: Message[] = data.history.map((h: any, idx: number) => ({
// //         id: `${chatId}-${idx}`,
// //         type: h.role === 'user' ? 'user' : 'assistant',
// //         content: h.content,
// //         sources: h.sources,
// //         isStreaming: false,
// //       }))
// //       setMessages(msgs)
// //     } catch (e) {
// //       console.warn('Failed to load history', e)
// //       setMessages([])
// //     }
// //   }, [])

// //   const handleStream = useCallback(async (question: string) => {
// //     // Cancel any ongoing request
// //     if (abortControllerRef.current) {
// //       abortControllerRef.current.abort()
// //     }
// //     abortControllerRef.current = new AbortController()

// //     const userMessage: Message = {
// //       id: Date.now().toString(),
// //       type: 'user',
// //       content: question,
// //     }

// //     const assistantMessage: Message = {
// //       id: (Date.now() + 1).toString(),
// //       type: 'assistant',
// //       content: '',
// //       isStreaming: true,
// //     }

// //     setMessages((prev) => [...prev, userMessage, assistantMessage])
// //     setIsLoading(true)
// //     setStreamingContent('')

// //     try {
// //       const response = await fetch(`${API_URL}/query`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({
// //           question,
// //           k: 10,
// //           stream: true,
// //           chat_id: selectedChat,
// //         }),
// //         signal: abortControllerRef.current.signal,
// //       })

// //       if (!response.ok) throw new Error('Failed to fetch')

// //       const reader = response.body?.getReader()
// //       const decoder = new TextDecoder()
// //       let accumulatedContent = ''
// //       let sources: Source[] = []

// //       if (reader) {
// //         while (true) {
// //           const { done, value } = await reader.read()
// //           if (done) break

// //           const chunk = decoder.decode(value)
// //           const lines = chunk.split('\n\n')

// //           for (const line of lines) {
// //             if (line.startsWith('data: ')) {
// //               const data = line.substring(6)
// //               try {
// //                 const parsed = JSON.parse(data)

// //                 if (parsed.type === 'content') {
// //                   accumulatedContent += parsed.content
// //                   setStreamingContent(accumulatedContent)
// //                 } else if (parsed.type === 'sources') {
// //                   sources = parsed.content
// //                 } else if (parsed.type === 'done') {
// //                   setMessages((prev) => {
// //                     const newMessages = [...prev]
// //                     const lastMessage = newMessages[newMessages.length - 1]
// //                     if (lastMessage.type === 'assistant') {
// //                       lastMessage.content = accumulatedContent
// //                       lastMessage.sources = sources
// //                       lastMessage.isStreaming = false
// //                     }
// //                     return newMessages
// //                   })
// //                   setStreamingContent('')
// //                 } else if (parsed.type === 'error') {
// //                   throw new Error(parsed.content)
// //                 }
// //               } catch (e) {
// //                 if (e instanceof Error && e.name !== 'AbortError') {
// //                   console.error('Parse error:', e)
// //                 }
// //               }
// //             }
// //           }
// //         }
// //       }
// //     } catch (error) {
// //       if (error instanceof Error && error.name === 'AbortError') {
// //         console.log('Request cancelled')
// //         return
// //       }

// //       toast({
// //         title: 'Error',
// //         description: error instanceof Error ? error.message : 'Failed to get response',
// //         status: 'error',
// //         duration: 5000,
// //       })

// //       setMessages((prev) => {
// //         const newMessages = [...prev]
// //         const lastMessage = newMessages[newMessages.length - 1]
// //         if (lastMessage.type === 'assistant') {
// //           lastMessage.content = 'Sorry, I encountered an error processing your request.'
// //           lastMessage.isStreaming = false
// //         }
// //         return newMessages
// //       })
// //       setStreamingContent('')
// //     } finally {
// //       setIsLoading(false)
// //       abortControllerRef.current = null
// //     }
// //   }, [selectedChat, toast])

// //   const handleSubmit = useCallback((e: React.FormEvent) => {
// //     e.preventDefault()
// //     if (!input.trim() || isLoading) return
// //     handleStream(input.trim())
// //     setInput('')
// //   }, [input, isLoading, handleStream])

// //   const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
// //     setFiles(e.target.files)
// //   }, [])

// //   const handleUpload = useCallback(async () => {
// //     if (!files || files.length === 0) {
// //       toast({ title: 'No files selected', status: 'warning', duration: 3000 })
// //       return
// //     }

// //     const fd = new FormData()
// //     Array.from(files).forEach((f) => fd.append('files', f))

// //     try {
// //       const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
// //       if (!res.ok) {
// //         const err = await res.text()
// //         throw new Error(err)
// //       }
// //       const data = await res.json()
// //       toast({
// //         title: 'Upload successful',
// //         description: `Chat created with ${data.num_documents} documents`,
// //         status: 'success',
// //         duration: 3000
// //       })
      
// //       await fetchChats()
// //       setSelectedChat(data.chat_id)
// //       setFiles(null)
      
// //       // Reset file input
// //       const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
// //       if (fileInput) fileInput.value = ''
      
// //     } catch (e) {
// //       toast({
// //         title: 'Upload failed',
// //         description: e instanceof Error ? e.message : 'Upload error',
// //         status: 'error',
// //         duration: 5000
// //       })
// //     }
// //   }, [files, toast, fetchChats])

// //   const handleChatSelect = useCallback((chatId: string) => {
// //     if (chatId !== selectedChat) {
// //       setSelectedChat(chatId)
// //     }
// //   }, [selectedChat])

// //   // Memoize chat list to prevent unnecessary re-renders
// //   const chatList = useMemo(() => (
// //     <Stack spacing={2} overflowY="auto" maxH="36vh">
// //       {chats.length === 0 && !isLoadingChats && (
// //         <Text color="gray.500">No chats yet — upload documents to start.</Text>
// //       )}
// //       {isLoadingChats && <Spinner size="sm" />}
// //       {chats.map((c) => (
// //         <Box
// //           key={c.chat_id}
// //           p={3}
// //           borderRadius="md"
// //           bg={selectedChat === c.chat_id ? 'blue.50' : 'transparent'}
// //           cursor="pointer"
// //           onClick={() => handleChatSelect(c.chat_id)}
// //           _hover={{ bg: selectedChat === c.chat_id ? 'blue.50' : 'gray.50' }}
// //         >
// //           <VStack align="start" spacing={1}>
// //             <HStack justify="space-between" w="100%">
// //               <Text isTruncated maxW="180px" fontWeight="medium">{c.chat_id.slice(0, 8)}...</Text>
// //               <Badge>{c.num_messages}</Badge>
// //             </HStack>
// //             {c.files && c.files.length > 0 && (
// //               <Text fontSize="xs" color="gray.600" isTruncated maxW="100%">
// //                 📄 {c.files.length} file{c.files.length > 1 ? 's' : ''}
// //               </Text>
// //             )}
// //           </VStack>
// //         </Box>
// //       ))}
// //     </Stack>
// //   ), [chats, selectedChat, isLoadingChats, handleChatSelect])

// //   // Rest of the JSX remains the same, just replace the chat list section with {chatList}
// //   // ... (keep the return statement as is, but use the memoized chatList)
  
// //   return (
// //     <Box minH="100vh" bg="gray.50" py={8}>
// //       <Container maxW="container.xl">
// //         <VStack gap={6} align="stretch">
// //           <Box textAlign="center">
// //             <Heading size="4xl" mb={2} color="blue.600">
// //               📚 RAG Document Assistant
// //             </Heading>
// //             <Text color="gray.600" fontSize="lg">
// //               Ask questions about your documents
// //             </Text>
// //           </Box>
          
// //           <Card bg="white" shadow="lg" borderRadius="xl" overflow="hidden" h="72vh">
// //             <Flex h="100%">
// //               <Box w="320px" borderRight="1px solid" borderColor="gray.100" p={4}>
// //                 <VStack align="stretch" spacing={4}>
// //                   <HStack>
// //                     <Avatar name="User" size="sm" />
// //                     <Heading size="md">Chats</Heading>
// //                     <Button onClick={fetchChats} size="sm" ml="auto" isLoading={isLoadingChats}>
// //                       Refresh
// //                     </Button>
// //                   </HStack>

// //                   {chatList}

// //                   <Separator />

// //                   <Box>
// //                     <Text fontSize="sm" mb={2}>Upload PDFs to create a new chat</Text>
// //                     <Input type="file" multiple accept="application/pdf" onChange={handleFileChange} mb={2} size="sm" />
// //                     <Button
// //                       colorScheme="blue"
// //                       onClick={handleUpload}
// //                       isDisabled={!files || files.length === 0}
// //                       size="sm"
// //                       w="100%"
// //                     >
// //                       Upload & Create Chat
// //                     </Button>
// //                   </Box>
// //                 </VStack>
// //               </Box>

// //               <Box flex={1} display="flex" flexDirection="column">
// //                 <Box p={4} borderBottom="1px solid" borderColor="gray.100">
// //                   <HStack>
// //                     <Heading size="md">
// //                       {selectedChat ? `Chat: ${selectedChat.slice(0, 8)}...` : 'No chat selected'}
// //                     </Heading>
// //                     {selectedChat && <Badge colorScheme="green">Active</Badge>}
// //                   </HStack>
// //                 </Box>

// //                 <Box flex={1} overflowY="auto" p={6}>
// //                   <VStack gap={4} align="stretch">
// //                     {messages.length === 0 && (
// //                       <Box textAlign="center" py={10} color="gray.500">
// //                         <Text fontSize="xl">👋 Welcome! Ask me anything about your documents.</Text>
// //                       </Box>
// //                     )}

// //                     {messages.map((message) => (
// //                       <Box
// //                         key={message.id}
// //                         alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
// //                         maxW="80%"
// //                       >
// //                         <Card
// //                           bg={message.type === 'user' ? 'blue.500' : 'gray.100'}
// //                           color={message.type === 'user' ? 'white' : 'gray.800'}
// //                           variant="elevated"
// //                         >
// //                           <Box>
// //                             <Text whiteSpace="pre-wrap">
// //                               {message.isStreaming ? streamingContent : message.content}
// //                             </Text>

// //                             {message.isStreaming && (
// //                               <HStack mt={2} gap={2}>
// //                                 <Spinner size="sm" />
// //                                 <Text fontSize="sm" opacity={0.8}>
// //                                   Generating...
// //                                 </Text>
// //                               </HStack>
// //                             )}

// //                             {message.sources && message.sources.length > 0 && (
// //                               <>
// //                                 <Separator my={3} />
// //                                 <Box>
// //                                   <Text fontSize="sm" fontWeight="bold" mb={2}>
// //                                     📖 Sources:
// //                                   </Text>
// //                                   <List spacing={1}>
// //                                     {message.sources.map((source) => (
// //                                       <li key={source.id}>
// //                                         <Text fontSize="sm">
// //                                           <Text as="span" mr={2}>•</Text>
// //                                           {source.source}
// //                                         </Text>
// //                                       </li>
// //                                     ))}
// //                                   </List>
// //                                 </Box>
// //                               </>
// //                             )}
// //                           </Box>
// //                         </Card>
// //                       </Box>
// //                     ))}
// //                     <div ref={messagesEndRef} />
// //                   </VStack>
// //                 </Box>

// //                 <Box p={4} bg="gray.50" borderTop="1px" borderColor="gray.200">
// //                   <form onSubmit={handleSubmit}>
// //                     <HStack gap={2}>
// //                       <Input
// //                         value={input}
// //                         onChange={(e) => setInput(e.target.value)}
// //                         placeholder="Ask a question about your documents..."
// //                         size="lg"
// //                         bg="white"
// //                         disabled={isLoading || !selectedChat}
// //                       />
// //                       <Button
// //                         type="submit"
// //                         colorScheme="blue"
// //                         size="lg"
// //                         isLoading={isLoading}
// //                         disabled={!input.trim() || isLoading || !selectedChat}
// //                         px={8}
// //                       >
// //                         Send ➤
// //                       </Button>
// //                     </HStack>
// //                   </form>
// //                 </Box>
// //               </Box>
// //             </Flex>
// //           </Card>
// //         </VStack>
// //       </Container>
// //     </Box>
// //   )
// // }

// // export default ChatInterface

// // ChatInterface.tsx (updated for prettier UI)
// // I've made the following improvements:
// // - Enhanced color scheme using brand colors
// // - Added subtle gradients and shadows for depth
// // - Improved spacing and layout for better readability
// // - Added user/assistant avatars in chat bubbles
// // - Better hover effects and transitions
// // - Modernized header with gradient text
// // - Refined sidebar with dividers and better truncation
// // - Added subtle animations for loading and streaming
// // - Kept it simple without extra dependencies

// import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// import {
//   Box,
//   Container,
//   VStack,
//   HStack,
//   Input,
//   Button,
//   Text,
//   Heading,
//   Card,
//   Spinner,
//   Divider as Separator,
//   List,
//   useToast,
//   Flex,
//   Badge,
//   Stack,
//   Avatar,
//   AvatarBadge,
//   useColorModeValue,
//   ScaleFade,
// } from '@chakra-ui/react'
// // icons are intentionally omitted to avoid extra deps; use simple buttons instead

// interface Message {
//   id: string
//   type: 'user' | 'assistant'
//   content: string
//   sources?: Source[]
//   isStreaming?: boolean
// }

// interface Source {
//   id: number
//   source: string
//   parent_chunk: string
// }

// const API_URL = 'http://localhost:8000'

// const ChatInterface = () => {
//   const [messages, setMessages] = useState<Message[]>([])
//   const [input, setInput] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const [streamingContent, setStreamingContent] = useState('')
//   const [files, setFiles] = useState<FileList | null>(null)
//   const [chats, setChats] = useState<Array<{chat_id:string, num_messages:number, files?: string[]}>>([])
//   const [selectedChat, setSelectedChat] = useState<string | null>(null)
//   const [isLoadingChats, setIsLoadingChats] = useState(false)
//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const toast = useToast()
//   const abortControllerRef = useRef<AbortController | null>(null)

//   const bgGradient = useColorModeValue('linear(to-r, gray.50, gray.100)', 'linear(to-r, gray.700, gray.800)')
//   const chatBubbleBg = useColorModeValue('white', 'gray.700')
//   const userBubbleBg = 'brand.500'
//   const assistantBubbleBg = 'gray.100'

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [messages, streamingContent])

//   const fetchChats = useCallback(async () => {
//     setIsLoadingChats(true)
//     try {
//       const res = await fetch(`${API_URL}/chats`)
//       if (!res.ok) return
//       const data = await res.json()
//       setChats(data)
//       if (data.length > 0 && !selectedChat) setSelectedChat(data[0].chat_id)
//     } catch (e) {
//       console.warn('Failed to fetch chats', e)
//     } finally {
//       setIsLoadingChats(false)
//     }
//   }, [selectedChat])

//   useEffect(() => {
//     fetchChats()
//   }, [fetchChats])

//   useEffect(() => {
//     if (selectedChat) {
//       loadChatHistory(selectedChat)
//     } else {
//       setMessages([])
//     }
//   }, [selectedChat])

//   const loadChatHistory = async (chatId: string) => {
//     try {
//       const res = await fetch(`${API_URL}/chats/${chatId}/history`)
//       if (!res.ok) return
//       const data = await res.json()
//       // Convert history to messages
//       const msgs: Message[] = data.history.map((h: any, idx: number) => ({
//         id: `${chatId}-${idx}`,
//         type: h.role === 'user' ? 'user' : 'assistant',
//         content: h.content,
//         sources: h.sources,
//         isStreaming: false,
//       }))
//       setMessages(msgs)
//     } catch (e) {
//       console.warn('Failed to load history', e)
//     }
//   }

//   const handleStream = useCallback(async (question: string) => {
//     const userMessage: Message = {
//       id: Date.now().toString(),
//       type: 'user',
//       content: question,
//     }

//     const assistantMessage: Message = {
//       id: (Date.now() + 1).toString(),
//       type: 'assistant',
//       content: '',
//       isStreaming: true,
//     }

//     setMessages((prev) => [...prev, userMessage, assistantMessage])
//     setIsLoading(true)
//     setStreamingContent('')

//     abortControllerRef.current = new AbortController()

//     try {
//       const response = await fetch(`${API_URL}/query`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           question,
//           k: 10,
//           stream: true,
//           chat_id: selectedChat,
//         }),
//         signal: abortControllerRef.current.signal,
//       })

//       if (!response.ok) {
//         throw new Error('Failed to fetch')
//       }

//       const reader = response.body?.getReader()
//       const decoder = new TextDecoder()
//       let accumulatedContent = ''
//       let sources: Source[] = []

//       if (reader) {
//         while (true) {
//           const { done, value } = await reader.read()
//           if (done) break

//           const chunk = decoder.decode(value)
//           const lines = chunk.split('\n\n')

//           for (const line of lines) {
//             if (line.startsWith('data: ')) {
//               const data = line.substring(6)

//               try {
//                 const parsed = JSON.parse(data)

//                 if (parsed.type === 'content') {
//                   accumulatedContent += parsed.content
//                   setStreamingContent(accumulatedContent)
//                 } else if (parsed.type === 'status') {
//                   console.log('Status:', parsed.content)
//                 } else if (parsed.type === 'sources') {
//                   sources = parsed.content
//                 } else if (parsed.type === 'done') {
//                   setMessages((prev) => {
//                     const newMessages = [...prev]
//                     const lastMessage = newMessages[newMessages.length - 1]
//                     if (lastMessage.type === 'assistant') {
//                       lastMessage.content = accumulatedContent
//                       lastMessage.sources = sources
//                       lastMessage.isStreaming = false
//                     }
//                     return newMessages
//                   })
//                   setStreamingContent('')
//                 } else if (parsed.type === 'error') {
//                   throw new Error(parsed.content)
//                 }
//               } catch (e) {
//                 console.error('Parse error:', e)
//               }
//             }
//           }
//         }
//       }
//     } catch (error: any) {
//       if (error.name === 'AbortError') return
//       toast({
//         title: 'Error',
//         description: error.message || 'Failed to get response',
//         status: 'error',
//         duration: 5000,
//       })

//       setMessages((prev) => {
//         const newMessages = [...prev]
//         const lastMessage = newMessages[newMessages.length - 1]
//         if (lastMessage.type === 'assistant') {
//           lastMessage.content = 'Sorry, I encountered an error processing your request.'
//           lastMessage.isStreaming = false
//         }
//         return newMessages
//       })
//       setStreamingContent('')
//     } finally {
//       setIsLoading(false)
//       abortControllerRef.current = null
//     }
//   }, [selectedChat, toast])

//   const handleSubmit = useCallback((e: React.FormEvent) => {
//     e.preventDefault()
//     if (!input.trim() || isLoading) return
//     handleStream(input.trim())
//     setInput('')
//   }, [input, isLoading, handleStream])

//   const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     setFiles(e.target.files)
//   }, [])

//   const handleUpload = useCallback(async () => {
//     if (!files || files.length === 0) {
//       toast({ title: 'No files selected', status: 'warning', duration: 3000 })
//       return
//     }

//     const fd = new FormData()
//     Array.from(files).forEach((f) => fd.append('files', f))

//     try {
//       const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
//       if (!res.ok) {
//         const err = await res.text()
//         throw new Error(err)
//       }
//       const data = await res.json()
//       toast({
//         title: 'Upload successful',
//         description: `Chat created with ${data.num_documents} documents`,
//         status: 'success',
//         duration: 3000
//       })
      
//       await fetchChats()
//       setSelectedChat(data.chat_id)
//       setFiles(null)
      
//       // Reset file input
//       const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
//       if (fileInput) fileInput.value = ''
      
//     } catch (e) {
//       toast({
//         title: 'Upload failed',
//         description: e instanceof Error ? e.message : 'Upload error',
//         status: 'error',
//         duration: 5000
//       })
//     }
//   }, [files, toast, fetchChats])

//   const handleChatSelect = useCallback((chatId: string) => {
//     if (chatId !== selectedChat) {
//       setSelectedChat(chatId)
//     }
//   }, [selectedChat])

//   // Memoize chat list to prevent unnecessary re-renders
//   const chatList = useMemo(() => (
//     <Stack spacing={3} overflowY="auto" maxH="36vh" pr={2}>
//       {chats.length === 0 && !isLoadingChats && (
//         <Text color="gray.500" textAlign="center">No chats yet — upload documents to start.</Text>
//       )}
//       {isLoadingChats && <Spinner size="sm" mx="auto" display="block" />}
//       {chats.map((c) => (
//         <Box
//           key={c.chat_id}
//           p={4}
//           borderRadius="lg"
//           bg={selectedChat === c.chat_id ? 'brand.50' : 'transparent'}
//           cursor="pointer"
//           onClick={() => handleChatSelect(c.chat_id)}
//           _hover={{ bg: selectedChat === c.chat_id ? 'brand.50' : 'gray.100', transition: 'all 0.2s' }}
//           transition="all 0.2s"
//         >
//           <VStack align="start" spacing={1}>
//             <HStack justify="space-between" w="100%">
//               <Text isTruncated maxW="180px" fontWeight="semibold">{c.chat_id.slice(0, 20)}...</Text>
//               <Badge colorScheme="brand" variant="solid">{c.num_messages}</Badge>
//             </HStack>
//             {c.files && c.files.length > 0 && (
//               <Text fontSize="xs" color="gray.600" isTruncated maxW="100%">
//                 📄 {c.files.length} file{c.files.length > 1 ? 's' : ''}
//               </Text>
//             )}
//           </VStack>
//         </Box>
//       ))}
//     </Stack>
//   ), [chats, selectedChat, isLoadingChats, handleChatSelect])

//   return (
//     <Box minH="100vh" bgGradient={bgGradient} py={12}>
//       <Container maxW="container.xl">
//         <VStack spacing={8} align="stretch">
//           {/* Enhanced Header */}
//           <Box textAlign="center" py={6} bg="white" borderRadius="2xl" shadow="xl">
//             <Heading
//               size="3xl"
//               mb={3}
//               bgGradient="linear(to-r, brand.400, brand.600)"
//               bgClip="text"
//             >
//               📚 RAG Document Assistant
//             </Heading>
//             <Text color="gray.600" fontSize="xl" fontWeight="medium">
//               Ask intelligent questions about your documents with AI-powered insights
//             </Text>
//           </Box>
          
//           {/* Main Card with subtle shadow and rounded corners */}
//           <Card bg="white" shadow="2xl" borderRadius="2xl" overflow="hidden" h="70vh">
//             <Flex h="100%">
//               {/* Sidebar with gradient border */}
//               <Box 
//                 w="320px" 
//                 borderRight="1px" 
//                 borderColor="transparent"
//                 bgGradient="linear(to-b, white, gray.50)"
//                 p={6}
//                 boxShadow="inner"
//               >
//                 <VStack align="stretch" spacing={6}>
//                   <HStack justify="space-between">
//                     <HStack spacing={3}>
//                       <Avatar name="User" size="md" bg="brand.500">
//                         <AvatarBadge boxSize="1.25em" bg="green.500" />
//                       </Avatar>
//                       <Heading size="lg" color="brand.600">Chats</Heading>
//                     </HStack>
//                     <Button onClick={fetchChats} size="sm" variant="outline" colorScheme="brand" isLoading={isLoadingChats}>
//                       Refresh
//                     </Button>
//                   </HStack>

//                   {chatList}

//                   <Separator />

//                   <Box>
//                     <Text fontSize="md" fontWeight="medium" mb={3} color="gray.700">Upload PDFs to start a new chat</Text>
//                     <Input 
//                       type="file" 
//                       multiple 
//                       accept="application/pdf" 
//                       onChange={handleFileChange} 
//                       mb={3} 
//                       variant="filled"
//                       bg="gray.50"
//                       _hover={{ bg: 'gray.100' }}
//                     />
//                     <Button
//                       colorScheme="brand"
//                       onClick={handleUpload}
//                       isDisabled={!files || files.length === 0}
//                       size="md"
//                       w="100%"
//                       shadow="md"
//                       _hover={{ transform: 'translateY(-2px)', transition: 'all 0.2s' }}
//                       transition="all 0.2s"
//                     >
//                       Upload & Create Chat
//                     </Button>
//                   </Box>
//                 </VStack>
//               </Box>

//               {/* Main Chat Area */}
//               <Box flex={1} display="flex" flexDirection="column">
//                 <Box p={6} borderBottom="1px solid" borderColor="gray.100" bg="white">
//                   <HStack spacing={4}>
//                     <Heading size="lg" color="brand.600">
//                       {selectedChat ? `Chat: ${selectedChat.slice(0, 20)}...` : 'Select a chat to begin'}
//                     </Heading>
//                     {selectedChat && <Badge colorScheme="green" variant="solid" fontSize="md" px={3}>Active</Badge>}
//                   </HStack>
//                 </Box>

//                 <Box flex={1} overflowY="auto" p={8} bg="gray.50">
//                   <VStack spacing={6} align="stretch">
//                     {messages.length === 0 && (
//                       <ScaleFade initialScale={0.9} in={true}>
//                         <Box textAlign="center" py={20} bg="white" borderRadius="xl" shadow="md">
//                           <Text fontSize="2xl" fontWeight="medium" color="gray.600">👋 Welcome!</Text>
//                           <Text fontSize="lg" color="gray.500" mt={2}>Select or create a chat and ask anything about your documents.</Text>
//                         </Box>
//                       </ScaleFade>
//                     )}

//                     {messages.map((message) => (
//                       <ScaleFade key={message.id} initialScale={0.95} in={true}>
//                         <Flex
//                           justify={message.type === 'user' ? 'flex-end' : 'flex-start'}
//                         >
//                           <HStack
//                             spacing={4}
//                             maxW="80%"
//                             align="start"
//                           >
//                             {message.type === 'assistant' && (
//                               <Avatar size="sm" name="Assistant" bg="gray.400" />
//                             )}
//                             <Card
//                               bg={message.type === 'user' ? userBubbleBg : assistantBubbleBg}
//                               color={message.type === 'user' ? 'white' : 'gray.800'}
//                               p={4}
//                               borderRadius="xl"
//                               shadow="md"
//                               _hover={{ shadow: 'lg', transition: 'all 0.2s' }}
//                               transition="all 0.2s"
//                             >
//                               <Text whiteSpace="pre-wrap" fontSize="md">
//                                 {message.isStreaming ? streamingContent : message.content}
//                               </Text>

//                               {message.isStreaming && (
//                                 <HStack mt={3} spacing={3}>
//                                   <Spinner size="sm" color="brand.500" />
//                                   <Text fontSize="sm" opacity={0.8} color="brand.600">
//                                     Generating response...
//                                   </Text>
//                                 </HStack>
//                               )}

//                               {message.sources && message.sources.length > 0 && (
//                                 <>
//                                   <Separator my={4} />
//                                   <Box>
//                                     <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.600">
//                                       📖 Sources:
//                                     </Text>
//                                     <List spacing={2}>
//                                       {message.sources.map((source) => (
//                                         <li key={source.id}>
//                                           <Text fontSize="sm" color="gray.700">
//                                             <Text as="span" fontWeight="medium" mr={2}>•</Text>
//                                             {source.source}
//                                           </Text>
//                                         </li>
//                                       ))}
//                                     </List>
//                                   </Box>
//                                 </>
//                               )}
//                             </Card>
//                             {message.type === 'user' && (
//                               <Avatar size="sm" name="User" bg="brand.500" />
//                             )}
//                           </HStack>
//                         </Flex>
//                       </ScaleFade>
//                     ))}
//                     <div ref={messagesEndRef} />
//                   </VStack>
//                 </Box>

//                 <Box p={6} bg="white" borderTop="1px" borderColor="gray.100" shadow="inner">
//                   <form onSubmit={handleSubmit}>
//                     <HStack spacing={4}>
//                       <Input
//                         value={input}
//                         onChange={(e) => setInput(e.target.value)}
//                         placeholder="Type your question here..."
//                         size="lg"
//                         bg="gray.50"
//                         border="none"
//                         _focus={{ bg: 'white', shadow: 'inner' }}
//                         disabled={isLoading || !selectedChat}
//                         shadow="md"
//                         borderRadius="xl"
//                       />
//                       <Button
//                         type="submit"
//                         colorScheme="brand"
//                         size="lg"
//                         isLoading={isLoading}
//                         disabled={!input.trim() || isLoading || !selectedChat}
//                         px={8}
//                         shadow="md"
//                         _hover={{ transform: 'translateY(-2px)', transition: 'all 0.2s' }}
//                         transition="all 0.2s"
//                       >
//                         Send ➤
//                       </Button>
//                     </HStack>
//                   </form>
//                 </Box>
//               </Box>
//             </Flex>
//           </Card>
//         </VStack>
//       </Container>
//     </Box>
//   )
// }

// export default ChatInterface

// src/components/ChatInterface.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
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
  Divider as Sep,
  List,
  useToast,
  Flex,
  Badge,
  Stack,
  Avatar,
  Switch,
  IconButton,
  Tooltip,
  ScaleFade,
} from '@chakra-ui/react'
import { FiSend, FiRefreshCw } from 'react-icons/fi'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
  showPrompt?: boolean
}

interface Source {
  id: number
  source: string
  parent_chunk: string
}

const API_URL = 'http://localhost:8000'

export default function ChatInterface() {
  /* -------------------------- STATE -------------------------- */
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [chats, setChats] = useState<
    Array<{ chat_id: string; num_messages: number; files?: string[] }>
  >([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortCtrl = useRef<AbortController | null>(null)
  const toast = useToast()

  /* -------------------------- HELPERS -------------------------- */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => scrollToBottom(), [messages, streamingContent])

  /* -------------------------- CHATS -------------------------- */
  const fetchChats = useCallback(async () => {
    setIsLoadingChats(true)
    try {
      const res = await fetch(`${API_URL}/chats`)
      if (!res.ok) return
      const data = await res.json()
      setChats(data)
      if (data.length && !selectedChat) setSelectedChat(data[0].chat_id)
    } catch {
      /* ignore */
    } finally {
      setIsLoadingChats(false)
    }
  }, [selectedChat])

  useEffect(() => { fetchChats() }, [fetchChats])

  const loadChatHistory = async (chatId: string) => {
    try {
      const res = await fetch(`${API_URL}/chats/${chatId}/history`)
      if (!res.ok) return
      const { history } = await res.json()
      const msgs: Message[] = history.map((h: any, i: number) => ({
        id: `${chatId}-${i}`,
        type: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
        sources: h.sources,
        showPrompt: false,
      }))
      setMessages(msgs)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (selectedChat) loadChatHistory(selectedChat)
    else setMessages([])
  }, [selectedChat])

  /* -------------------------- STREAMING -------------------------- */
  const handleStream = useCallback(
    async (question: string) => {
      const userMsg: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: question,
      }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '',
        isStreaming: true,
        showPrompt: false,
      }

      setMessages(p => [...p, userMsg, assistantMsg])
      setIsLoading(true)
      setStreamingContent('')

      abortCtrl.current = new AbortController()

      try {
        const resp = await fetch(`${API_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            k: 10,
            stream: true,
            chat_id: selectedChat,
          }),
          signal: abortCtrl.current.signal,
        })

        if (!resp.ok) throw new Error('Network error')

        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        let sources: Source[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content') {
                acc += parsed.content
                setStreamingContent(acc)
              } else if (parsed.type === 'sources') {
                sources = parsed.content
              } else if (parsed.type === 'done') {
                setMessages(p => {
                  const copy = [...p]
                  const last = copy[copy.length - 1]
                  if (last.type === 'assistant') {
                    last.content = acc
                    last.sources = sources
                    last.isStreaming = false
                  }
                  return copy
                })
                setStreamingContent('')
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast({
            title: 'Error',
            description: err.message || 'Something went wrong',
            status: 'error',
          })
          setMessages(p => {
            const copy = [...p]
            const last = copy[copy.length - 1]
            if (last.type === 'assistant') {
              last.content = 'Sorry, I hit an error.'
              last.isStreaming = false
            }
            return copy
          })
        }
      } finally {
        setIsLoading(false)
        abortCtrl.current = null
      }
    },
    [selectedChat, toast]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !selectedChat) return
    handleStream(input.trim())
    setInput('')
  }

  /* -------------------------- FILE UPLOAD -------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }

  const handleUpload = async () => {
    if (!files?.length) return
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))

    try {
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { chat_id } = await res.json()
      toast({ title: 'Upload successful', status: 'success' })
      await fetchChats()
      setSelectedChat(chat_id)
      setFiles(null)
      ;(document.querySelector('input[type="file"]') as HTMLInputElement).value = ''
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' })
    }
  }

  /* -------------------------- CHAT LIST -------------------------- */
  const chatList = useMemo(
    () => (
      <Stack spacing={2} overflowY="auto" maxH="calc(100vh - 340px)" pr={2}>
        {chats.length === 0 && !isLoadingChats && (
          <Text color="gray.500" fontSize="sm">
            No chats – upload PDFs to start.
          </Text>
        )}
        {isLoadingChats && <Spinner size="sm" mx="auto" />}
        {chats.map(c => (
          <Box
            key={c.chat_id}
            p={3}
            borderRadius="md"
            bg={selectedChat === c.chat_id ? 'brand.50' : 'transparent'}
            cursor="pointer"
            _hover={{
              bg: selectedChat === c.chat_id ? 'brand.50' : 'gray.100',
            }}
            onClick={() => setSelectedChat(c.chat_id)}
            transition="background 0.2s"
          >
            <HStack justify="space-between">
              <Text
                fontWeight="medium"
                isTruncated
                maxW="180px"
                fontSize="sm"
              >
                {c.chat_id.slice(0, 12)}…
              </Text>
              <Badge colorScheme="brand" variant="solid">
                {c.num_messages}
              </Badge>
            </HStack>
            {c.files?.length ? (
              <Text fontSize="xs" color="gray.600">
                {c.files.length} file{c.files.length > 1 ? 's' : ''}
              </Text>
            ) : null}
          </Box>
        ))}
      </Stack>
    ),
    [chats, selectedChat, isLoadingChats]
  )

  /* -------------------------- RENDER -------------------------- */
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="container.xl" py={6}>
        <Flex h="85vh" gap={0} shadow="lg" borderRadius="lg" overflow="hidden">
          {/* ---------- LEFT SIDEBAR ---------- */}
          <Box w="320px" bg="white" borderRight="1px" borderColor="gray.200" p={4}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="md" color="brand.600">
                  Chats
                </Heading>
                <IconButton
                  aria-label="Refresh"
                  icon={<FiRefreshCw />}
                  size="sm"
                  variant="ghost"
                  onClick={fetchChats}
                  isLoading={isLoadingChats}
                />
              </HStack>

              {chatList}

              <Sep />

              <Box>
                <Text fontSize="sm" mb={2} fontWeight="medium">
                  Upload PDFs
                </Text>
                <Input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileChange}
                  size="sm"
                  mb={2}
                />
                <Button
                  colorScheme="brand"
                  size="sm"
                  w="full"
                  onClick={handleUpload}
                  isDisabled={!files?.length}
                >
                  Create Chat
                </Button>
              </Box>
            </VStack>
          </Box>

          {/* ---------- MAIN CHAT AREA ---------- */}
          <Box flex={1} display="flex" flexDir="column" bg="white">
            {/* Header */}
            <Box p={4} borderBottom="1px" borderColor="gray.200">
              <HStack>
                <Heading size="md" color="brand.600">
                  {selectedChat
                    ? `Chat: ${selectedChat.slice(0, 12)}…`
                    : 'Select a chat'}
                </Heading>
                {selectedChat && (
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
                      Select or create a chat to start asking questions.
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
                          {/* Prompt toggle */}
                          {msg.type === 'assistant' && (
                            <HStack mb={2} justify="space-between">
                              <Tooltip label="Show the system prompt that generated this answer">
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  leftIcon={<Avatar size="xs" name="Prompt" />}
                                  onClick={() =>
                                    setMessages(p =>
                                      p.map(m =>
                                        m.id === msg.id
                                          ? { ...m, showPrompt: !m.showPrompt }
                                          : m
                                      )
                                    )
                                  }
                                >
                                  Display Prompt
                                </Button>
                              </Tooltip>
                              <Switch
                                size="sm"
                                isChecked={!!msg.showPrompt}
                                onChange={() =>
                                  setMessages(p =>
                                    p.map(m =>
                                      m.id === msg.id
                                        ? { ...m, showPrompt: !m.showPrompt }
                                        : m
                                    )
                                  )
                                }
                              />
                            </HStack>
                          )}

                          {/* Message text */}
                          <Text whiteSpace="pre-wrap">
                            {msg.isStreaming ? streamingContent : msg.content}
                          </Text>

                          {/* Streaming indicator */}
                          {msg.isStreaming && (
                            <HStack mt={2}>
                              <Spinner size="sm" color="brand.500" />
                              <Text fontSize="sm" opacity={0.8}>
                                Generating…
                              </Text>
                            </HStack>
                          )}

                          {/* Sources */}
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

                          {/* Prompt (if toggled) */}
                          {msg.showPrompt && (
                            <Box mt={3} p={2} bg="gray.100" borderRadius="md">
                              <Text fontSize="xs" color="gray.600">
                                <strong>Prompt:</strong> {msg.content}
                              </Text>
                            </Box>
                          )}
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
              <form onSubmit={handleSubmit}>
                <HStack>
                  <Input
                    placeholder="Ask a question about your documents…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isLoading || !selectedChat}
                    flex={1}
                  />
                  <IconButton
                    aria-label="Send"
                    icon={<FiSend />}
                    type="submit"
                    colorScheme="brand"
                    isLoading={isLoading}
                    disabled={!input.trim() || isLoading || !selectedChat}
                  />
                </HStack>
              </form>
            </Box>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}