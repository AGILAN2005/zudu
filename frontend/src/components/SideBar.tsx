// src/components/Sidebar.tsx
import { useMemo } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  IconButton,
  Tooltip,
  Text,
  Spinner,
  Stack,
} from '@chakra-ui/react'
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi'

// Types
interface Chat {
  chat_id: string
  title: string
  files?: string[]
}

interface SidebarProps {
  isOpen: boolean
  chats: Chat[]
  selectedChat: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onNewChat: () => void
  onRefreshChats: () => void
  isLoadingChats: boolean
}

export default function Sidebar({
  isOpen,
  chats,
  selectedChat,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onRefreshChats,
  isLoadingChats,
}: SidebarProps) {
  
  const chatList = useMemo(
    () => (
      <Stack spacing={2} overflowY="auto" flex={1} pr={2}>
        {chats.length === 0 && !isLoadingChats && (
          <Text color="gray.500" fontSize="sm" textAlign="center">
            No chats yet.
          </Text>
        )}
        {isLoadingChats && <Spinner size="sm" mx="auto" />}
        {chats.map(c => (
          <HStack
            key={c.chat_id}
            p={3}
            borderRadius="md"
            bg={selectedChat === c.chat_id ? 'brand.50' : 'transparent'}
            cursor="pointer"
            _hover={{
              bg: selectedChat === c.chat_id ? 'brand.50' : 'gray.100',
            }}
            onClick={() => onSelectChat(c.chat_id)}
            transition="background 0.2s"
            justify="space-between"
          >
            <VStack align="left" spacing={0} flex={1} overflow="hidden">
              <Text
                fontWeight="medium"
                isTruncated
                maxW="100%"
                fontSize="sm"
                color={selectedChat === c.chat_id ? 'brand.700' : 'gray.700'}
              >
                {c.title}
              </Text>
              {c.files?.length ? (
                <Text fontSize="xs" color="gray.500">
                  {c.files.length} file{c.files.length > 1 ? 's' : ''}
                </Text>
              ) : null}
            </VStack>
            
            <Tooltip label="Delete chat" hasArrow>
              <IconButton
                aria-label="Delete chat"
                icon={<FiTrash2 />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent chat selection
                  onDeleteChat(c.chat_id);
                }}
              />
            </Tooltip>
          </HStack>
        ))}
      </Stack>
    ),
    [chats, selectedChat, isLoadingChats, onSelectChat, onDeleteChat]
  )

  return (
    <Box
      w={isOpen ? '320px' : '0px'}
      opacity={isOpen ? 1 : 0}
      transform={isOpen ? 'translateX(0)' : 'translateX(-320px)'}
      transition="all 0.3s ease"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      overflow="hidden"
      h="100vh"
    >
      <VStack align="stretch" spacing={4} p={4} h="100%">
        <HStack justify="space-between">
          <Heading size="md" color="brand.600">
            Chats
          </Heading>
          <HStack>
            <Tooltip label="Refresh list" hasArrow>
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                size="sm"
                variant="ghost"
                onClick={onRefreshChats}
                isLoading={isLoadingChats}
              />
            </Tooltip>
            <Tooltip label="New chat" hasArrow>
              <IconButton
                aria-label="New chat"
                icon={<FiPlus />}
                size="sm"
                variant="ghost"
                colorScheme="brand"
                onClick={onNewChat}
              />
            </Tooltip>
          </HStack>
        </HStack>
        
        {chatList}
        
      </VStack>
    </Box>
  )
}