import { useEffect } from 'react'

type Props = {
  title?: string
  description?: string
  path?: string
  noIndex?: boolean
}

const SITE = 'TidyLedger'
const BASE = 'https://tidyledger.github.io/tidyledger'

/** Lightweight document head updates for public pages (SPA-friendly). */
export default function Seo({
  title,
  description = 'TidyLedger helps cleaning businesses manage jobs, customers, quotes, and payments — with a customer portal for quotes and reviews.',
  path = '',
  noIndex = false,
}: Props) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Housekeeping Operations & Customer Portal`
    document.title = fullTitle

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)![1])
        } else if (selector.includes('name=')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)![1])
        }
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)

    if (path) {
      const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = url
      setMeta('meta[property="og:url"]', 'content', url)
    }

    setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large')
  }, [title, description, path, noIndex])

  return null
}
