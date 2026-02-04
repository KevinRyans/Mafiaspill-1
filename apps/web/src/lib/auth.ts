const ACCESS_KEY = "mf_access"
const CSRF_KEY = "mf_csrf"
const ROLE_KEY = "mf_role"

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_KEY, token)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function setCsrfToken(token: string) {
  localStorage.setItem(CSRF_KEY, token)
}

export function getCsrfToken() {
  return localStorage.getItem(CSRF_KEY)
}

export function setRole(role: string) {
  localStorage.setItem(ROLE_KEY, role)
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(CSRF_KEY)
  localStorage.removeItem(ROLE_KEY)
}
