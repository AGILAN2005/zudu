// src/components/MarkdownRenderer.tsx
import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Text,
  Link,
  ListItem,
  OrderedList,
  UnorderedList,
  Heading,
  Box,
} from '@chakra-ui/react'

interface Source {
  id: number
  source: string
  parent_chunk: string
}

interface MarkdownRendererProps {
  content: string
  sources?: Source[]
}

// Helper to create the source map
const createSourceMap = (sources: Source[] = []) => {
  const sourceMap = new Map<string, number>()
  let sourceCounter = 1
  // Create a unique list of source filenames from the sources array
  const uniqueSourceFiles = sources
    .map(s => s.source)
    .filter((value, index, self) => self.indexOf(value) === index)

  uniqueSourceFiles.forEach(sourceFile => {
    if (!sourceMap.has(sourceFile)) {
      sourceMap.set(sourceFile, sourceCounter)
      sourceCounter++
    }
  })
  return sourceMap
}

// This regex finds citations like [file.pdf]
// It splits the string while capturing the delimiter (the citation)
const citationRegex = /\[([^\]]+\.(?:pdf|docx|txt|md))\]/g

// This function processes text nodes to replace citations with <sup> tags
const processChildren = (
  children: React.ReactNode,
  sourceMap: Map<string, number>
): React.ReactNode => {
  return React.Children.map(children, child => {
    // If the child is a string, process it for citations
    if (typeof child === 'string') {
      // Split the string by the citation regex.
      // E.g., "text [file.pdf] more text" becomes ["text ", "file.pdf", " more text"]
      const parts = child.split(citationRegex)

      return parts.map((part, index) => {
        // Odd indices are the captured filenames (e.g., "file.pdf")
        if (index % 2 === 1) {
          const citationKey = part // This is just the filename
          const sourceNum = sourceMap.get(citationKey)
          if (sourceNum) {
            // Found it! Replace with a superscript link.
            return (
              <Text
                as="sup"
                key={index}
                color="brand.600"
                fontWeight="bold"
                fontSize="0.9em"
                mx="1px"
              >
                <Link href={`#source-${sourceNum}`} title={citationKey}>
                  [{sourceNum}]
                </Link>
              </Text>
            )
          }
          return `[${part}]` // Fallback if not in map
        }
        return part // Even indices are regular text
      })
    }

    // If it's a React element (like <strong>), recursively process its children
    if (
      React.isValidElement(child) &&
      child.props.children
    ) {
      const newProps = {
        ...child.props,
        children: processChildren(child.props.children, sourceMap),
      }
      return React.cloneElement(child, newProps)
    }

    return child // Return other elements (like <br/>)
  })
}

export default function MarkdownRenderer({
  content,
  sources = [],
}: MarkdownRendererProps) {
  // Create the map once
  const sourceMap = useMemo(() => createSourceMap(sources), [sources])

  // Custom components for Chakra UI
  // We process the children of each block-level element
  const components = {
    p: (props: any) => {
      return (
        <Text mb={2} as="p">
          {processChildren(props.children, sourceMap)}
        </Text>
      )
    },
    a: (props: any) => <Link {...props} color="brand.500" isExternal />,
    ul: (props: any) => {
      return (
        <UnorderedList pl={4} mb={2}>
          {processChildren(props.children, sourceMap)}
        </UnorderedList>
      )
    },
    ol: (props: any) => {
      return (
        <OrderedList pl={4} mb={2}>
          {processChildren(props.children, sourceMap)}
        </OrderedList>
      )
    },
    li: (props: any) => {
      return <ListItem>{processChildren(props.children, sourceMap)}</ListItem>
    },
    h1: (props: any) => (
      <Heading as="h1" size="xl" mb={3}>
        {processChildren(props.children, sourceMap)}
      </Heading>
    ),
    h2: (props: any) => (
      <Heading as="h2" size="lg" mb={3}>
        {processChildren(props.children, sourceMap)}
      </Heading>
    ),
    h3: (props: any) => (
      <Heading as="h3" size="md" mb={2}>
        {processChildren(props.children, sourceMap)}
      </Heading>
    ),
  }

  return (
    <Box className="markdown-body">
      <ReactMarkdown
        children={content} // Pass the RAW markdown content
        remarkPlugins={[remarkGfm]}
        components={components as any} // Use our custom renderers
      />
    </Box>
  )
}