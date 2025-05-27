'use client'
import { useEffect, useState } from 'react'

type BalanceRow = {
  exchange: string
  currency: string
  amount: number
  updated_at: string
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshingExchange, setRefreshingExchange] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/balances')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      setBalances(json.balances)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshExchange = async (exchange: 'coinbase' | 'gemini') => {
    setRefreshingExchange(exchange)
    setError(null)
    try {
      const res = await fetch(`/api/refresh/${exchange}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        console.error(`${exchange} refresh error:`, json)
        throw new Error(json.details || json.error || res.statusText)
      }
      await fetchBalances()
    } catch (err: any) {
      console.error(`Error refreshing ${exchange}:`, err)
      setError(err.message)
    } finally {
      setRefreshingExchange(null)
    }
  }

  const refreshCoinbase = () => refreshExchange('coinbase')
  const refreshGemini = () => refreshExchange('gemini')

  useEffect(() => {
    fetchBalances()
  }, [])

  const totalBalance = balances.reduce((sum, b) => sum + b.amount, 0)

  // Group balances by exchange for better organization
  const coinbaseBalances = balances.filter(b => b.exchange === 'coinbase')
  const geminiBalances = balances.filter(b => b.exchange === 'gemini')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Balances</h1>
              <p className="mt-1 text-sm text-gray-500">
                Total Balance: {totalBalance.toFixed(2)} USD
              </p>
              <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                <span>Coinbase: {coinbaseBalances.length} currencies</span>
                <span>Gemini: {geminiBalances.length} currencies</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={refreshCoinbase}
                disabled={loading || refreshingExchange === 'coinbase'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refreshingExchange === 'coinbase' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  'Refresh Coinbase'
                )}
              </button>
              
              <button
                onClick={refreshGemini}
                disabled={loading || refreshingExchange === 'gemini'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refreshingExchange === 'gemini' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  'Refresh Gemini'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {balances.map((b) => (
                  <tr key={`${b.exchange}-${b.currency}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        b.exchange === 'coinbase' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {b.exchange}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{b.currency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.amount.toFixed(8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(b.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
                {balances.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No balances found. Connect your exchanges in Settings to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
