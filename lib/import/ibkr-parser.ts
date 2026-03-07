import * as cheerio from 'cheerio';

export interface IBKRExtracted {
  accountInformation: any[]
  netAssetValue: any[]
  mtmPerformance: any[]
  realizedUnrealized: any[]
  cashReport: any[]
  openPositions: any[]
  forexBalances: any[]
  trades: any[]
  transactionFees: any[]
  depositsWithdrawals: any[]
  dividends: any[]
  withholdingTax: any[]
  interest: any[]
  interestAccruals: any[]
  changeDividendAccruals: any[]
  financialInstrumentInfo: any[]
  codes: any[]
}

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function getCellText($: cheerio.CheerioAPI, cell: cheerio.Element) {
  return normalizeText($(cell).text())
}

function parseNumber(value: string) {
  const text = normalizeText(value)
  if (!text || text === '--') return null
  return Number(text.replace(/,/g, ''))
}

function getSectionTable($: cheerio.CheerioAPI, idPrefix: string) {
  const header = $(`div.sectionHeadingClosed[id^="${idPrefix}"]`).first()
  return header.next('div').find('table').first()
}

function getAccountValue($: cheerio.CheerioAPI, cell: cheerio.Element) {
  const html = $(cell).html() ?? ''
  return normalizeText(
    html
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' ')
  ).replace(/\s*\n\s*/g, '\n')
}

export function parseIbkrActivity(html: string): IBKRExtracted {
  const $ = cheerio.load(html);

  const accountInformation: IBKRExtracted['accountInformation'] = [];
  const accountTable = getSectionTable($, 'secAccountInformation')
  accountTable.find('tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length >= 2) {
      accountInformation.push({
        key: getCellText($, cells.get(0)),
        value: getAccountValue($, cells.get(1)),
      })
    }
  })

  const netAssetValue: IBKRExtracted['netAssetValue'] = []
  const navTable = getSectionTable($, 'secNAV')
  navTable.find('tr').each((_, row) => {
    const $row = $(row)
    if ($row.find('th').length || $row.hasClass('subtotal')) return
    const cells = $row.find('td')
    if (cells.length === 6) {
      const item = getCellText($, cells.get(0))
      if (!item || item.startsWith('Time Weighted')) return
      netAssetValue.push({
        Item: item,
        Total: parseNumber(getCellText($, cells.get(1))),
        Long: parseNumber(getCellText($, cells.get(2))),
        Short: parseNumber(getCellText($, cells.get(3))),
        'Current Total': parseNumber(getCellText($, cells.get(4))),
        Change: parseNumber(getCellText($, cells.get(5))),
      })
    }
  })

  const mtmPerformance: IBKRExtracted['mtmPerformance'] = []
  const mtmTable = getSectionTable($, 'secMtmPerfSumByUnderlying')
  let mtmType = ''
  mtmTable.find('tr').each((_, row) => {
    const $row = $(row)
    const asset = $row.find('td.header-asset')
    if (asset.length) {
      mtmType = normalizeText(asset.text()).toLowerCase()
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 11) {
      mtmPerformance.push({
        type: mtmType,
        Symbol: getCellText($, cells.get(0)),
        Prior: parseNumber(getCellText($, cells.get(1))),
        Current: parseNumber(getCellText($, cells.get(2))),
        'Prior Price': parseNumber(getCellText($, cells.get(3))),
        'Current Price': parseNumber(getCellText($, cells.get(4))),
        Position: parseNumber(getCellText($, cells.get(5))),
        Transaction: parseNumber(getCellText($, cells.get(6))),
        Commissions: parseNumber(getCellText($, cells.get(7))),
        Other: parseNumber(getCellText($, cells.get(8))),
        Total: parseNumber(getCellText($, cells.get(9))),
        Code: getCellText($, cells.get(10)),
      })
    }
  })

  const realizedUnrealized: IBKRExtracted['realizedUnrealized'] = []
  const realizedTable = getSectionTable($, 'secFIFOPerfSumByUnderlying')
  let realizedType = ''
  realizedTable.find('tr').each((_, row) => {
    const $row = $(row)
    const asset = $row.find('td.header-asset')
    if (asset.length) {
      realizedType = normalizeText(asset.text()).toLowerCase()
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 14) {
      realizedUnrealized.push({
        type: realizedType,
        Symbol: getCellText($, cells.get(0)),
        'Cost Adj.': parseNumber(getCellText($, cells.get(1))),
        'S/T Profit': parseNumber(getCellText($, cells.get(2))),
        'S/T Loss': parseNumber(getCellText($, cells.get(3))),
        'L/T Profit': parseNumber(getCellText($, cells.get(4))),
        'L/T Loss': parseNumber(getCellText($, cells.get(5))),
        'Realized Total': parseNumber(getCellText($, cells.get(6))),
        'Unrealized S/T Profit': parseNumber(getCellText($, cells.get(7))),
        'Unrealized S/T Loss': parseNumber(getCellText($, cells.get(8))),
        'Unrealized L/T Profit': parseNumber(getCellText($, cells.get(9))),
        'Unrealized L/T Loss': parseNumber(getCellText($, cells.get(10))),
        'Unrealized Total': parseNumber(getCellText($, cells.get(11))),
        Total: parseNumber(getCellText($, cells.get(12))),
        Code: getCellText($, cells.get(13)),
      })
    }
  })

  const cashReport: IBKRExtracted['cashReport'] = []
  const cashTable = getSectionTable($, 'secCashReport')
  let cashCurrency = ''
  cashTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      cashCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length) return
    const cells = $row.find('td')
    if (cells.length === 4 && !$row.hasClass('subtotal') && !$row.hasClass('total')) {
      const label = getCellText($, cells.get(0))
      cashReport.push({
        currency: cashCurrency,
        label,
        col1: parseNumber(getCellText($, cells.get(1))),
        col2: parseNumber(getCellText($, cells.get(2))),
        col3: parseNumber(getCellText($, cells.get(3))),
      })
    }
  })

  const openPositions: IBKRExtracted['openPositions'] = []
  const openPositionsTable = getSectionTable($, 'secOpenPositions')
  let openCurrency = ''
  openPositionsTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      openCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total') || $row.find('td.header-asset').length) return
    const cells = $row.find('td')
    if (cells.length === 9) {
      openPositions.push({
        currency: openCurrency,
        Symbol: getCellText($, cells.get(0)),
        Quantity: parseNumber(getCellText($, cells.get(1))),
        Mult: parseNumber(getCellText($, cells.get(2))),
        'Cost Price': parseNumber(getCellText($, cells.get(3))),
        'Cost Basis': parseNumber(getCellText($, cells.get(4))),
        'Close Price': parseNumber(getCellText($, cells.get(5))),
        Value: parseNumber(getCellText($, cells.get(6))),
        'Unrealized P/L': parseNumber(getCellText($, cells.get(7))),
        Code: getCellText($, cells.get(8)),
      })
    }
  })

  const forexBalances: IBKRExtracted['forexBalances'] = []
  const forexTable = getSectionTable($, 'secFxPositions')
  forexTable.find('tr').each((_, row) => {
    const $row = $(row)
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total') || $row.find('td.header-asset').length || $row.find('td.header-currency').length) return
    const cells = $row.find('td')
    if (cells.length === 8) {
      const description = getCellText($, cells.get(0))
      forexBalances.push({
        currency: description,
        Description: description,
        Quantity: parseNumber(getCellText($, cells.get(1))),
        'Cost Price': parseNumber(getCellText($, cells.get(2))),
        'Cost Basis in SGD': parseNumber(getCellText($, cells.get(3))),
        'Close Price': parseNumber(getCellText($, cells.get(4))),
        'Value in SGD': parseNumber(getCellText($, cells.get(5))),
        'Unrealized P/L in SGD': parseNumber(getCellText($, cells.get(6))),
        Code: getCellText($, cells.get(7)),
      })
    }
  })

  const trades: IBKRExtracted['trades'] = []
  const tradesTable = getSectionTable($, 'secTransactions')
  let tradesCurrency = ''
  tradesTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      tradesCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.find('td.header-asset').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 11) {
      trades.push({
        currency: tradesCurrency,
        symbol: getCellText($, cells.get(0)),
        datetime: getCellText($, cells.get(1)),
        quantity: parseNumber(getCellText($, cells.get(2))),
        tprice: getCellText($, cells.get(3)),
        cprice: getCellText($, cells.get(4)),
        proceeds: getCellText($, cells.get(5)),
        comissions: getCellText($, cells.get(6)),
        bassis: getCellText($, cells.get(7)),
        realisedpnl: getCellText($, cells.get(8)),
        mtmpnl: getCellText($, cells.get(9)),
        code: getCellText($, cells.get(10)),
      })
    }
  })

  const transactionFees: IBKRExtracted['transactionFees'] = []
  const feeTable = getSectionTable($, 'secTransactionsTax')
  let feeCurrency = ''
  feeTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      feeCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.find('td.header-asset').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 7) {
      transactionFees.push({
        currency: feeCurrency,
        DateTime: getCellText($, cells.get(0)),
        Symbol: getCellText($, cells.get(1)),
        Description: getCellText($, cells.get(2)),
        Quantity: parseNumber(getCellText($, cells.get(3))),
        'Trade Price': getCellText($, cells.get(4)),
        Amount: parseNumber(getCellText($, cells.get(5))),
        Code: getCellText($, cells.get(6)),
      })
    }
  })

  const depositsWithdrawals: IBKRExtracted['depositsWithdrawals'] = []
  const depositsTable = getSectionTable($, 'secCombDepWith')
  let depositCurrency = ''
  depositsTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      depositCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 3) {
      depositsWithdrawals.push({
        currency: depositCurrency,
        Date: getCellText($, cells.get(0)),
        Description: getCellText($, cells.get(1)),
        Amount: parseNumber(getCellText($, cells.get(2))),
      })
    }
  })

  const dividends: IBKRExtracted['dividends'] = []
  const dividendTable = getSectionTable($, 'secCombDiv')
  let dividendCurrency = ''
  dividendTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      dividendCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 3) {
      dividends.push({
        currency: dividendCurrency,
        Date: getCellText($, cells.get(0)),
        Description: getCellText($, cells.get(1)),
        Amount: parseNumber(getCellText($, cells.get(2))),
      })
    }
  })

  const withholdingTax: IBKRExtracted['withholdingTax'] = []
  const withholdingTable = getSectionTable($, 'secWithholdingTax')
  let withholdingCurrency = ''
  withholdingTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      withholdingCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 4) {
      withholdingTax.push({
        currency: withholdingCurrency,
        Date: getCellText($, cells.get(0)),
        Description: getCellText($, cells.get(1)),
        Amount: parseNumber(getCellText($, cells.get(2))),
        Code: getCellText($, cells.get(3)),
      })
    }
  })

  const interest: IBKRExtracted['interest'] = []
  const interestTable = getSectionTable($, 'secCombInt')
  let interestCurrency = ''
  interestTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      interestCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 3) {
      interest.push({
        currency: interestCurrency,
        Date: getCellText($, cells.get(0)),
        Description: getCellText($, cells.get(1)),
        Amount: parseNumber(getCellText($, cells.get(2))),
      })
    }
  })

  const interestAccruals: IBKRExtracted['interestAccruals'] = []
  const interestAccrualTable = getSectionTable($, 'secInterestAccruals')
  let accrualCurrency = ''
  interestAccrualTable.find('tr').each((_, row) => {
    const $row = $(row)
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      accrualCurrency = normalizeText(currencyHeader.text())
      return
    }
    const cells = $row.find('td')
    if (cells.length === 2) {
      interestAccruals.push({
        currency: accrualCurrency,
        label: getCellText($, cells.get(0)),
        value: parseNumber(getCellText($, cells.get(1))),
      })
    }
  })

  const changeDividendAccruals: IBKRExtracted['changeDividendAccruals'] = []
  const changeDividendTable = getSectionTable($, 'secChangeInDividend')
  let dividendAccrualCurrency = ''
  let dividendAccrualType = ''
  changeDividendTable.find('tr').each((_, row) => {
    const $row = $(row)
    const asset = $row.find('td.header-asset')
    if (asset.length) {
      dividendAccrualType = normalizeText(asset.text())
      return
    }
    const currencyHeader = $row.find('td.header-currency')
    if (currencyHeader.length) {
      dividendAccrualCurrency = normalizeText(currencyHeader.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('subtotal') || $row.hasClass('total')) return
    const cells = $row.find('td')
    if (cells.length === 11) {
      changeDividendAccruals.push({
        type: dividendAccrualType,
        currency: dividendAccrualCurrency,
        Symbol: getCellText($, cells.get(0)),
        Date: getCellText($, cells.get(1)),
        'Ex Date': getCellText($, cells.get(2)),
        'Pay Date': getCellText($, cells.get(3)),
        Quantity: parseNumber(getCellText($, cells.get(4))),
        Tax: parseNumber(getCellText($, cells.get(5))),
        Fee: parseNumber(getCellText($, cells.get(6))),
        'Gross Rate': parseNumber(getCellText($, cells.get(7))),
        'Gross Amount': parseNumber(getCellText($, cells.get(8))),
        'Net Amount': parseNumber(getCellText($, cells.get(9))),
        Code: getCellText($, cells.get(10)),
      })
    }
  })

  const financialInstrumentInfo: IBKRExtracted['financialInstrumentInfo'] = []
  const instrumentTable = getSectionTable($, 'secContractInfo')
  let instrumentType = ''
  instrumentTable.find('tr').each((_, row) => {
    const $row = $(row)
    const asset = $row.find('td.header-asset')
    if (asset.length) {
      instrumentType = normalizeText(asset.text())
      return
    }
    if ($row.find('th').length || $row.hasClass('border-top')) return
    const cells = $row.find('td')
    if (cells.length === 9) {
      financialInstrumentInfo.push({
        type: instrumentType,
        Symbol: getCellText($, cells.get(0)),
        Description: getCellText($, cells.get(1)),
        Conid: getCellText($, cells.get(2)),
        'Security ID': getCellText($, cells.get(3)),
        Underlying: getCellText($, cells.get(4)),
        'Listing Exch': getCellText($, cells.get(5)),
        Multiplier: getCellText($, cells.get(6)),
        Type: getCellText($, cells.get(7)),
        Code: getCellText($, cells.get(8)),
      })
    }
  })

  const codes: IBKRExtracted['codes'] = []
  const codesTable = getSectionTable($, 'secCodes')
  codesTable.find('tr').each((_, row) => {
    const $row = $(row)
    if ($row.find('th').length) return
    const cells = $row.find('td')
    if (cells.length === 4) {
      const leftCode = getCellText($, cells.get(0))
      const leftMeaning = getCellText($, cells.get(1))
      const rightCode = getCellText($, cells.get(2))
      const rightMeaning = getCellText($, cells.get(3))
      if (leftCode) codes.push({ code: leftCode, meaning: leftMeaning })
      if (rightCode) codes.push({ code: rightCode, meaning: rightMeaning })
    }
  })

  return {
    accountInformation,
    netAssetValue,
    mtmPerformance,
    realizedUnrealized,
    cashReport,
    openPositions,
    forexBalances,
    trades,
    transactionFees,
    depositsWithdrawals,
    dividends,
    withholdingTax,
    interest,
    interestAccruals,
    changeDividendAccruals,
    financialInstrumentInfo,
    codes,
  };
}
