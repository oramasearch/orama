import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import cookieconsent from '@jop-software/astro-cookieconsent'
import starlightImageZoom from 'starlight-image-zoom'
import {openSourceMenu, oramaCloudMenu, head, cookieConsentConfig } from './config'

// https://astro.build/config
export default defineConfig({
  site: 'https://docs.orama.com',
  vite: {
    ssr: {
      noExternal: ['nanoid']
    }
  },
  redirects: {
    '/cloud/answer-engine/introduction': '/cloud/answer-engine/',
    '/cloud/data-sources/custom-integrations/csv-file': '/cloud/data-sources/static-files/csv-file',
    '/cloud/data-sources/custom-integrations/json-file': '/cloud/data-sources/static-files/json-file',
    '/cloud/data-sources/custom-integrations/introduction': '/cloud/data-sources/custom-integrations/',
    '/cloud/data-sources/native-integrations/introduction': '/cloud/data-sources/native-integrations/',
    '/cloud/performing-search/official-sdk': '/cloud/integrating-orama-cloud/official-sdk',
    '/cloud/understanding-orama/indexes': '/cloud/understanding-orama/orama-cloud',
    '/cloud/understanding-orama/introduction': '/cloud/understanding-orama/orama-cloud',
    '/cloud/understanding-orama/indexes': '/cloud'
  },
  integrations: [
    starlight({
      pagefind: false,
      plugins: [starlightImageZoom()],
      title: 'Orama Docs',
      description: 'Your product answer engine. Unlimited full-text search, embeddings generations and more. Help your users find the right answers, faster.',
      favicon: '/favicon.png',
      head: head,
      social: {
        github: 'https://github.com/oramasearch/orama',
        slack: 'https://orama.to/slack',
        twitter: 'https://x.com/oramasearch',
      },
      customCss: ['./src/tailwind.css', './src/styles/custom.css'],
      logo: {
        replacesTitle: true,
        dark: '/src/assets/logo-dark.svg',
        light: '/src/assets/logo-light.svg'
      },
      components: {
        Sidebar: './src/components/Sidebar.astro',
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
        Search: './src/components/Search.astro',
        Hero: "./src/components/Hero.astro",
        Head: './src/components/Head.astro',
        TableOfContents: './src/components/TableOfContents.astro',
      },
      sidebar: [
        ...oramaCloudMenu,
        ...openSourceMenu,
      ],
      editLink: {
        baseUrl: 'https://github.com/oramasearch/orama/edit/main/packages/docs'
      }
    }),
    react(),
    tailwind({
      applyBaseStyles: true
    }),
    cookieconsent(cookieConsentConfig)
  ]
})
