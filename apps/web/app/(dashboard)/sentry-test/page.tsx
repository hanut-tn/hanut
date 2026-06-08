'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

export default function SentryTestPage() {
  const [results, setResults] = useState<string[]>([])

  function log(msg: string) {
    setResults(prev => [...prev, `✓ ${msg}`])
  }

  function testCaptureException() {
    Sentry.captureException(new Error('[TEST] Erreur capturée manuellement via captureException'))
    log('captureException envoyé')
  }

  function testCaptureMessage() {
    Sentry.captureMessage('[TEST] Message capturé via captureMessage', 'warning')
    log('captureMessage envoyé')
  }

  function testConsoleLogs() {
    console.log('[TEST] console.log → Sentry logs')
    console.warn('[TEST] console.warn → Sentry logs')
    console.error('[TEST] console.error → Sentry logs')
    log('console.log / warn / error envoyés')
  }

  function testSentryLogger() {
    Sentry.logger.info('[TEST] Sentry.logger.info', { source: 'sentry-test' })
    Sentry.logger.warn('[TEST] Sentry.logger.warn', { source: 'sentry-test' })
    Sentry.logger.error('[TEST] Sentry.logger.error', { source: 'sentry-test' })
    log('Sentry.logger.info / warn / error envoyés')
  }

  function testBreadcrumb() {
    Sentry.addBreadcrumb({
      category: 'test',
      message: '[TEST] Breadcrumb ajouté',
      level: 'info',
    })
    log('Breadcrumb ajouté')
  }

  function testThrowError() {
    throw new Error('[TEST] Erreur non catchée — déclenche error.tsx')
  }

  const buttons = [
    { label: 'captureException', fn: testCaptureException, color: 'bg-red-500' },
    { label: 'captureMessage', fn: testCaptureMessage, color: 'bg-orange-500' },
    { label: 'console.log/warn/error', fn: testConsoleLogs, color: 'bg-blue-500' },
    { label: 'Sentry.logger', fn: testSentryLogger, color: 'bg-purple-500' },
    { label: 'Breadcrumb', fn: testBreadcrumb, color: 'bg-green-600' },
    { label: 'Throw (error boundary)', fn: testThrowError, color: 'bg-gray-800' },
  ]

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">Test Sentry</h1>
        <p className="text-sm text-[#78716C] mt-1">Page temporaire — à supprimer après validation</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {buttons.map(({ label, fn, color }) => (
          <button
            key={label}
            onClick={fn}
            className={`${color} text-white px-4 py-3 rounded-lg text-sm font-medium min-h-[44px]`}
          >
            {label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="bg-[#F5F5F4] rounded-xl p-4 space-y-1">
          {results.map((r, i) => (
            <p key={i} className="text-sm text-[#1C1917] font-mono">{r}</p>
          ))}
        </div>
      )}

      <p className="text-xs text-[#A8A29E]">
        Vérifie dans Sentry → Issues et Sentry → Logs après chaque clic.
      </p>
    </div>
  )
}
