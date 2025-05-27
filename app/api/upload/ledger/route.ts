import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createLedgerCredentials } from '@/lib/credentials'

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

    // 4) Basic CSV validation - check if it looks like a Ledger Live export
    const lines = fileContent.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have at least a header and one data row' }, { status: 400 })
    }

    // 5) Store the connection in connected_accounts
    const credentials = createLedgerCredentials(file.name)
    
    const { error: upsertError } = await supabase.from('connected_accounts').upsert({
      user_id: user.id,
      exchange: 'ledger',
      credentials: credentials,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exchange' })
    
    if (upsertError) {
      console.error('Failed to store Ledger connection:', upsertError)
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 })
    }

    // TODO: In the next step, we'll parse the CSV and calculate balances here
    // For now, we'll just store the connection

    return NextResponse.json({ 
      success: true, 
      message: `Ledger Live file "${file.name}" uploaded successfully!`,
      filename: file.name
    })
    
  } catch (err: any) {
    console.error('Error in Ledger upload endpoint:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message
    }, { status: 500 })
  }
} 