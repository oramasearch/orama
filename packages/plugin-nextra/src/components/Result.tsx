import React, { useState } from 'react'
import { listItem, resultText } from '../utils/classNames.js'
import NextLink from 'next/link'
import { HighlightedDocument } from './HighlightedDocument.js'
import { Result, TypedDocument } from '@orama/orama'
import { NextraOrama } from '../utils/index.js'
import { Position } from '@orama/plugin-match-highlight'

export const SearchResult = ({ document, positions }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <li
      key={document.url}
      className={`${listItem} ${hovered ? 'nx-bg-primary-500/10' : ''}`}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <NextLink href={document.url} className="nx-block nx-scroll-m-12 nx-px-2.5 nx-py-2">
        <div className={resultText}>
          <HighlightedDocument
            hit={
              { document, positions } as Result<TypedDocument<NextraOrama>> & {
                positions: Record<string, Record<string, Position[]>>
              }
            }
          />
        </div>
      </NextLink>
    </li>
  )
}
