import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getValidGeminiCredentials, makeGeminiRequest } from '@/app/api/gemini/token'

export async function POST(req: NextRequest) {
  // Get the Supabase session
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
    // 2) Get Gemini credentials
    const credentials = await getValidGeminiCredentials(user.id)

    // 3) fetch live balances from Gemini
    console.log('Fetching Gemini balances...')
    const response = await makeGeminiRequest('/v1/balances', credentials)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      })
      return NextResponse.json({ 
        error: 'Failed to fetch Gemini balances', 
        details: errorData.message || response.statusText,
        status: response.status 
      }, { status: 502 })
    }

    const balances = await response.json()
    console.log('Gemini balances response:', balances)

    // 4) prepare rows for upsert
    const rows = balances.map((balance: any) => ({
      user_id: user.id,
      exchange: 'gemini',
      currency: balance.currency,
      amount: parseFloat(balance.amount),
      updated_at: new Date().toISOString()
    }))

    // 5) upsert into balances
    const { error } = await supabase.from('balances').upsert(rows)
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
    
  } catch (err: any) {
    console.error('Error in Gemini refresh endpoint:', err)
    return NextResponse.json({ 
      error: err.message,
      details: err.message === 'No Gemini connection' 
        ? 'Please connect your Gemini account'
        : undefined
    }, { status: 401 })
  }
} 