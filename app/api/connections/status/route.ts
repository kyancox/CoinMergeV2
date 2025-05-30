import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { isLedgerCredentials } from '@/lib/credentials'

interface ConnectionStatus {
  coinbase: { connected: boolean; linkedDate?: string }
  gemini: { connected: boolean; linkedDate?: string }
  ledger: { 
    connected: boolean
    fileName?: string
    uploadDate?: string
  }
}

export async function GET() {
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

  // 1) Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // 2) Get all connected accounts for this user
    const { data: connections, error } = await supabase
      .from('connected_accounts')
      .select('exchange, credentials, created_at')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    // 3) Build status object
    const status: ConnectionStatus = {
      coinbase: { connected: false },
      gemini: { connected: false },
      ledger: { connected: false }
    }

    // 4) Process each connection
    connections?.forEach(conn => {
      switch (conn.exchange) {
        case 'coinbase':
          status.coinbase = {
            connected: true,
            linkedDate: conn.created_at
          }
          break
        case 'gemini':
          status.gemini = {
            connected: true,
            linkedDate: conn.created_at
          }
          break
        case 'ledger':
          status.ledger.connected = true
          // Extract filename and upload date from credentials
          if (isLedgerCredentials(conn.credentials)) {
            status.ledger.fileName = conn.credentials.filename
            status.ledger.uploadDate = conn.credentials.uploaded_at
          }
          break
      }
    })

    return NextResponse.json(status)
    
  } catch (error) {
    console.error('Error in connections status endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 