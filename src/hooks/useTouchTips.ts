import { useEffect } from 'react'

const SELECTOR = '.col-info-tip, [data-tip], .help-tip'

/** Hover yerine dokununca title ipucunu göster (CSS ::after + .is-open). */
export function useTouchTips(): void {
  useEffect(() => {
    const onTap = (event: Event): void => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const tip = target.closest(SELECTOR) as HTMLElement | null
      document.querySelectorAll(`${SELECTOR}.is-open`).forEach((el) => {
        if (el !== tip) el.classList.remove('is-open')
      })
      if (!tip) return
      const title = tip.getAttribute('title') || tip.getAttribute('data-tip')
      if (!title) return
      event.preventDefault()
      tip.classList.toggle('is-open')
    }
    document.addEventListener('click', onTap, true)
    return () => document.removeEventListener('click', onTap, true)
  }, [])
}
