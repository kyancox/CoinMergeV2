import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { currencies } = await req.json()
    
    if (!currencies || !Array.isArray(currencies) || currencies.length === 0) {
      return NextResponse.json({ error: 'Invalid currencies array' }, { status: 400 })
    }

    // CoinMarketCap API expects comma-separated symbols
    const symbols = currencies.join(',')
    
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
    
    // Transform the response to a simple currency -> price mapping
    const prices: Record<string, number> = {}
    
    if (data.data) {
      Object.entries(data.data).forEach(([symbol, info]: [string, any]) => {
        if (info?.quote?.USD?.price) {
          prices[symbol] = info.quote.USD.price
        }
      })
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