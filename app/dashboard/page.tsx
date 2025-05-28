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

type SortField = 'currency' | 'name' | 'amount' | 'price' | 'usdValue'
type SortDirection = 'asc' | 'desc'

export default function DashboardPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [prices, setPrices] = useState<PriceData>({})
  const [names, setNames] = useState<NameData>({})
  const [loading, setLoading] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [refreshingExchange, setRefreshingExchange] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedExchange, setSelectedExchange] = useState<'portfolio' | string>('portfolio')
  const [sortField, setSortField] = useState<SortField>('usdValue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showSyncDropdown, setShowSyncDropdown] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

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

  const refreshPrices = async () => {
    if (balances.length === 0) return
    
    const uniqueCurrencies = [...new Set(balances.map(b => b.currency))]
    await fetchPrices(uniqueCurrencies)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showSyncDropdown && !target.closest('.sync-dropdown')) {
        setShowSyncDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSyncDropdown])

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
  ).sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortField) {
      case 'currency':
        aValue = a.currency.toLowerCase()
        bValue = b.currency.toLowerCase()
        break
      case 'name':
        aValue = (names[a.currency] || a.currency).toLowerCase()
        bValue = (names[b.currency] || b.currency).toLowerCase()
        break
      case 'amount':
        aValue = a.totalAmount
        bValue = b.totalAmount
        break
      case 'price':
        aValue = prices[a.currency] || 0
        bValue = prices[b.currency] || 0
        break
      case 'usdValue':
        aValue = a.usdValue || 0
        bValue = b.usdValue || 0
        break
      default:
        aValue = a.usdValue || 0
        bValue = b.usdValue || 0
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const totalBalance = aggregatedBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0)

  // Group balances by exchange for stats
  const coinbaseBalances = balances.filter(b => b.exchange === 'coinbase')
  const geminiBalances = balances.filter(b => b.exchange === 'gemini')
  const ledgerBalances = balances.filter(b => b.exchange === 'ledger')

  // Get exchange display name and color
  const getExchangeInfo = (exchange: string) => {
    switch (exchange) {
      case 'coinbase':
        return { name: 'Coinbase', color: 'bg-[#011082] hover:bg-[#010f73] border-[#011082]' }
      case 'gemini':
        return { name: 'Gemini', color: 'bg-[#4796E3] hover:bg-[#3a85d1] border-[#4796E3]' }
      case 'ledger':
        return { name: 'Ledger', color: 'bg-[#d0a1f8] hover:bg-[#c48ff6] border-[#d0a1f8]' }
      default:
        return { name: exchange, color: 'bg-gray-600 hover:bg-gray-700 border-gray-600' }
    }
  }

  // Get last updated time for each exchange
  const getExchangeLastUpdated = (exchange: string) => {
    const exchangeBalances = balances.filter(b => b.exchange === exchange)
    if (exchangeBalances.length === 0) return null
    
    const latestUpdate = Math.max(...exchangeBalances.map(b => new Date(b.updated_at).getTime()))
    return new Date(latestUpdate)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-start lg:space-y-0 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
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
              <div className="mt-2 flex flex-wrap gap-2 lg:gap-4 text-xs text-gray-500">
                {selectedExchange === 'portfolio' ? (
                  <>
                    <span>{aggregatedBalances.length} unique currencies</span>
                    <span>{uniqueExchanges.length} connected exchanges</span>
                    <span className="hidden lg:inline">Coinbase: {coinbaseBalances.length} currencies</span>
                    <span className="hidden lg:inline">Gemini: {geminiBalances.length} currencies</span>
                    <span className="hidden lg:inline">Ledger: {ledgerBalances.length} currencies</span>
                  </>
                ) : (
                  <>
                    <span>{aggregatedBalances.length} currencies</span>
                    <span className="hidden lg:inline">Last updated: {(() => {
                      const lastUpdated = getExchangeLastUpdated(selectedExchange)
                      return lastUpdated ? lastUpdated.toLocaleString() : 'Never'
                    })()}</span>
                  </>
                )}
              </div>
              
              {/* Exchange Last Updated Section */}
              {selectedExchange === 'portfolio' && uniqueExchanges.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <h3 className="text-xs font-medium text-gray-700 mb-2">Last Updated</h3>
                  <div className="flex flex-col lg:flex-row lg:flex-wrap gap-2 lg:gap-4 text-xs text-gray-600">
                    {uniqueExchanges.map((exchange) => {
                      const lastUpdated = getExchangeLastUpdated(exchange)
                      const exchangeInfo = getExchangeInfo(exchange)
                      return (
                        <div key={exchange} className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${exchangeInfo.color}`}></span>
                          <span className="font-medium">{exchangeInfo.name}:</span>
                          <span className="truncate">{lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex flex-col space-y-3 lg:hidden w-full">
              {/* Exchange Filter Tabs - Mobile */}
              <div className="flex rounded-md shadow-sm overflow-x-auto w-full">
                <button
                  onClick={() => setSelectedExchange('portfolio')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-md border whitespace-nowrap ${
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
                      className={`flex-1 px-3 py-2 text-sm font-medium border-t border-r border-b whitespace-nowrap ${
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

              {/* Action Buttons Row - Mobile */}
              <div className="flex space-x-2">
                <button
                  onClick={refreshPrices}
                  disabled={loadingPrices}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingPrices ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>

                {/* Sync Dropdown - Mobile */}
                <div className="relative sync-dropdown flex-1">
                  <button
                    onClick={() => setShowSyncDropdown(!showSyncDropdown)}
                    disabled={refreshingExchange !== null}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {refreshingExchange ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing {refreshingExchange}...
                      </>
                    ) : (
                      <>
                        Sync
                        <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>

                  {showSyncDropdown && (
                    <div className="absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        {/* Only show Coinbase option if there are Coinbase balances */}
                        {coinbaseBalances.length > 0 && (
                          <button
                            onClick={() => {
                              setShowSyncDropdown(false)
                              refreshCoinbase()
                            }}
                            disabled={refreshingExchange !== null}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            role="menuitem"
                          >
                            <div className="w-3 h-3 bg-[#011082] rounded-full mr-3"></div>
                            Sync Coinbase
                          </button>
                        )}
                        
                        {/* Only show Gemini option if there are Gemini balances */}
                        {geminiBalances.length > 0 && (
                          <button
                            onClick={() => {
                              setShowSyncDropdown(false)
                              refreshGemini()
                            }}
                            disabled={refreshingExchange !== null}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            role="menuitem"
                          >
                            <div className="w-3 h-3 bg-[#4796E3] rounded-full mr-3"></div>
                            Sync Gemini
                          </button>
                        )}
                        
                        {coinbaseBalances.length === 0 && geminiBalances.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No exchanges connected
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Controls - Redesigned Layout */}
            <div className="hidden lg:flex flex-col items-end space-y-3">
              {/* Action Buttons - Top Right */}
              <div className="flex space-x-3">
                {/* Refresh Prices Button */}
                <button
                  onClick={refreshPrices}
                  disabled={loadingPrices}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingPrices ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Prices
                    </>
                  )}
                </button>

                {/* Sync Dropdown */}
                <div className="relative sync-dropdown">
                  <button
                    onClick={() => setShowSyncDropdown(!showSyncDropdown)}
                    disabled={refreshingExchange !== null}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {refreshingExchange ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing {refreshingExchange}...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync
                        <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>

                  {showSyncDropdown && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        {/* Only show Coinbase option if there are Coinbase balances */}
                        {coinbaseBalances.length > 0 && (
                          <button
                            onClick={() => {
                              setShowSyncDropdown(false)
                              refreshCoinbase()
                            }}
                            disabled={refreshingExchange !== null}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            role="menuitem"
                          >
                            <div className="w-3 h-3 bg-[#011082] rounded-full mr-3"></div>
                            Sync Coinbase
                          </button>
                        )}
                        
                        {/* Only show Gemini option if there are Gemini balances */}
                        {geminiBalances.length > 0 && (
                          <button
                            onClick={() => {
                              setShowSyncDropdown(false)
                              refreshGemini()
                            }}
                            disabled={refreshingExchange !== null}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            role="menuitem"
                          >
                            <div className="w-3 h-3 bg-[#4796E3] rounded-full mr-3"></div>
                            Sync Gemini
                          </button>
                        )}
                        
                        {/* Show message if no exchanges are connected */}
                        {coinbaseBalances.length === 0 && geminiBalances.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No exchanges connected
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Button */}
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

              {/* Portfolio Toggle Tabs - Below Action Buttons */}
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

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="space-y-4">
              {aggregatedBalances.map((balance) => (
                <div key={balance.currency} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 uppercase">{balance.currency}</h3>
                      <p className="text-sm text-gray-600">{names[balance.currency] || 'Loading...'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {balance.usdValue ? (
                          `$${balance.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-gray-400 text-sm">
                            {loadingPrices ? 'Loading...' : 'Price unavailable'}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {prices[balance.currency] ? (
                          `$${prices[balance.currency].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                        ) : (
                          <span className="text-gray-400">
                            {loadingPrices ? 'Loading...' : 'Price unavailable'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{balance.totalAmount.toFixed(8)}</span>
                  </div>
                  
                  {selectedExchange === 'portfolio' && (
                    <div className="flex flex-wrap gap-1">
                      {balance.exchanges.map((exchange) => (
                        <span
                          key={exchange}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            exchange === 'coinbase' 
                              ? 'bg-[#011082]/10 text-[#011082]' 
                              : exchange === 'gemini' 
                                ? 'bg-[#4796E3]/10 text-[#4796E3]'
                                : exchange === 'ledger'
                                  ? 'bg-[#d0a1f8]/10 text-[#d0a1f8]'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {exchange}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aggregatedBalances.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-gray-500">
                  {selectedExchange === 'portfolio' 
                    ? 'No balances found. Connect your exchanges in Settings to get started.'
                    : `No balances found for ${getExchangeInfo(selectedExchange).name}.`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('currency')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Currency</span>
                      <SortIcon field="currency" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{selectedExchange === 'portfolio' ? 'Total Amount' : 'Amount'}</span>
                      <SortIcon field="amount" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Price</span>
                      <SortIcon field="price" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('usdValue')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>USD Value</span>
                      <SortIcon field="usdValue" />
                    </div>
                  </th>
                  {selectedExchange === 'portfolio' && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchanges</th>
                  )}
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
                      {prices[balance.currency] ? (
                        `$${prices[balance.currency].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                      ) : (
                        <span className="text-gray-400">
                          {loadingPrices ? 'Loading...' : 'Price unavailable'}
                        </span>
                      )}
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
                                  ? 'bg-[#011082]/10 text-[#011082]' 
                                  : exchange === 'gemini' 
                                    ? 'bg-[#4796E3]/10 text-[#4796E3]'
                                    : exchange === 'ledger'
                                      ? 'bg-[#d0a1f8]/10 text-[#d0a1f8]'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
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
