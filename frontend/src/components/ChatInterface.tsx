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
  Flex,
  useToast,
  useDisclosure,
  Input, // Keep Input for the hidden file input
} from '@chakra-ui/react'
import Sidebar from './SideBar' 
import ChatWindow from './ChatWindow'

// Define types
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

interface Chat {
  chat_id: string
  title: string
  num_messages: number
  files?: string[]
}

const API_URL = 'http://localhost:8000'

export default function ChatInterface() {
  /* -------------------------- STATE -------------------------- */
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  
  const { isOpen: isSidebarOpen, onToggle: toggleSidebar } = useDisclosure({ defaultIsOpen: true })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortCtrl = useRef<AbortController | null>(null)
  const toast = useToast()

  /* -------------------------- CHAT LIST -------------------------- */
  const fetchChats = useCallback(async (autoSelectChatId?: string) => {
    setIsLoadingChats(true)
    try {
      const res = await fetch(`${API_URL}/chats`)
      if (!res.ok) throw new Error('Failed to fetch chats')
      const data: Chat[] = await res.json()
      setChats(data)
      
      if (autoSelectChatId) {
        setSelectedChat(autoSelectChatId)
      } else if (data.length && !selectedChat) {
        setSelectedChat(data[0].chat_id)
      }
    } catch (e: any) {
      toast({ title: 'Error fetching chats', description: e.message, status: 'error' })
    } finally {
      setIsLoadingChats(false)
    }
  }, [selectedChat, toast])

  useEffect(() => {
    fetchChats()
  }, []) // Only fetch chats once on initial load

  const loadChatHistory = async (chatId: string) => {
    try {
      const res = await fetch(`${API_URL}/chats/${chatId}/history`)
      if (!res.ok) throw new Error('Failed to load history')
      const { history } = await res.json()
      const msgs: Message[] = history.map((h: any, i: number) => ({
        id: `${chatId}-${i}`,
        type: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
        sources: h.sources,
      }))
      setMessages(msgs)
    } catch (e: any) {
      toast({ title: 'Error loading chat', description: e.message, status: 'error' })
      setMessages([])
    }
  }

  useEffect(() => {
    if (selectedChat) {
      loadChatHistory(selectedChat)
    } else {
      setMessages([])
    }
  }, [selectedChat])

  /* -------------------------- STREAMING QUERY -------------------------- */
  const handleStream = useCallback(
    async (question: string) => {
      const userMsg: Message = { id: Date.now().toString(), type: 'user', content: question }
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), type: 'assistant', content: '', isStreaming: true }

      setMessages(p => [...p, userMsg, assistantMsg])
      setIsLoading(true)
      setStreamingStatus('Thinking...')

      abortCtrl.current = new AbortController()

      try {
        const resp = await fetch(`${API_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question, k: 10, stream: true, chat_id: selectedChat,
          }),
          signal: abortCtrl.current.signal,
        })

        if (!resp.ok) throw new Error(await resp.json().then(e => e.detail) || 'Network error')

        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        let sources: Source[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          
          for (const line of chunk.split('\n\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data.trim() === '{"type": "done"}') break;

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content') {
                acc += parsed.content
                setStreamingStatus(null) 
                setMessages(p => {
                    const copy = [...p]
                    const last = copy[copy.length - 1]
                    if (last.type === 'assistant') last.content = acc
                    return copy
                })
              } else if (parsed.type === 'status') {
                setStreamingStatus(parsed.content)
              } else if (parsed.type === 'sources') {
                sources = parsed.content
              } else if (parsed.type === 'error') {
                throw new Error(parsed.content)
              }
            } catch { /* ignore parse errors */ }
          }
        }
        
        setMessages(p => {
          const copy = [...p]
          const last = copy[copy.length - 1]
          if (last.type === 'assistant') {
            last.content = acc; last.sources = sources; last.isStreaming = false
          }
          return copy
        })

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast({ title: 'Error', description: err.message || 'Something went wrong', status: 'error' })
          setMessages(p => {
            const copy = [...p]
            const last = copy[copy.length - 1]
            if (last.type === 'assistant') {
              last.content = `Sorry, I encountered an error: ${err.message}`; last.isStreaming = false
            }
            return copy
          })
        }
      } finally {
        setIsLoading(false)
        setStreamingStatus(null)
        abortCtrl.current = null
        if (messages.length === 1) { // Refetch chats to update title
            fetchChats()
        }
      }
    },
    [selectedChat, toast, messages.length, fetchChats]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !selectedChat) return
    handleStream(input.trim())
    setInput('')
  }

  /* -------------------------- FILE UPLOAD / NEW CHAT -------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files)
    }
  }

  const handleNewChatClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = async (filesToUpload: FileList) => {
    if (!filesToUpload?.length) return
    
    const fd = new FormData()
    Array.from(filesToUpload).forEach(f => fd.append('files', f))

    setIsLoading(true)
    setStreamingStatus('Uploading and processing files...')
    setSelectedChat(null) // Deselect current chat
    setMessages([]) // Clear messages

    try {
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.json().then(e => e.detail) || 'Upload failed')
      
      const { chat_id } = await res.json()
      toast({ title: 'Upload successful', status: 'success' })
      
      await fetchChats(chat_id) // Refresh list and auto-select new chat
      
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' })
      fetchChats() // Refresh list anyway
    } finally {
      setIsLoading(false)
      setStreamingStatus(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  /* -------------------------- CHAT DELETE -------------------------- */
  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm("Are you sure you want to delete this chat and all its data?")) return;
    
    try {
      const res = await fetch(`${API_URL}/chats/${chatId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.json().then(e => e.detail) || 'Failed to delete')
      
      toast({ title: "Chat deleted", status: 'success' })
      
      setChats(prev => prev.filter(c => c.chat_id !== chatId))
      if (selectedChat === chatId) {
        setSelectedChat(null)
      }
      
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, status: 'error' })
    }
  }

  /* -------------------------- RENDER -------------------------- */
  const selectedChatTitle = useMemo(() => {
    return chats.find(c => c.chat_id === selectedChat)?.title
  }, [chats, selectedChat])
  
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="container.2xl" py={0} px={0}>
        <Flex h="100vh" gap={0} shadow="lg" overflow="hidden">
          
          <Sidebar
            isOpen={isSidebarOpen}
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
            onDeleteChat={handleDeleteChat}
            onNewChat={handleNewChatClick}
            onRefreshChats={() => fetchChats()}
            isLoadingChats={isLoadingChats}
          />

          <ChatWindow
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
            selectedChatTitle={selectedChatTitle}
            selectedChatId={selectedChat}
            messages={messages}
            isLoading={isLoading}
            streamingStatus={streamingStatus}
            input={input}
            onInputChange={(e) => setInput(e.target.value)}
            onSubmit={handleSubmit}
          />
          
          {/* Hidden file input */}
          <Input
            type="file"
            multiple
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </Flex>
      </Container>
    </Box>
  )
}