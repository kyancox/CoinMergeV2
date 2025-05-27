import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  // Get the stored token
  const { data: conn } = await supabase
    .from('connected_accounts')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('exchange', 'coinbase')
    .single()

  if (!conn) {
    console.log(`[Coinbase Token] No connection found for user ${userId}`)
    throw new Error('No Coinbase connection')
  }

  // Check if token is expired (within 5 minutes)
  const isExpired = conn.expires_at && new Date(conn.expires_at).getTime() - 5 * 60 * 1000 < Date.now()
  console.log(`[Coinbase Token] Token expiration check - Expired: ${isExpired}, Expires at: ${conn.expires_at}`)

  // If not expired, verify the token is still valid with Coinbase
  if (!isExpired) {
    try {
      const verifyRes = await fetch('https://api.coinbase.com/v2/user', {
        headers: { Authorization: `Bearer ${conn.access_token}` }
      })
      
      if (!verifyRes.ok) {
        console.log(`[Coinbase Token] Token validation failed with status ${verifyRes.status}`)
        throw new Error('Token validation failed')
      }
      
      console.log(`[Coinbase Token] Using existing valid token for user ${userId}`)
      return conn.access_token
    } catch (err: any) {
      console.log(`[Coinbase Token] Token validation error: ${err.message}`)
      // If validation fails, treat it as expired and try to refresh
      if (!conn.refresh_token) {
        throw new Error('Token expired and no refresh token available')
      }
    }
  }

  // If expired or validation failed, try to refresh
  if (!conn.refresh_token) {
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
      refresh_token: conn.refresh_token,
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

  // Update the stored token
  const { error: updateError } = await supabase
    .from('connected_accounts')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? conn.refresh_token,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
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