import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createGeminiCredentials } from '@/lib/credentials'
import { makeGeminiRequest } from '@/app/api/gemini/token'

export async function POST(req: NextRequest) {
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
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { apiKey, apiSecret } = await req.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API key and secret are required' }, { status: 400 })
    }

    // 2) Test the credentials by making a request to Gemini
    const testCredentials = createGeminiCredentials(apiKey, apiSecret)
    
    console.log('Testing Gemini credentials...')
    const testResponse = await makeGeminiRequest('/v1/balances', testCredentials)
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}))
      console.error('Gemini credential test failed:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        errorData
      })
      return NextResponse.json({ 
        error: 'Invalid Gemini credentials', 
        details: errorData.message || 'Failed to authenticate with Gemini'
      }, { status: 400 })
    }

    console.log('Gemini credentials test successful')

    // 3) Store the credentials in Supabase
    const { error: upsertError } = await supabase.from('connected_accounts').upsert({
      user_id: user.id,
      exchange: 'gemini',
      credentials: testCredentials,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exchange' })
    
    if (upsertError) {
      console.error('Failed to store Gemini credentials:', upsertError)
      return NextResponse.json({ error: 'Failed to store credentials' }, { status: 500 })
    }

    // 4) Trigger refresh to populate balances
    try {
      const refreshUrl = new URL('/api/refresh/gemini', req.url)
      await fetch(refreshUrl, {
        method: 'POST',
        headers: { 
          cookie: req.headers.get('cookie') || '' 
        },
      })
    } catch (err) {
      console.error('Failed to auto-refresh Gemini balances:', err)
      // Don't block the user if refresh fails
    }

    return NextResponse.json({ success: true, message: 'Gemini account connected successfully' })
    
  } catch (err: unknown) {
    console.error('Error in Gemini connect endpoint:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
} 