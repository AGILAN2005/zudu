// // import { extendTheme } from '@chakra-ui/react'

// // export const system = extendTheme({
// //   fonts: {
// //     heading: `'Inter', sans-serif`,
// //     body: `'Inter', sans-serif`,
// //   },
// //   styles: {
// //     global: {
// //       body: {
// //         bg: 'gray.50',
// //       },
// //     },
// //   },
// // })

// // themes.ts (updated for better aesthetics)
// import { extendTheme } from '@chakra-ui/react'

// export const system = extendTheme({
//   fonts: {
//     heading: `'Inter', sans-serif`,
//     body: `'Inter', sans-serif`,
//   },
//   colors: {
//     brand: {
//       50: '#E6F3FF',
//       100: '#B3D4FF',
//       200: '#80B5FF',
//       300: '#4D96FF',
//       400: '#1A77FF',
//       500: '#0058E6',
//       600: '#0046B3',
//       700: '#003480',
//       800: '#00224D',
//       900: '#00101A',
//     },
//   },
//   components: {
//     Card: {
//       baseStyle: {
//         container: {
//           borderRadius: 'xl',
//           shadow: 'md',
//         },
//       },
//     },
//     Button: {
//       baseStyle: {
//         borderRadius: 'lg',
//       },
//     },
//     Input: {
//       baseStyle: {
//         field: {
//           borderRadius: 'lg',
//         },
//       },
//     },
//     Badge: {
//       baseStyle: {
//         borderRadius: 'full',
//         px: 2,
//       },
//     },
//   },
//   styles: {
//     global: {
//       body: {
//         bg: 'gray.50',
//         color: 'gray.800',
//       },
//     },
//   },
// })/

// src/themes.ts
import { extendTheme } from '@chakra-ui/react'

export const system = extendTheme({
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
  colors: {
    brand: {
      50: '#e6f3ff',
      100: '#b3d4ff',
      200: '#80b5ff',
      300: '#4d96ff',
      400: '#1a77ff',
      500: '#0058e6',
      600: '#0046b3',
      700: '#003480',
      800: '#00224d',
      900: '#00101a',
    },
  },
  components: {
    Button: { baseStyle: { borderRadius: 'md' } },
    Input:  { baseStyle: { field: { borderRadius: 'md' } } },
  },
  styles: {
    global: {
      body: { bg: 'gray.50' },
    },
  },
})