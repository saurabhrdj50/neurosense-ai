/**
 * Walk a paged list endpoint, accumulating rows, so callers keep their
 * "give me the whole list" contract while the transport stays paginated.
 *
 * Page size is 200 (the backend cap) and accumulation stops at `maxRows` —
 * the payload for a full 20k-session deployment drops from ~9 MB to well
 * under half a MB, and callers receive `total` so the UI can say
 * "showing the latest N of M" instead of silently lying.
 *
 * @param {(page: {limit: number, offset: number}) => Promise<{rows: Array, total: number}>} fetchPage
 * @param {{pageSize?: number, maxRows?: number}} [opts]
 * @returns {Promise<{rows: Array, total: number, truncated: boolean}>}
 */
export async function fetchAllPages(fetchPage, { pageSize = 200, maxRows = 2000 } = {}) {
  const rows = []
  let offset = 0
  let total = null
  let truncated = false

  while (rows.length < maxRows) {
    const page = await fetchPage({ limit: pageSize, offset })
    total = typeof page.total === 'number' ? page.total : total

    const batch = page.rows || []
    rows.push(...batch)

    if (batch.length < pageSize) break
    offset += batch.length
  }

  if (total !== null && rows.length < total) truncated = true
  return { rows, total: total ?? rows.length, truncated }
}
