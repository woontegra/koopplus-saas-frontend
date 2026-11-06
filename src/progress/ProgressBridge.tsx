import { useEffect } from 'react'
import { bindProgressBridge, useProgress } from './ProgressContext'

/** window.api katmanının ProgressProvider'a erişmesi için köprü. */
export default function ProgressBridge(): null {
  const progress = useProgress()
  useEffect(() => {
    bindProgressBridge(progress)
    return () => bindProgressBridge(null)
  }, [progress])
  return null
}
