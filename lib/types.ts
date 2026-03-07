// Database types for Trading Book Management System

export type Platform = 'IBKR' | 'Futu' | 'Tiger' | 'Other';

export type AssetClass = 'Stocks' | 'Equity and Index Options' | 'Bonds' | 'Futures' | 'Forex' | 'CFD' | 'Crypto' | 'Other';

export type TradeType = 'Buy' | 'Sell' | 'Buy to Open' | 'Buy to Close' | 'Sell to Open' | 'Sell to Close';

export type CashTransactionType = 'Deposit' | 'Withdrawal' | 'Transfer In' | 'Transfer Out' | 'Fee' | 'Commission' | 'Interest' | 'Dividend' | 'Withholding Tax' | 'Other';

export type ReconciliationStatus = 'Matched' | 'Missing in System' | 'Missing in Report' | 'Mismatch' | 'Resolved';

export interface Account {
  id: string;
  user_id: string;
  account_id: string;
  account_name: string;
  platform: Platform;
  account_type: string | null;
  base_currency: string;
  capabilities: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Instrument {
  id: string;
  symbol: string;
  con_id: string | null;
  description: string | null;
  asset_class: AssetClass;
  exchange: string | null;
  currency: string;
  multiplier: number;
  listing_exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  is_active: boolean;
  is_tradeable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  benchmark: string | null;
  inception_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  portfolio_id: string | null;
  instrument_id: string;
  trade_date: string;
  settle_date: string | null;
  trade_type: TradeType;
  quantity: number;
  price: number;
  gross_amount: number;
  commission: number;
  fees: number;
  net_amount: number;
  currency: string;
  fx_rate: number | null;
  notes: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  portfolio?: Portfolio;
  instrument?: Instrument;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  account_id: string;
  transaction_date: string;
  settle_date: string | null;
  transaction_type: CashTransactionType;
  amount: number;
  currency: string;
  description: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
}

export interface Dividend {
  id: string;
  user_id: string;
  account_id: string;
  instrument_id: string;
  ex_date: string;
  pay_date: string | null;
  gross_amount: number;
  net_amount: number;
  currency: string;
  withholding_tax: number;
  description: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  instrument?: Instrument;
}

export interface WithholdingTax {
  id: string;
  user_id: string;
  account_id: string;
  instrument_id: string | null;
  tax_date: string;
  amount: number;
  currency: string;
  tax_type: string | null;
  description: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  user_id: string;
  account_id: string;
  interest_date: string;
  amount: number;
  currency: string;
  interest_type: string | null;
  description: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterestAccrual {
  id: string;
  user_id: string;
  account_id: string;
  as_of_date: string;
  accrued_amount: number;
  currency: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DividendAccrual {
  id: string;
  user_id: string;
  account_id: string;
  instrument_id: string;
  as_of_date: string;
  accrued_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFee {
  id: string;
  user_id: string;
  account_id: string;
  fee_date: string;
  fee_type: string;
  amount: number;
  currency: string;
  description: string | null;
  external_id: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForexBalance {
  id: string;
  user_id: string;
  account_id: string;
  as_of_date: string;
  currency: string;
  quantity: number;
  cost_basis: number | null;
  unrealized_pnl: number | null;
  created_at: string;
  updated_at: string;
}

export interface OpenPosition {
  id: string;
  user_id: string;
  account_id: string;
  portfolio_id: string | null;
  instrument_id: string;
  as_of_date: string;
  quantity: number;
  cost_basis: number;
  market_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  instrument?: Instrument;
  account?: Account;
  portfolio?: Portfolio;
}

export interface NavSnapshot {
  id: string;
  user_id: string;
  account_id: string | null;
  portfolio_id: string | null;
  as_of_date: string;
  total_cash: number;
  total_stock: number;
  total_options: number;
  total_bonds: number;
  total_funds: number;
  total_other: number;
  total_nav: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceSummary {
  id: string;
  user_id: string;
  account_id: string | null;
  portfolio_id: string | null;
  period_start: string;
  period_end: string;
  starting_nav: number;
  ending_nav: number;
  net_deposits: number;
  realized_pnl: number;
  unrealized_pnl: number;
  dividends: number;
  interest: number;
  fees: number;
  total_return: number;
  total_return_pct: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityImport {
  id: string;
  user_id: string;
  account_id: string;
  import_date: string;
  filename: string;
  file_type: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  records_imported: number;
  errors: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationLog {
  id: string;
  user_id: string;
  import_id: string;
  entity_type: string;
  entity_id: string | null;
  external_id: string | null;
  status: ReconciliationStatus;
  system_data: Record<string, unknown> | null;
  import_data: Record<string, unknown> | null;
  differences: Record<string, unknown> | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Form types for creating/updating records
export type AccountFormData = Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type InstrumentFormData = Omit<Instrument, 'id' | 'created_at' | 'updated_at'>;
export type PortfolioFormData = Omit<Portfolio, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type TradeFormData = Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'account' | 'portfolio' | 'instrument'>;
export type CashTransactionFormData = Omit<CashTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'account'>;
export type DividendFormData = Omit<Dividend, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'account' | 'instrument'>;
