import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GeminiCredentials } from '@/lib/types'
import { isGeminiCredentials } from '@/lib/credentials'
import crypto from 'crypto'

export async function getValidGeminiCredentials(userId: string): Promise<GeminiCredentials> {
  console.log(`[Gemini Credentials] Getting credentials for user ${userId}`)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options)),
      },
    }
  )

  // Get the stored credentials
  const { data: conn } = await supabase
    .from('connected_accounts')
    .select('credentials')
    .eq('user_id', userId)
    .eq('exchange', 'gemini')
    .single()

  if (!conn || !conn.credentials) {
    console.log(`[Gemini Credentials] No connection found for user ${userId}`)
    throw new Error('No Gemini connection')
  }

  // Type guard to ensure we have Gemini credentials
  if (!isGeminiCredentials(conn.credentials)) {
    console.log(`[Gemini Credentials] Invalid credentials format for user ${userId}`)
    throw new Error('Invalid Gemini credentials format')
  }

  console.log(`[Gemini Credentials] Successfully retrieved credentials for user ${userId}`)
  return conn.credentials
}

/**
 * Create Gemini API signature for authenticated requests
 */
export function createGeminiSignature(
  payload: string,
  apiSecret: string
): string {
  // Base64 encode the payload
  const b64 = Buffer.from(payload).toString('base64')
  
  // Create HMAC-SHA384 signature
  const signature = crypto
    .createHmac('sha384', apiSecret)
    .update(b64)
    .digest('hex')
  
  return signature
}

/**
 * Create headers for Gemini API request
 */
export function createGeminiHeaders(
  apiKey: string,
  payload: string,
  signature: string
): Record<string, string> {
  const b64Payload = Buffer.from(payload).toString('base64')
  
  return {
    'Content-Type': 'text/plain',
    'Content-Length': '0',
    'X-GEMINI-APIKEY': apiKey,
    'X-GEMINI-PAYLOAD': b64Payload,
    'X-GEMINI-SIGNATURE': signature,
    'Cache-Control': 'no-cache'
  }
}

/**
 * Make authenticated request to Gemini API
 */
export async function makeGeminiRequest(
  endpoint: string,
  credentials: GeminiCredentials,
  additionalPayload: Record<string, unknown> = {}
): Promise<Response> {
  const nonce = Date.now()
  
  const payload = JSON.stringify({
    request: endpoint,
    nonce,
    ...additionalPayload
  })
  
  const signature = createGeminiSignature(payload, credentials.api_secret)
  const headers = createGeminiHeaders(credentials.api_key, payload, signature)
  
  console.log(`[Gemini API] Making request to ${endpoint}`)
  
  const response = await fetch(`https://api.gemini.com${endpoint}`, {
    method: 'POST',
    headers
  })
  
  console.log(`[Gemini API] Response status: ${response.status}`)
  return response
} 