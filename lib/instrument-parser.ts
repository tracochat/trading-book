// Asset categories matching the database schema
type AssetCategory = 'Stocks' | 'Equity and Index Options' | 'Bonds' | 'Cash' | 'Futures' | 'Forex' | 'Funds' | 'Warrants' | 'CFD' | 'Other'

export interface BulkInstrument {
  symbol: string
  description: string | null
  listing_exchange: string | null
  issuer_country_code: string | null
  asset_category: AssetCategory
  currency: string
  multiplier: number
  is_active: boolean
  is_traded: boolean
}

// Parse NASDAQ Traded symbols file (nasdaqtraded.txt)
// Format: Nasdaq Traded|Symbol|Security Name|Listing Exchange|Market Category|ETF|Round Lot Size|Test Issue|Financial Status|CQS Symbol|NASDAQ Symbol|NextShares
export function parseNasdaqTradedFile(content: string): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  const instruments: BulkInstrument[] = []
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|')
    if (parts.length < 3) continue
    
    const nasdaqTraded = parts[0]?.trim()
    const symbol = parts[1]?.trim()
    const securityName = parts[2]?.trim()
    const listingExchange = parts[3]?.trim()
    const isETF = parts[5]?.trim() === 'Y'
    const testIssue = parts[7]?.trim() === 'Y'
    
    // Skip test issues and empty symbols
    if (testIssue || !symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: securityName || null,
      listing_exchange: listingExchange || 'NASDAQ',
      issuer_country_code: 'US',
      asset_category: isETF ? 'Funds' : 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: nasdaqTraded === 'Y',
      is_traded: false,
    })
  }
  
  return instruments
}

// Parse NASDAQ Other Listed symbols file (otherlisted.txt)
// Format: ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
export function parseNasdaqOtherListedFile(content: string): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  const instruments: BulkInstrument[] = []
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|')
    if (parts.length < 3) continue
    
    const symbol = parts[0]?.trim()
    const securityName = parts[1]?.trim()
    const exchange = parts[2]?.trim()
    const isETF = parts[4]?.trim() === 'Y'
    const testIssue = parts[6]?.trim() === 'Y'
    
    // Skip test issues and empty symbols
    if (testIssue || !symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: securityName || null,
      listing_exchange: exchange || null,
      issuer_country_code: 'US',
      asset_category: isETF ? 'Funds' : 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: true,
      is_traded: false,
    })
  }
  
  return instruments
}

// Parse NYSE JSON file
// Format: [{ normalizedTicker, instrumentName, url, ... }]
export function parseNyseJsonFile(content: string): BulkInstrument[] {
  const instruments: BulkInstrument[] = []
  
  try {
    const data = JSON.parse(content) as Array<{
      normalizedTicker?: string
      symbolExchangeTicker?: string
      instrumentName?: string
      url?: string
    }>
    
    for (const item of data) {
      const symbol = item.normalizedTicker || item.symbolExchangeTicker
      if (!symbol || symbol.length > 10) continue
      
      // Determine exchange from URL if available
      let exchange = 'NYSE'
      if (item.url) {
        if (item.url.includes('XNYS')) exchange = 'NYSE'
        else if (item.url.includes('XASE')) exchange = 'AMEX'
        else if (item.url.includes('XNAS')) exchange = 'NASDAQ'
        else if (item.url.includes('ARCX')) exchange = 'ARCA'
      }
      
      instruments.push({
        symbol,
        description: item.instrumentName || null,
        listing_exchange: exchange,
        issuer_country_code: 'US',
        asset_category: 'Stocks',
        currency: 'USD',
        multiplier: 1,
        is_active: true,
        is_traded: false,
      })
    }
  } catch (e) {
    console.error('Error parsing NYSE JSON:', e)
  }
  
  return instruments
}

// Parse generic CSV file (with auto-detect columns)
export function parseGenericCsvFile(content: string, separator: string = ','): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  const instruments: BulkInstrument[] = []
  
  // Parse header
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase())
  
  // Find column indices
  const symbolIdx = headers.findIndex(h => 
    h === 'symbol' || h === 'ticker' || h === 'act symbol' || h === 'nasdaq symbol'
  )
  const nameIdx = headers.findIndex(h => 
    h === 'name' || h === 'security name' || h === 'description' || h === 'company name'
  )
  const exchangeIdx = headers.findIndex(h => 
    h === 'exchange' || h === 'listing exchange' || h === 'market'
  )
  const countryIdx = headers.findIndex(h => 
    h === 'country' || h === 'country code'
  )
  
  if (symbolIdx === -1) {
    throw new Error('Could not find symbol column in file. Expected: Symbol, Ticker, ACT Symbol, or NASDAQ Symbol')
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(separator)
    const symbol = parts[symbolIdx]?.trim()
    
    if (!symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: nameIdx >= 0 ? parts[nameIdx]?.trim() || null : null,
      listing_exchange: exchangeIdx >= 0 ? parts[exchangeIdx]?.trim() || null : null,
      issuer_country_code: countryIdx >= 0 ? parts[countryIdx]?.trim() || 'US' : 'US',
      asset_category: 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: true,
      is_traded: false,
    })
  }
  
  return instruments
}

// Auto-detect file format and parse
export function parseInstrumentFile(content: string, filename: string): BulkInstrument[] {
  const lowerFilename = filename.toLowerCase()
  
  // Check if it's JSON
  if (lowerFilename.endsWith('.json') || content.trim().startsWith('[')) {
    return parseNyseJsonFile(content)
  }
  
  // Check if it's pipe-delimited (NASDAQ format)
  if (content.includes('|')) {
    // Check header to determine format
    const firstLine = content.split('\n')[0] || ''
    
    if (firstLine.includes('Nasdaq Traded')) {
      return parseNasdaqTradedFile(content)
    } else if (firstLine.includes('ACT Symbol')) {
      return parseNasdaqOtherListedFile(content)
    }
    
    // Generic pipe-delimited
    return parseGenericCsvFile(content, '|')
  }
  
  // Default to comma-separated
  return parseGenericCsvFile(content, ',')
}
