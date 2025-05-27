'use client'

export default function SettingsPage() {
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
      <button
        onClick={connectCoinbase}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Connect Coinbase
      </button>
    </div>
  )
}
