// app/api/oauth/callback/cb/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=missing_code', req.url))
  }

  const tokenResponse = await fetch('https://api.coinbase.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.NEXT_PUBLIC_COINBASE_CLIENT_ID,
      client_secret: process.env.COINBASE_CLIENT_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_COINBASE_REDIRECT_URI,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', req.url))
  }

  // ✅ Get the Supabase session
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/settings?error=not_logged_in', req.url))
  }

  // ✅ Store the token in Supabase
  const insertResult = await supabase.from('connected_accounts').upsert({
    user_id: user.id,
    exchange: 'coinbase',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,exchange',
  })

  if (insertResult.error) {
    console.error('Failed to store token:', insertResult.error)
    return NextResponse.redirect(new URL('/settings?error=db_insert_failed', req.url))
  }

  return NextResponse.redirect(new URL('/settings?connected=coinbase', req.url))
}
