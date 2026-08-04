/**
 * Lightweight client monitoring.
 * When VITE_SENTRY_DSN is set, errors are posted to Sentry’s envelope API
 * without adding the full Sentry SDK (keeps the static bundle small).
 * Always mirrors to console for local debugging.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

type Context = Record<string, string | number | boolean | null | undefined>

function parseDsn(raw: string) {
  try {
    const u = new URL(raw)
    // https://<key>@<host>/<project>
    const key = u.username
    const project = u.pathname.replace(/^\//, '')
    const host = u.host
    if (!key || !project) return null
    return {
      storeUrl: `https://${host}/api/${project}/store/?sentry_key=${key}&sentry_version=7`,
    }
  } catch {
    return null
  }
}

const parsed = dsn ? parseDsn(dsn) : null

export function captureException(error: unknown, context?: Context) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error('[monitoring]', message, context ?? '')

  if (!parsed) return

  const payload = {
    message,
    level: 'error',
    platform: 'javascript',
    timestamp: Date.now() / 1000,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : 'Error',
          value: message,
          stacktrace: stack
            ? { frames: stack.split('\n').slice(0, 30).map((line) => ({ filename: line.trim() })) }
            : undefined,
        },
      ],
    },
    tags: {
      app: 'tidyledger',
      ...(context
        ? Object.fromEntries(
            Object.entries(context)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)])
          )
        : {}),
    },
  }

  try {
    void fetch(parsed.storeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    /* ignore network failures */
  }
}

export function captureMessage(message: string, context?: Context) {
  console.warn('[monitoring]', message, context ?? '')
  captureException(new Error(message), context)
}

/** Attach once from main.tsx */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    captureException(event.error ?? event.message, { source: 'window.error' })
  })
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, { source: 'unhandledrejection' })
  })
}
