import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isCoinbaseCredentials, isCoinbaseTokenExpired, createCoinbaseCredentials } from '@/lib/credentials'

export async function getValidCoinbaseToken(userId: string) {
  console.log(`[Coinbase Token] Starting token validation for user ${userId}`)
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

  // Get the stored token using new credentials structure
  const { data: conn } = await supabase
    .from('connected_accounts')
    .select('credentials')
    .eq('user_id', userId)
    .eq('exchange', 'coinbase')
    .single()

  if (!conn || !conn.credentials) {
    console.log(`[Coinbase Token] No connection found for user ${userId}`)
    throw new Error('No Coinbase connection')
  }

  // Type guard to ensure we have Coinbase credentials
  if (!isCoinbaseCredentials(conn.credentials)) {
    console.log(`[Coinbase Token] Invalid credentials format for user ${userId}`)
    throw new Error('Invalid Coinbase credentials format')
  }

  const credentials = conn.credentials

  // Check if token is expired (within 5 minutes)
  const isExpired = isCoinbaseTokenExpired(credentials, 5)
  console.log(`[Coinbase Token] Token expiration check - Expired: ${isExpired}, Expires at: ${credentials.expires_at}`)

  // If not expired, verify the token is still valid with Coinbase
  if (!isExpired) {
    try {
      const verifyRes = await fetch('https://api.coinbase.com/v2/user', {
        headers: { Authorization: `Bearer ${credentials.access_token}` }
      })
      
      if (!verifyRes.ok) {
        console.log(`[Coinbase Token] Token validation failed with status ${verifyRes.status}`)
        throw new Error('Token validation failed')
      }
      
      console.log(`[Coinbase Token] Using existing valid token for user ${userId}`)
      return credentials.access_token
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.log(`[Coinbase Token] Token validation error: ${errorMessage}`)
      // If validation fails, treat it as expired and try to refresh
      if (!credentials.refresh_token) {
        throw new Error('Token expired and no refresh token available')
      }
    }
  }

  // If expired or validation failed, try to refresh
  if (!credentials.refresh_token) {
    console.log(`[Coinbase Token] Token expired and no refresh token available for user ${userId}`)
    throw new Error('Token expired and no refresh token available')
  }

  console.log(`[Coinbase Token] Attempting to refresh token for user ${userId}`)
  // Try to refresh the token
  const refreshRes = await fetch('https://api.coinbase.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: process.env.NEXT_PUBLIC_COINBASE_CLIENT_ID,
      client_secret: process.env.COINBASE_CLIENT_SECRET,
    }),
  })

  if (!refreshRes.ok) {
    console.log(`[Coinbase Token] Failed to refresh token for user ${userId}. Status: ${refreshRes.status}`)
    throw new Error('Failed to refresh token')
  }

  const tokenData = await refreshRes.json()
  console.log(`[Coinbase Token] Successfully obtained new token for user ${userId}`)

  // Update the stored token with new credentials structure using utility function
  const updatedCredentials = createCoinbaseCredentials(
    tokenData.access_token,
    tokenData.refresh_token ?? credentials.refresh_token,
    tokenData.expires_in
  )

  const { error: updateError } = await supabase
    .from('connected_accounts')
    .update({
      credentials: updatedCredentials,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('exchange', 'coinbase')

  if (updateError) {
    console.log(`[Coinbase Token] Failed to update token in database for user ${userId}`)
    throw new Error('Failed to update token in database')
  }

  console.log(`[Coinbase Token] Successfully updated token in database for user ${userId}`)
  return tokenData.access_token
} 