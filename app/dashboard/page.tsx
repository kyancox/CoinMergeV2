'use client'
import { useEffect, useState } from 'react'

type BalanceRow = {
  exchange: string
  currency: string
  amount: number
  updated_at: string
}

type AggregatedBalance = {
  currency: string
  totalAmount: number
  exchanges: string[]
  lastUpdated: string
  usdValue?: number
}

type PriceData = {
  [currency: string]: number
}

type NameData = {
  [currency: string]: string
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [prices, setPrices] = useState<PriceData>({})
  const [names, setNames] = useState<NameData>({})
  const [loading, setLoading] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [refreshingExchange, setRefreshingExchange] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedExchange, setSelectedExchange] = useState<'portfolio' | string>('portfolio')

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

  const fetchPrices = async (currencies: string[]) => {
    if (currencies.length === 0) return
    
    setLoadingPrices(true)
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      setPrices(json.prices || {})
      setNames(json.names || {})
    } catch (err: any) {
      console.error('Failed to fetch prices:', err)
      // Don't set error state for prices - just log it
    } finally {
      setLoadingPrices(false)
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

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export')
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'portfolio_export.xlsx'
      
      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      setError('Failed to export portfolio')
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [])

  // Fetch prices when balances change
  useEffect(() => {
    if (balances.length > 0) {
      const uniqueCurrencies = [...new Set(balances.map(b => b.currency))]
      fetchPrices(uniqueCurrencies)
    }
  }, [balances])

  // Get unique exchanges that have balances
  const uniqueExchanges = [...new Set(balances.map(b => b.exchange))].sort()

  // Filter balances based on selected exchange
  const filteredBalances = selectedExchange === 'portfolio' 
    ? balances 
    : balances.filter(b => b.exchange === selectedExchange)

  // Aggregate balances by currency (for portfolio view or individual exchange view)
  const aggregatedBalances: AggregatedBalance[] = Object.values(
    filteredBalances.reduce((acc, balance) => {
      const { currency, amount, exchange, updated_at } = balance
      
      if (!acc[currency]) {
        acc[currency] = {
          currency,
          totalAmount: 0,
          exchanges: [],
          lastUpdated: updated_at,
          usdValue: 0
        }
      }
      
      acc[currency].totalAmount += amount
      if (!acc[currency].exchanges.includes(exchange)) {
        acc[currency].exchanges.push(exchange)
      }
      
      // Keep the most recent update time
      if (new Date(updated_at) > new Date(acc[currency].lastUpdated)) {
        acc[currency].lastUpdated = updated_at
      }
      
      // Calculate USD value
      const price = prices[currency] || 0
      acc[currency].usdValue = acc[currency].totalAmount * price
      
      return acc
    }, {} as Record<string, AggregatedBalance>)
  ).sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0)) // Sort by USD value descending

  const totalBalance = aggregatedBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0)

  // Group balances by exchange for stats
  const coinbaseBalances = balances.filter(b => b.exchange === 'coinbase')
  const geminiBalances = balances.filter(b => b.exchange === 'gemini')
  const ledgerBalances = balances.filter(b => b.exchange === 'ledger')

  // Get exchange display name and color
  const getExchangeInfo = (exchange: string) => {
    switch (exchange) {
      case 'coinbase':
        return { name: 'Coinbase', color: 'bg-blue-600 hover:bg-blue-700 border-blue-600' }
      case 'gemini':
        return { name: 'Gemini', color: 'bg-green-600 hover:bg-green-700 border-green-600' }
      case 'ledger':
        return { name: 'Ledger', color: 'bg-purple-600 hover:bg-purple-700 border-purple-600' }
      default:
        return { name: exchange, color: 'bg-gray-600 hover:bg-gray-700 border-gray-600' }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedExchange === 'portfolio' 
                  ? 'Your Portfolio' 
                  : `${getExchangeInfo(selectedExchange).name} Portfolio`
                }
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {selectedExchange === 'portfolio' 
                  ? `Total Balance: $${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${getExchangeInfo(selectedExchange).name} Balance: $${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
                {loadingPrices && <span className="ml-2 text-xs text-blue-600">Updating prices...</span>}
              </p>
              <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                {selectedExchange === 'portfolio' ? (
                  <>
                    <span>{aggregatedBalances.length} unique currencies</span>
                    <span>{uniqueExchanges.length} connected exchanges</span>
                    <span>Coinbase: {coinbaseBalances.length} currencies</span>
                    <span>Gemini: {geminiBalances.length} currencies</span>
                    <span>Ledger: {ledgerBalances.length} currencies</span>
                  </>
                ) : (
                  <>
                    <span>{aggregatedBalances.length} currencies</span>
                    <span>Last updated: {aggregatedBalances.length > 0 ? new Date(Math.max(...aggregatedBalances.map(b => new Date(b.lastUpdated).getTime()))).toLocaleString() : 'Never'}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              {/* Exchange Filter Tabs */}
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setSelectedExchange('portfolio')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                    selectedExchange === 'portfolio'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } transition-colors`}
                >
                  Portfolio
                </button>
                {uniqueExchanges.map((exchange, index) => {
                  const isLast = index === uniqueExchanges.length - 1
                  const exchangeInfo = getExchangeInfo(exchange)
                  return (
                    <button
                      key={exchange}
                      onClick={() => setSelectedExchange(exchange)}
                      className={`px-4 py-2 text-sm font-medium border-t border-r border-b ${
                        isLast ? 'rounded-r-md' : ''
                      } ${
                        selectedExchange === exchange
                          ? `${exchangeInfo.color} text-white`
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {exchangeInfo.name}
                    </button>
                  )
                })}
              </div>

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

              <button
                onClick={handleExport}
                disabled={loading || loadingPrices}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {selectedExchange === 'portfolio' ? 'Total Amount' : 'Amount'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD Value</th>
                  {selectedExchange === 'portfolio' && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchanges</th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedBalances.map((balance) => (
                  <tr key={balance.currency} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                      {balance.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {names[balance.currency] || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {balance.totalAmount.toFixed(8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {balance.usdValue ? (
                        `$${balance.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-gray-400">
                          {loadingPrices ? 'Loading...' : 'Price unavailable'}
                        </span>
                      )}
                    </td>
                    {selectedExchange === 'portfolio' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {balance.exchanges.map((exchange) => (
                            <span
                              key={exchange}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                exchange === 'coinbase' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : exchange === 'gemini' 
                                    ? 'bg-green-100 text-green-800'
                                    : exchange === 'ledger'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {exchange}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(balance.lastUpdated).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {aggregatedBalances.length === 0 && !loading && (
                  <tr>
                    <td colSpan={selectedExchange === 'portfolio' ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500">
                      {selectedExchange === 'portfolio' 
                        ? 'No balances found. Connect your exchanges in Settings to get started.'
                        : `No balances found for ${getExchangeInfo(selectedExchange).name}.`
                      }
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
