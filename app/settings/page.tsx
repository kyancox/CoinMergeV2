'use client'

import { useSession } from '@supabase/auth-helpers-react'

export default function SettingsPage() {
  const session = useSession()

  const connectCoinbase = () => {
    const clientId = process.env.NEXT_PUBLIC_COINBASE_CLIENT_ID!
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_COINBASE_REDIRECT_URI!)
    const scope = 'wallet:accounts:read'
    const responseType = 'code'
    const coinbaseOAuthUrl = `https://www.coinbase.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`

    window.location.href = coinbaseOAuthUrl
  }

  return (
    <div className="p-8">
      {session?.user ? (
        <div className="mb-4">
          <p>Logged in as {session.user.email}</p>
        </div>
      ) : (
        <div className="mb-4">
          <p>Not logged in</p>
        </div>
      )}
      <button
        onClick={connectCoinbase}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Connect Coinbase
      </button>
    </div>
  )
}
