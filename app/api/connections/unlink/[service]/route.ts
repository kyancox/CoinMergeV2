import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
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

  const { service } = await params

  // 2) Validate service parameter
  const validServices = ['coinbase', 'gemini', 'ledger']
  if (!validServices.includes(service)) {
    return NextResponse.json({ 
      error: 'Invalid service', 
      details: `Service must be one of: ${validServices.join(', ')}` 
    }, { status: 400 })
  }

  try {
    // 3) Check if the connection exists
    const { data: existingConnection, error: checkError } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('exchange', service)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking connection:', checkError)
      return NextResponse.json({ error: 'Failed to check connection' }, { status: 500 })
    }

    if (!existingConnection) {
      return NextResponse.json({ 
        error: 'Connection not found', 
        details: `No ${service} connection found for this user` 
      }, { status: 404 })
    }

    // 4) Delete all balances for this user and exchange
    const { error: balancesError } = await supabase
      .from('balances')
      .delete()
      .eq('user_id', user.id)
      .eq('exchange', service)

    if (balancesError) {
      console.error('Error deleting balances:', balancesError)
      return NextResponse.json({ 
        error: 'Failed to delete balances', 
        details: balancesError.message 
      }, { status: 500 })
    }

    // 5) Delete the connected account
    const { error: connectionError } = await supabase
      .from('connected_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('exchange', service)

    if (connectionError) {
      console.error('Error deleting connection:', connectionError)
      return NextResponse.json({ 
        error: 'Failed to delete connection', 
        details: connectionError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${service.charAt(0).toUpperCase() + service.slice(1)} account unlinked successfully` 
    })
    
  } catch (error) {
    console.error('Error in unlink endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 