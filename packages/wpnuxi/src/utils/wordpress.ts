export function resolveGraphQLUrl(wordpressUrl: string): string {
  const base = wordpressUrl.replace(/\/+$/, '')
  return `${base}/graphql`
}

export async function checkGraphQLHealth(graphqlUrl: string): Promise<{ ok: boolean, error?: string }> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json() as { data?: { __typename?: string } }
    if (json.data?.__typename) {
      return { ok: true }
    }
    return { ok: false, error: 'Unexpected response' }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export async function checkIntrospection(graphqlUrl: string): Promise<{ ok: boolean, error?: string }> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __schema { queryType { name } } }' }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json() as { data?: { __schema?: { queryType?: { name?: string } } }, errors?: unknown[] }
    if (json.data?.__schema?.queryType?.name) {
      return { ok: true }
    }
    if (json.errors) {
      return { ok: false, error: 'Introspection disabled' }
    }
    return { ok: false, error: 'Unexpected response' }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
