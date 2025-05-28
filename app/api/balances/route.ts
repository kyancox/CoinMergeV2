import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
    
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

  // 1) auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 2) Get all connected exchanges for this user
  const { data: connectedAccounts, error: connectionsError } = await supabase
    .from('connected_accounts')
    .select('exchange')
    .eq('user_id', user.id)

  if (connectionsError) {
    return NextResponse.json({ error: connectionsError.message }, { status: 500 })
  }

  const connectedExchanges = connectedAccounts.map(account => account.exchange)

  // 3) Only return balances for connected exchanges, excluding zero amounts
  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', user.id)
    .gt('amount', 0)  // Only include balances greater than 0
    .in('exchange', connectedExchanges.length > 0 ? connectedExchanges : [''])  // If no connected exchanges, return empty

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ balances: data || [] })
}
