import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getValidCoinbaseToken } from '../token'

interface CoinbaseAccount {
  currency: {
    code: string;
  };
  balance: {
    amount: string;
  };
}

interface CoinbaseResponse {
  data: CoinbaseAccount[];
}

export async function GET() {
  // 1. Init Supabase server client
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

  // 2. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    // 3. Get a valid token (will refresh if needed)
    const token = await getValidCoinbaseToken(user.id)

    // 4. Call Coinbase API
    const coinbaseRes = await fetch('https://api.coinbase.com/v2/accounts', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!coinbaseRes.ok) {
      const errorData = await coinbaseRes.json().catch(() => ({}))
      return NextResponse.json({ 
        error: 'Failed to fetch from Coinbase',
        details: errorData.error || coinbaseRes.statusText
      }, { status: 502 })
    }

    const json: CoinbaseResponse = await coinbaseRes.json()
    // 5. Simplify the payload
    const balances = json.data.map((acct: CoinbaseAccount) => ({
      currency: acct.currency.code,
      amount: acct.balance.amount
    }))

    return NextResponse.json({ balances })
  } catch (err: unknown) {
    console.error('Error in balances endpoint:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ 
      error: errorMessage,
      details: errorMessage === 'Token expired and no refresh token available' 
        ? 'Please reconnect your Coinbase account'
        : undefined
    }, { status: 401 })
  }
}
