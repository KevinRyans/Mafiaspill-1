import axios from "axios"
import { getAccessToken, getCsrfToken, setAccessToken, setCsrfToken } from "./auth"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  const csrf = getCsrfToken()
  if (csrf) {
    config.headers = config.headers || {}
    config.headers["x-csrf"] = csrf
  }
  const proof = import.meta.env.VITE_HUMAN_PROOF
  if (proof) {
    config.headers = config.headers || {}
    config.headers["x-human-proof"] = proof
  }
  return config
})

let refreshing = false
let pending: Array<() => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = true
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            {},
            {
              withCredentials: true,
              headers: { "x-csrf": getCsrfToken() || "" }
            }
          )
          setAccessToken(response.data.accessToken)
          setCsrfToken(response.data.csrfToken)
          pending.forEach((fn) => fn())
          pending = []
        } catch (err) {
          pending = []
        } finally {
          refreshing = false
        }
      }

      return new Promise((resolve, reject) => {
        pending.push(() => {
          const token = getAccessToken()
          if (token) {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          } else {
            reject(error)
          }
        })
      })
    }
    return Promise.reject(error)
  }
)

export default api
