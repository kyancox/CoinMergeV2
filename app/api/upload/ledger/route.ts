import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createLedgerCredentials } from '@/lib/credentials'

function parseLedgerCSV(csv: string) {
  // Split lines and parse header
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return {}
  const header = lines[0].split(',')

  // Get column indices
  const idxType = header.indexOf('Operation Type')
  const idxTicker = header.indexOf('Currency Ticker')
  const idxAmount = header.indexOf('Operation Amount')

  if (idxType === -1 || idxTicker === -1 || idxAmount === -1) return {}

  // Aggregate per-coin totals
  const totals: Record<string, number> = {}
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',')
    const type = row[idxType]
    const ticker = row[idxTicker]
    let amount = parseFloat(row[idxAmount])
    if (!ticker || isNaN(amount)) continue
    if (type === 'IN') {
      // positive
    } else if (type === 'OUT') {
      amount = -amount
    } else {
      continue
    }
    if (!(ticker in totals)) totals[ticker] = 0
    totals[ticker] += amount
  }
  // Remove tickers with underscores (if any)
  for (const key of Object.keys(totals)) {
    if (key.includes('_')) delete totals[key]
  }
  return totals
}

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

  // 1) Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // 2) Parse the form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // 3) Read the file content
    const fileContent = await file.text()
    
    if (!fileContent.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // 4) Parse CSV and calculate per-coin totals
    const coinTotals = parseLedgerCSV(fileContent)
    if (!coinTotals || Object.keys(coinTotals).length === 0) {
      return NextResponse.json({ error: 'No valid coin data found in CSV' }, { status: 400 })
    }

    // 5) Upsert balances for each coin
    const now = new Date().toISOString()
    const rows = Object.entries(coinTotals).map(([currency, amount]) => ({
      user_id: user.id,
      exchange: 'ledger',
      currency,
      amount,
      updated_at: now,
    }))
    const { error: upsertError } = await supabase.from('balances').upsert(rows)
    if (upsertError) {
      console.error('Failed to upsert balances:', upsertError)
      return NextResponse.json({ error: 'Failed to upsert balances' }, { status: 500 })
    }

    // 6) Store the connection in connected_accounts (if not already done)
    const credentials = createLedgerCredentials(file.name)
    await supabase.from('connected_accounts').upsert({
      user_id: user.id,
      exchange: 'ledger',
      credentials: credentials,
      updated_at: now,
    }, { onConflict: 'user_id,exchange' })

    return NextResponse.json({ 
      success: true, 
      message: `Ledger Live file "${file.name}" uploaded and balances updated!`,
      filename: file.name,
      balances: rows
    })
    
  } catch (err: unknown) {
    console.error('Error in Ledger upload endpoint:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
} 