// app/api/oauth/callback/cb/route.ts
import { NextRequest, NextResponse } from 'next/server'

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

  // 🔐 TODO: Store tokenData in Supabase DB (tied to the logged-in user)

  console.log('Access Token:', tokenData.access_token)
  return NextResponse.redirect(new URL('/settings?connected=coinbase', req.url))
}
