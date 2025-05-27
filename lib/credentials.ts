// Utility functions for working with exchange credentials

import { CoinbaseCredentials, GeminiCredentials, ExchangeCredentials } from './types'

/**
 * Type guard to check if credentials are for Coinbase
 */
export function isCoinbaseCredentials(credentials: ExchangeCredentials): credentials is CoinbaseCredentials {
  return 'access_token' in credentials && 'refresh_token' in credentials && 'expires_at' in credentials
}

/**
 * Type guard to check if credentials are for Gemini
 */
export function isGeminiCredentials(credentials: ExchangeCredentials): credentials is GeminiCredentials {
  return 'api_key' in credentials && 'api_secret' in credentials
}

/**
 * Create Coinbase credentials object
 */
export function createCoinbaseCredentials(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number
): CoinbaseCredentials {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
  }
}

/**
 * Create Gemini credentials object
 */
export function createGeminiCredentials(
  apiKey: string,
  apiSecret: string
): GeminiCredentials {
  return {
    api_key: apiKey,
    api_secret: apiSecret,
  }
}

/**
 * Check if Coinbase token is expired (within buffer time)
 */
export function isCoinbaseTokenExpired(credentials: CoinbaseCredentials, bufferMinutes = 5): boolean {
  if (!credentials.expires_at) return false
  return new Date(credentials.expires_at).getTime() - bufferMinutes * 60 * 1000 < Date.now()
} 