import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { currencies } = await req.json()
    
    if (!currencies || !Array.isArray(currencies) || currencies.length === 0) {
      return NextResponse.json({ error: 'Invalid currencies array' }, { status: 400 })
    }

    // Handle symbol mapping for rebranded tokens
    const symbolMapping: Record<string, string> = {
      'MATIC': 'POL'  // Polygon was rebranded from MATIC to POL
    }
    
    // Map symbols and handle USD as special case
    const mappedCurrencies = currencies.map(currency => symbolMapping[currency] || currency)
    const cryptoCurrencies = mappedCurrencies.filter(currency => currency !== 'USD')
    
    // CoinMarketCap API expects comma-separated symbols
    const symbols = cryptoCurrencies.join(',')
    
    // Transform the response to a simple currency -> price mapping
    const prices: Record<string, number> = {}
    
    // Handle USD as special case - always $1.00
    if (currencies.includes('USD')) {
      prices['USD'] = 1.0
    }
    
    if (cryptoCurrencies.length > 0) {
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=USD&skip_invalid=true`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY!,
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('CoinMarketCap API error:', response.status, response.statusText)
        return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
      }

      const data = await response.json()
      
      if (data.data) {
        Object.entries(data.data).forEach(([symbol, info]: [string, any]) => {
          if (info?.quote?.USD?.price) {
            // Map back to original symbol if needed
            const originalSymbol = Object.keys(symbolMapping).find(key => symbolMapping[key] === symbol) || symbol
            prices[originalSymbol] = info.quote.USD.price
          }
        })
      }
    }

    return NextResponse.json({ prices })
    
  } catch (error: any) {
    console.error('Error fetching prices:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
} 