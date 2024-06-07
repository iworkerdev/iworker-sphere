export const API_URL = 'http://localhost:8085'

import axios from 'axios'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  res => res,
  error =>
    Promise.reject(
      (error.response && error.response.data) || 'Something went wrong',
    ),
)

export { apiClient }

export const fetcher = async (args: any) => {
  const [url, config] = Array.isArray(args) ? args : [args]
  const res = await apiClient.get(url, { ...config })
  return res.data
}

export const sender = async (args: any) => {
  const [url, data, config] = Array.isArray(args) ? args : [args]
  const res = await apiClient.post(url, data, { ...config })
  return res.data
}

export const SWR_CONFIG = (
  refreshInterval: number = 1000,
  revalidateOnFocus: boolean = false,
) => ({
  revalidateOnFocus,
  revalidateOnReconnect: false,
  revalidateOnMount: true,
  refreshInterval,
})

export const API_ENDPOINTS_CONFIG = {
  getTeams: `/iworker-sphere/teams`,
  getDesktops: `/iworker-sphere/desktops`,
  getSessionsForDesktop: (desktopId: string, filter = '') =>
    filter
      ? `/iworker-sphere/desktop/${desktopId}/sessions?filter=${filter}`
      : `/iworker-sphere/desktop/${desktopId}/sessions`,
  changeActiveDesktop: (desktopId: string) =>
    `/iworker-sphere/desktop/${desktopId}/activate`,
  warmUpProfile: '/iworker-sphere/session/wam-up',
  endWarmUp: '/iworker-sphere/session/stop',
  warmUpAllProfiles: '/sessions/automation/trigger-warm-up-execution',
  bulkWarmUpDesktops: '/sessions/automation/bulk-profile-warm-up',
  endAllWarmUpsInDesktop: (desktopId: string) =>
    `/iworker-sphere/desktop/${desktopId}/end-all-active-sessions`,
}
