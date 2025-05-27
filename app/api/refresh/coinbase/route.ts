import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getValidCoinbaseToken } from '@/app/api/coinbase/token'

export async function POST(req: NextRequest) {
    
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

  // 1) auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    // 2) Get a valid token (will refresh if needed)
    const accessToken = await getValidCoinbaseToken(user.id)

    // 3) fetch live balances
    console.log('Fetching Coinbase balances...')
    const res = await fetch('https://api.coinbase.com/v2/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    console.log('Coinbase response status:', res.status)
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('Coinbase API error:', {
        status: res.status,
        statusText: res.statusText,
        errorData
      })
      return NextResponse.json({ 
        error: 'Failed to fetch Coinbase', 
        details: errorData.error || res.statusText,
        status: res.status 
      }, { status: 502 })
    }

    const { data } = await res.json()

    // 4) prepare rows for upsert
    const rows = data.map((acct: any) => ({
      user_id:    user.id,
      exchange:   'coinbase',
      currency:   acct.currency.code,
      amount:     parseFloat(acct.balance.amount),
      updated_at: new Date().toISOString()
    }))

    // 5) upsert into balances
    const { error } = await supabase.from('balances').upsert(rows)
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
    
  } catch (err: any) {
    console.error('Error in refresh endpoint:', err)
    return NextResponse.json({ 
      error: err.message,
      details: err.message === 'Token expired and no refresh token available' 
        ? 'Please reconnect your Coinbase account'
        : undefined
    }, { status: 401 })
  }
}
