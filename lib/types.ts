// Types for connected accounts with new credentials JSONB structure

export interface CoinbaseCredentials {
  access_token: string
  refresh_token: string
  expires_at: string // ISO timestamp string
}

export interface GeminiCredentials {
  api_key: string
  api_secret: string
}

export type ExchangeCredentials = CoinbaseCredentials | GeminiCredentials

export interface ConnectedAccount {
  id?: string
  user_id: string
  exchange: 'coinbase' | 'gemini'
  credentials: ExchangeCredentials
  created_at?: string
  updated_at?: string
} 