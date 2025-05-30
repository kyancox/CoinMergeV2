import { NextRequest, NextResponse } from 'next/server'

interface CoinMarketCapQuote {
  USD?: {
    price?: number;
  };
}

interface CoinMarketCapInfo {
  quote?: CoinMarketCapQuote;
  name?: string;
}

interface CoinMarketCapData {
  data?: Record<string, CoinMarketCapInfo>;
}

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
    
    // Transform the response to include both prices and names
    const prices: Record<string, number> = {}
    const names: Record<string, string> = {}
    
    // Handle USD as special case - always $1.00
    if (currencies.includes('USD')) {
      prices['USD'] = 1.0
      names['USD'] = 'US Dollar'
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

      const data: CoinMarketCapData = await response.json()
      
      if (data.data) {
        Object.entries(data.data).forEach(([symbol, info]) => {
          if (info?.quote?.USD?.price && info?.name) {
            // Map back to original symbol if needed
            const originalSymbol = Object.keys(symbolMapping).find(key => symbolMapping[key] === symbol) || symbol
            prices[originalSymbol] = info.quote.USD.price
            names[originalSymbol] = info.name
          }
        })
      }
    }

    return NextResponse.json({ prices, names })
    
  } catch (error: unknown) {
    console.error('Error fetching prices:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
} 