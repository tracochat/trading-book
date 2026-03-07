import { describe, it, expect } from 'vitest'
import { detectPlatform } from '../detect-platform'
import { parseIbkrActivity } from '../ibkr-parser'

// Validation rules for the IBKR activity parser
/*
1. Withholding‑tax entries must include a currency field with each row.
2. Interest records should also carry a currency property.
3. Dividend lines need a currency value as part of the record.
4. The financial instrument information table must supply a `type`
   attribute (for example, "Stocks").
5. Transaction‑fee rows should be returned flat and include currency.
6. Forex balance lines are expected to have an explicit currency column.
7. The codes section should be transformed into an array of objects
   with `code` and `meaning` keys.
8. Change‑in‑dividend‑accrual entries require a currency field per item.
9. Interest accrual summaries must label each vertical item with its
   currency.
10. Open position rows should include a currency value.
11. Cash report items must be prefixed by currency and maintain their
    vertical formatting.
12. Realized & unrealized performance summaries should add a `type`
    field (e.g. "stocks" vs "fx") to each row.
13. MTM performance summaries also need a `type` field for asset class.
14. Net asset value rows are delivered as plain array items without
    nesting.
15. Account information is extracted as a list of key/value pairs,
    preserving line breaks in values.
16. Trades and deposits/withdrawals must already be flat arrays with a
    `currency` property on every record so that grouping can be done
    later.
*/


describe('import utilities', () => {
  it('should guess platform from html fixture', () => {
    const html = require('fs').readFileSync(__dirname + '/IBKR-Activity.htm', 'utf-8')
    const plat = detectPlatform(html)
    expect(plat).toBe('IBKR')
  })

  it('should parse ibkr activity tables', () => {
    const html = require('fs').readFileSync(__dirname + '/IBKR-Activity.htm', 'utf-8')
    const result = parseIbkrActivity(html)
    const keys = [
      'accountInformation','netAssetValue','mtmPerformance','realizedUnrealized',
      'cashReport','openPositions','forexBalances','trades','transactionFees',
      'depositsWithdrawals','dividends','withholdingTax','interest','interestAccruals',
      'changeDividendAccruals','financialInstrumentInfo','codes'
    ]
    expect(Object.keys(result).sort()).toEqual(keys.sort())
    for (const k of keys) {
      expect(Array.isArray((result as any)[k])).toBe(true)
    }
    // verify deposits were extracted correctly (flat list with currency)
    const deps = result.depositsWithdrawals
    expect(deps.length).toBe(2)
    expect(deps).toEqual([
      { currency: 'SGD', Date: '2025-11-15', Description: 'Electronic Fund Transfer', Amount: 15000 },
      { currency: 'SGD', Date: '2025-11-15', Description: 'Electronic Fund Transfer', Amount: 45000 },
    ])

    // verify trades counts and sample rows (flat with currency field)
    const allTrades: any[] = result.trades
    // 3067 appears in HKD block in sample
    const t3067 = allTrades.filter(t => t.symbol === '3067')
    expect(t3067.length).toBe(13)
    expect(t3067[0]).toMatchObject({
      currency: 'HKD', symbol: '3067', datetime: '2025-11-17, 22:29:57', quantity: 10000,
      tprice: '11.9700', cprice: '11.9000', proceeds: '-119,700.00', comissions: '-107.79',
      bassis: '119,807.79', realisedpnl: '0.00', mtmpnl: '-700.00', code: 'O;P',
    })
    const iauTrades = allTrades.filter(t => t.symbol === 'IAU')
    expect(iauTrades.length).toBe(51)
    const lastIAU = iauTrades[iauTrades.length - 1]
    expect(lastIAU).toMatchObject({
      currency: 'USD', symbol: 'IAU', datetime: '2025-11-19, 10:55:06', quantity: -4100,
      tprice: '77.1100', cprice: '76.7800', proceeds: '316,151.00', comissions: '-23.19',
      bassis: '-317,838.52', realisedpnl: '-1,710.71', mtmpnl: '1,353.00', code: 'C;P',
    })

    // additional validation samples per specification
    expect(result.withholdingTax).toEqual([
      { currency: 'USD', Date: '2025-06-27', Description: 'FLCH(US35473P8196) Cash Dividend USD 0.192099 per Share - US Tax', Amount: -126.79, Code: '' },
      { currency: 'USD', Date: '2025-12-29', Description: 'FLCH(US35473P8196) Cash Dividend USD 0.36945 per Share - US Tax', Amount: -365.54, Code: '' },
    ])

    expect(result.interest).toEqual(expect.arrayContaining([
      { currency: 'HKD', Date: '2025-10-03', Description: 'HKD Credit Interest for Sep-2025', Amount: 111.41 },
      { currency: 'HKD', Date: '2025-11-05', Description: 'HKD Credit Interest for Oct-2025', Amount: 126.94 },
      { currency: 'HKD', Date: '2025-12-03', Description: 'HKD Debit Interest for Nov-2025', Amount: -0.46 },
    ]))

    expect(result.dividends).toEqual([
      { currency: 'HKD', Date: '2025-05-30', Description: '700(KYG875721634) Cash Dividend HKD 4.50 per Share (Ordinary Dividend)', Amount: 900.00 },
      { currency: 'USD', Date: '2025-04-23', Description: '9618(KYG8208B1014) Cash Dividend USD 0.50 per Share (Return of Capital)', Amount: 4.50 },
      { currency: 'USD', Date: '2025-06-27', Description: 'FLCH(US35473P8196) Cash Dividend USD 0.192099 per Share (Ordinary Dividend)', Amount: 422.62 },
      { currency: 'USD', Date: '2025-07-03', Description: '9988(KYG017191142) Cash Dividend USD 0.13125 per Share (Return of Capital)', Amount: 26.25 },
      { currency: 'USD', Date: '2025-07-03', Description: '9988(KYG017191142) Cash Dividend USD 0.11875 per Share (Return of Capital)', Amount: 23.75 },
      { currency: 'USD', Date: '2025-12-29', Description: 'FLCH(US35473P8196) Cash Dividend USD 0.36945 per Share (Ordinary Dividend)', Amount: 1218.45 },
    ])

    expect(result.financialInstrumentInfo).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'Stocks', Symbol: '3067', Description: 'ISHARES HANG SENG TECH E', Conid: '445194075',
        'Security ID': 'HK0000651213', Underlying: '3067', 'Listing Exch': 'SEHK', Multiplier: '1', Code: '',
      }),
    ]))

    expect(result.transactionFees).toContainEqual({ currency: 'HKD', DateTime: '2025-09-15, 23:21:51', Symbol: '9988', Description: 'ALIBABA GROUP HOLDING LTD', Quantity: -100, 'Trade Price': '154.1000', Amount: -16.44, Code: '' })
    expect(result.transactionFees).toContainEqual({ currency: 'HKD', DateTime: '2025-09-15, 23:22:33', Symbol: '700', Description: 'TENCENT HOLDINGS LTD', Quantity: -100, 'Trade Price': '645.0000', Amount: -66.84, Code: '' })

    expect(result.forexBalances).toEqual([
      { currency: 'HKD', Description: 'HKD', Quantity: -4001.95, 'Cost Price': 0.16573, 'Cost Basis in SGD': 663.24, 'Close Price': 0.16521, 'Value in SGD': -661.16, 'Unrealized P/L in SGD': 2.08, Code: '' },
      { currency: 'SGD', Description: 'SGD', Quantity: 2217.41, 'Cost Price': 0.0000, 'Cost Basis in SGD': -2217.41, 'Close Price': 1.0000, 'Value in SGD': 2217.41, 'Unrealized P/L in SGD': 0.00, Code: '' },
      { currency: 'USD', Description: 'USD', Quantity: 449.37, 'Cost Price': 1.2856, 'Cost Basis in SGD': -577.70, 'Close Price': 1.2860, 'Value in SGD': 577.88, 'Unrealized P/L in SGD': 0.18, Code: '' },
    ])

    expect(result.codes).toContainEqual({ code: 'A', meaning: 'Assignment' })
    expect(result.codes).toContainEqual({ code: 'XCH', meaning: 'Mutual Fund Exchange Transaction' })

    expect(result.changeDividendAccruals).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency:'USD', Symbol:'FLCH', Date:'2025-12-29', 'Ex Date':'2025-12-19', 'Pay Date':'2025-12-29', Quantity:3298, Tax:-365.54, Fee:0.00, 'Gross Rate':0.37, 'Gross Amount':-1218.45, 'Net Amount':-852.91, Code:'Re' }),
    ]))

    expect(result.interestAccruals).toContainEqual({ currency:'USD', label:'Interest Accrued', value:93.88 })

    expect(result.openPositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency:'HKD', Symbol:'3067', Quantity:31500, Mult:1, 'Cost Price':11.64058593, 'Cost Basis':366678.46, 'Close Price':11.5400, Value:363510.00, 'Unrealized P/L':-3168.46, Code:'' }),
    ]))

    expect(result.cashReport).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency:'USD', label:'Starting Cash', col1:632.09 }),
    ]))

    expect(result.realizedUnrealized).toEqual(expect.arrayContaining([
      expect.objectContaining({ type:'stocks', Symbol:'3067', 'Cost Adj.':0.00 }),
    ]))
    expect(result.mtmPerformance).toEqual(expect.arrayContaining([
      expect.objectContaining({ type:'stocks', Symbol:'3067', Prior:0, Current:31500 }),
    ]))

    expect(result.netAssetValue).toEqual(expect.arrayContaining([
      expect.objectContaining({ Item:'Cash', Total:3185.30, Long:2795.29 }),
    ]))

    expect(result.accountInformation).toContainEqual({ key:'Name', value:'Haymant LEE' })
  })
})
