import React from 'react'
import { attributionLi, attributionP } from '../utils/classNames.js'

export const OramaFooter = ({ results }) => {
  return (
    <li className={attributionLi} style={{ transform: 'translate(0px, 11px)' }}>
      <p className={attributionP}>
        <b>{results.count}</b> result{results.count > 1 && 's'} found in <b>{results.elapsed.formatted}</b>. Powered by{' '}
        <a href="https://oramasearch.com?utm_source=nextra_plugin" target="_blank" className="nx-text-primary-600">
          <b>Orama</b>
        </a>
      </p>
    </li>
  )
}
