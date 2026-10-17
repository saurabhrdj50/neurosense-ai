import apiClient from '../../../services/apiClient';
import API_URL from '../../../config/api';
import { fetchAllPages } from '../../../shared/utils/paginatedFetch';

export const historyApi = {
  getPatientHistory: async (patientId, limit = 20) => {
    return apiClient.get(`/api/patients/history/${patientId}?limit=${limit}`)
  },

  /**
   * All-sessions feed, walked page-by-page (200/page) so the client keeps a
   * "whole list" contract without ever issuing the unbounded request that
   * made history load take seconds at scale. Sessions grow without bound, so
   * accumulation stops at `maxRows` (default 1000 ≈ 0.5 MB) and the result
   * carries `total` + `truncated` for honest "latest N of M" UI.
   */
  getAllAnalyses: async ({ maxRows = 1000 } = {}) => {
    const { rows, total, truncated } = await fetchAllPages(
      async ({ limit, offset }) => {
        const res = await apiClient.get(`/api/analyses?limit=${limit}&offset=${offset}`)
        if (Array.isArray(res)) return { rows: res, total: res.length }
        return { rows: res.analyses || [], total: res.total }
      },
      { maxRows },
    )
    return { analyses: rows, total, truncated }
  },

  exportPatientHistory: (patientId) => {
    window.open(`${API_URL}/api/patients/export/${patientId}`, '_blank')
  },
}
