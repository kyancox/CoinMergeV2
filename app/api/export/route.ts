import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ExcelJS from 'exceljs'

type AggregatedBalance = {
  currency: string
  totalAmount: number
  exchanges: string[]
}

async function fetchPricesAndNames(currencies: string[]) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currencies })
    })
    
    if (!response.ok) return { prices: {}, names: {} }
    const data = await response.json()
    return { prices: data.prices || {}, names: data.names || {} }
  } catch (error) {
    console.error('Failed to fetch prices and names for export:', error)
    return { prices: {}, names: {} }
  }
}

export async function GET() {
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

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Fetch balances (excluding zeros)
    const { data: balances, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', user.id)
      .gt('amount', 0)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!balances || balances.length === 0) {
      return NextResponse.json({ error: 'No balances found' }, { status: 404 })
    }

    // Fetch prices and names
    const uniqueCurrencies = [...new Set(balances.map(b => b.currency))]
    const { prices, names } = await fetchPricesAndNames(uniqueCurrencies)

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const currentTime = new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Aggregate balances by currency for Master sheet
    const aggregatedData = balances.reduce((acc, balance) => {
      const { currency, amount, exchange } = balance
      
      if (!acc[currency]) {
        acc[currency] = {
          currency,
          totalAmount: 0,
          exchanges: []
        }
      }
      
      acc[currency].totalAmount += parseFloat(amount)
      if (!acc[currency].exchanges.includes(exchange)) {
        acc[currency].exchanges.push(exchange)
      }
      
      return acc
    }, {} as Record<string, AggregatedBalance>)

    const aggregatedBalances = (Object.values(aggregatedData) as AggregatedBalance[]).sort((a, b) => {
      const aValue = a.totalAmount * (prices[a.currency] || 0)
      const bValue = b.totalAmount * (prices[b.currency] || 0)
      return bValue - aValue
    })

    // Create Master sheet
    const masterSheet = workbook.addWorksheet('Master')
    
    // Master sheet headers
    masterSheet.addRow([
      'Symbol',
      'Name', 
      'Amount',
      `Balance at ${currentTime}`,
      `Price at ${currentTime}`,
      'Exchanges with Asset'
    ])

    let masterTotal = 0
    
    // Add master data
    aggregatedBalances.forEach((item: AggregatedBalance) => {
      const price = prices[item.currency] || 0
      const balance = item.totalAmount * price
      masterTotal += balance
      
      masterSheet.addRow([
        item.currency,
        names[item.currency] || 'Name Not Found',
        item.totalAmount,
        balance,
        price,
        item.exchanges.map(e => `'${e}'`).join(', ')
      ])
    })

    // Add total balance row to master
    masterSheet.addRow(['', '', '', '', '', '']) // Add empty row
    const masterTotalRow = masterSheet.addRow(['', '', '', masterTotal, '', ''])
    masterSheet.getCell(`C${masterTotalRow.number}`).value = 'Total Balance:'

    // Format Master sheet
    formatSheet(masterSheet, true)

    // Create individual exchange sheets
    const exchanges = [...new Set(balances.map(b => b.exchange))]
    
    for (const exchange of exchanges) {
      const exchangeBalances = balances
        .filter(b => b.exchange === exchange)
        .sort((a, b) => {
          const aValue = parseFloat(a.amount) * (prices[a.currency] || 0)
          const bValue = parseFloat(b.amount) * (prices[b.currency] || 0)
          return bValue - aValue
        })

      const sheet = workbook.addWorksheet(exchange.charAt(0).toUpperCase() + exchange.slice(1))
      
      // Exchange sheet headers (no Exchanges column)
      sheet.addRow([
        'Symbol',
        'Name',
        'Amount', 
        `Balance at ${currentTime}`,
        `Price at ${currentTime}`
      ])

      let exchangeTotal = 0

      // Add exchange data
      exchangeBalances.forEach(balance => {
        const price = prices[balance.currency] || 0
        const balanceValue = parseFloat(balance.amount) * price
        exchangeTotal += balanceValue

        sheet.addRow([
          balance.currency,
          names[balance.currency] || 'Name Not Found',
          parseFloat(balance.amount),
          balanceValue,
          price
        ])
      })

      // Add total balance row
      sheet.addRow(['', '', '', '', '']) // Add empty row
      const totalRow = sheet.addRow(['', '', '', exchangeTotal, ''])
      sheet.getCell(`C${totalRow.number}`).value = 'Total Balance:'

      // Format exchange sheet
      formatSheet(sheet, false)
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return file
    const filename = `master_portfolio_${currentTime.replace(/[/:]/g, '-').replace(/\s/g, '_')}.xlsx`
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error: unknown) {
    console.error('Export error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Export failed',
      details: errorMessage
    }, { status: 500 })
  }
}

function formatSheet(sheet: ExcelJS.Worksheet, isMaster: boolean) {
  // Header formatting
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6E6' }
  }

  // Column widths
  sheet.getColumn(1).width = 10  // Symbol
  sheet.getColumn(2).width = 20  // Name
  sheet.getColumn(3).width = 15  // Amount
  sheet.getColumn(4).width = 25  // Balance
  sheet.getColumn(5).width = 25  // Price
  if (isMaster) {
    sheet.getColumn(6).width = 25  // Exchanges
  }

  // Number formatting
  const currencyFormat = '$#,##0.00'
  
  // Format balance and price columns
  sheet.getColumn(4).numFmt = currencyFormat
  sheet.getColumn(5).numFmt = currencyFormat

  // Bold the total balance row
  const lastRow = sheet.lastRow
  if (lastRow) {
    lastRow.font = { bold: true }
    lastRow.getCell(4).numFmt = currencyFormat
  }
}