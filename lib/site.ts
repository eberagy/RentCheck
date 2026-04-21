export const DEFAULT_SITE_URL = 'https://vettrentals.com'

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL
}

export function getSiteHost() {
  return new URL(getSiteUrl()).host
}
