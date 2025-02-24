import { useEffect, useState } from 'react'
import { OramaClient } from '@oramacloud/client'
import { OramaSearchBox, OramaSearchButton } from '@orama/react-components'
import { getCurrentCategory, getOramaUserId, searchSessionTracking, userSessionRefresh } from '../utils/search'

const endpointUrl = import.meta.env.PUBLIC_ORAMA_CLOUD_ENDPOINT
const publicApiKey = import.meta.env.PUBLIC_ORAMA_CLOUD_API_KEY

const client = new OramaClient({
  api_key: publicApiKey,
  endpoint: endpointUrl
})

function useCmdK(callback) {
  const [isCmdKPressed, setIsCmdKPressed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsCmdKPressed(true)
        if (callback && typeof callback === 'function') {
          callback()
        }
      }
    }

    const handleKeyUp = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        setIsCmdKPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [callback])

  return isCmdKPressed
}

export function Search() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark')
  const [currentCategory, setCurrentCategory] = useState(null)
  const [userId, setUserId] = useState(getOramaUserId())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const intervalId = setInterval(() => userSessionRefresh(client, userId, setUserId), 5000)
    return () => clearInterval(intervalId)
  }, [userId])

  useEffect(() => {
    function callback(mutationList) {
      for (const mutation of mutationList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.dataset.theme)
        }
      }
    }

    const observer = new MutationObserver(callback)
    observer.observe(document.documentElement, { attributes: true })

    const category = getCurrentCategory()
    setCurrentCategory(category)

    return () => {
      observer.disconnect()
    }
  }, [])

  useCmdK(() => {
    if (!isOpen) {
      setIsOpen(true)
    }
  })

  useEffect(() => searchSessionTracking(client, userId), [userId])

  const ossSuggestions = [
    'What languages are supported?',
    'How do I write an Orama plugin?',
    'How do I perform vector search with OSS Orama?'
  ]

  const cloudSuggestions = [
    'What is an Orama index?',
    'How do I perform vector search with Orama Cloud?',
    'What is an answer session?'
  ]

  const oramaWhere = currentCategory
    ? {
        category: {
          eq: currentCategory
        }
      }
    : {}

  const facetProperty = ['Cloud', 'Open Source'].includes(currentCategory) ? 'section' : 'category'
  const suggestions = currentCategory === 'Open Source' ? ossSuggestions : cloudSuggestions

  if (!theme) return null

  return (
    <>
      <OramaSearchBox
        // @ts-ignore
        clientInstance={client}
        onSearchboxClosed={() => {
          setIsOpen(false)
          document.body.removeAttribute('data-search-open')
        }}
        sourcesMap={{
          description: 'content'
        }}
        resultMap={{
          description: 'content'
        }}
        searchParams={{
          where: oramaWhere as any
        }}
        facetProperty={facetProperty}
        colorScheme={theme === 'light' ? 'light' : 'dark'}
        open={isOpen}
        suggestions={suggestions}
        searchPlaceholder={`Search ${currentCategory === 'Open Source' ? 'Open Source' : 'Orama Cloud'}`}
        chatPlaceholder="Ask me anything about Orama"
      />

      <OramaSearchButton
        colorScheme={theme === 'light' ? 'light' : 'dark'}
        onClick={() => {
          setIsOpen(true)
          document.body.setAttribute('data-search-open', '')
        }}
        style={{ width: '100%' }}
      >
        Search
      </OramaSearchButton>
    </>
  )
}
