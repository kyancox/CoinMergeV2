import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function DELETE() {
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
    // 2) Delete all balances for this user
    const { error: balancesError } = await supabase
      .from('balances')
      .delete()
      .eq('user_id', user.id)

    if (balancesError) {
      console.error('Error deleting user balances:', balancesError)
      return NextResponse.json({ 
        error: 'Failed to delete user balances', 
        details: balancesError.message 
      }, { status: 500 })
    }

    // 3) Delete all connected accounts for this user
    const { error: connectionsError } = await supabase
      .from('connected_accounts')
      .delete()
      .eq('user_id', user.id)

    if (connectionsError) {
      console.error('Error deleting user connections:', connectionsError)
      return NextResponse.json({ 
        error: 'Failed to delete user connections', 
        details: connectionsError.message 
      }, { status: 500 })
    }

    // 4) Delete the user from Supabase Auth
    // Note: This requires admin privileges, so we need to use the service role key
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => cookies.forEach(cookie => cookieStore.set(cookie.name, cookie.value, cookie.options)),
        },
      }
    )

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError)
      return NextResponse.json({ 
        error: 'Failed to delete user account', 
        details: deleteUserError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error in delete account endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 