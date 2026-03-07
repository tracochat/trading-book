// Database types for Trading Book Management System

export type Platform = 'IBKR' | 'Futu' | 'Tiger' | 'Other';

export type AssetCategory = 'Stocks' | 'Equity and Index Options' | 'Bonds' | 'Cash' | 'Futures' | 'Forex' | 'Funds' | 'Warrants' | 'CFD' | 'Other';

export type BuySell = 'BUY' | 'SELL' | 'BUY (Ca.)' | 'SELL (Ca.)';

export type CashTransactionType = 'Deposits' | 'Withdrawals' | 'Electronic Fund Transfer' | 'Transfer Between Accounts' | 'Internal Transfer' | 'Advisor Fee' | 'Other';

export type InterestType = 'Credit Interest' | 'Debit Interest' | 'Bond Interest' | 'Bond Coupon' | 'Payment In Lieu Of Dividends' | 'Other';

export type ReconciliationStatus = 'matched' | 'missing_in_system' | 'missing_in_report' | 'mismatch' | 'duplicate' | 'resolved';

export type AccountStatus = 'active' | 'inactive' | 'closed';
export type PortfolioStatus = 'active' | 'inactive' | 'closed';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface Account {
  id: string;
  account_id: string;
  account_name: string;
  platform: Platform;
  base_currency: string;
  account_type: string | null;
  account_capabilities: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Instrument {
  id: string;
  symbol: string;
  con_id: string | null;
  description: string | null;
  asset_category: AssetCategory;
  listing_exchange: string | null;
  multiplier: number;
  currency: string;
  security_id: string | null;
  security_id_type: string | null;
  cusip: string | null;
  isin: string | null;
  figi: string | null;
  issuer_country_code: string | null;
  underlying_symbol: string | null;
  underlying_con_id: string | null;
  underlying_category: string | null;
  strike: number | null;
  expiry: string | null;
  put_call: 'P' | 'C' | null;
  maturity_date: string | null;
  issue_date: string | null;
  underlying_listing_exchange: string | null;
  is_traded: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  account_id: string | null;
  base_currency: string;
  strategy: string | null;
  status: PortfolioStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
}

export interface Trade {
  id: string;
  account_id: string;
  instrument_id: string | null;
  portfolio_id: string | null;
  symbol: string;
  description: string | null;
  asset_category: AssetCategory;
  trade_date: string;
  settle_date: string | null;
  trade_time: string | null;
  exchange: string | null;
  quantity: number;
  trade_price: number;
  currency: string;
  fx_rate_to_base: number;
  proceeds: number | null;
  comm_fee: number;
  other_fees: number;
  basis: number | null;
  realized_pnl: number | null;
  mtm_pnl: number | null;
  trade_id: string | null;
  order_id: string | null;
  exec_id: string | null;
  buy_sell: BuySell;
  order_type: string | null;
  open_close: 'O' | 'C' | 'O;C' | null;
  notes: string | null;
  is_reconciled: boolean;
  source: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  portfolio?: Portfolio;
  instrument?: Instrument;
}

export interface CashTransaction {
  id: string;
  account_id: string;
  transaction_date: string;
  settle_date: string | null;
  currency: string;
  amount: number;
  transaction_type: CashTransactionType;
  description: string | null;
  fx_rate_to_base: number;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
}

export interface Dividend {
  id: string;
  account_id: string;
  instrument_id: string | null;
  symbol: string;
  description: string | null;
  currency: string;
  ex_date: string | null;
  pay_date: string;
  quantity: number | null;
  tax: number;
  fee: number;
  gross_rate: number | null;
  gross_amount: number;
  net_amount: number;
  fx_rate_to_base: number;
  action_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  instrument?: Instrument;
}

export interface WithholdingTax {
  id: string;
  account_id: string;
  instrument_id: string | null;
  symbol: string;
  description: string | null;
  currency: string;
  tax_date: string;
  amount: number;
  tax_type: string | null;
  fx_rate_to_base: number;
  action_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  account_id: string;
  instrument_id: string | null;
  symbol: string | null;
  description: string | null;
  currency: string;
  interest_date: string;
  amount: number;
  interest_type: InterestType | null;
  fx_rate_to_base: number;
  action_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterestAccrual {
  id: string;
  account_id: string;
  instrument_id: string | null;
  symbol: string;
  description: string | null;
  currency: string;
  accrual_date: string;
  starting_accrual_balance: number;
  interest_accrued: number;
  ending_accrual_balance: number;
  fx_rate_to_base: number;
  created_at: string;
  updated_at: string;
}

export interface DividendAccrual {
  id: string;
  account_id: string;
  instrument_id: string | null;
  symbol: string;
  description: string | null;
  currency: string;
  ex_date: string;
  pay_date: string | null;
  quantity: number | null;
  tax: number;
  fee: number;
  gross_rate: number | null;
  gross_amount: number;
  net_amount: number;
  fx_rate_to_base: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionFee {
  id: string;
  account_id: string;
  instrument_id: string | null;
  trade_id: string | null;
  symbol: string | null;
  description: string | null;
  currency: string;
  fee_date: string;
  amount: number;
  fee_type: string | null;
  fx_rate_to_base: number;
  created_at: string;
  updated_at: string;
}

export interface ForexBalance {
  id: string;
  account_id: string;
  as_of_date: string;
  currency: string;
  quantity: number;
  cost_basis: number | null;
  close_price: number | null;
  value: number | null;
  unrealized_pnl: number | null;
  fx_rate_to_base: number;
  created_at: string;
  updated_at: string;
}

export interface OpenPosition {
  id: string;
  account_id: string;
  instrument_id: string | null;
  portfolio_id: string | null;
  as_of_date: string;
  symbol: string;
  description: string | null;
  asset_category: AssetCategory;
  currency: string;
  quantity: number;
  cost_basis_price: number | null;
  cost_basis_money: number | null;
  close_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  fx_rate_to_base: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  instrument?: Instrument;
  account?: Account;
  portfolio?: Portfolio;
}

export interface NavSnapshot {
  id: string;
  account_id: string;
  as_of_date: string;
  cash: number;
  stock: number;
  options: number;
  bonds: number;
  funds: number;
  futures: number;
  accrued_interest: number;
  dividend_accruals: number;
  total_nav: number;
  currency: string;
  created_at: string;
}

export interface PerformanceSummary {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  starting_nav: number | null;
  ending_nav: number | null;
  deposits: number;
  withdrawals: number;
  dividends: number;
  interest: number;
  realized_pnl: number;
  unrealized_pnl: number;
  commissions: number;
  fees: number;
  net_pnl: number | null;
  time_weighted_return: number | null;
  currency: string;
  created_at: string;
}

export interface ActivityImport {
  id: string;
  account_id: string | null;
  file_name: string;
  file_hash: string | null;
  platform: string;
  period_start: string | null;
  period_end: string | null;
  import_status: ImportStatus;
  records_imported: number;
  records_failed: number;
  error_log: Record<string, unknown>[] | null;
  imported_at: string;
}

export interface ReconciliationLog {
  id: string;
  import_id: string | null;
  record_type: string;
  status: ReconciliationStatus;
  system_record: Record<string, unknown> | null;
  report_record: Record<string, unknown> | null;
  differences: Record<string, unknown> | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Code mapping types for IBKR codes
export interface CodeMapping {
  code: string;
  description: string;
  category: string;
}

// Form types for creating/updating records
export type AccountFormData = Omit<Account, 'id' | 'created_at' | 'updated_at'>;
export type InstrumentFormData = Omit<Instrument, 'id' | 'created_at' | 'updated_at'>;
export type PortfolioFormData = Omit<Portfolio, 'id' | 'created_at' | 'updated_at' | 'account'>;
export type TradeFormData = Omit<Trade, 'id' | 'created_at' | 'updated_at' | 'account' | 'portfolio' | 'instrument'>;
export type CashTransactionFormData = Omit<CashTransaction, 'id' | 'created_at' | 'updated_at' | 'account'>;
export type DividendFormData = Omit<Dividend, 'id' | 'created_at' | 'updated_at' | 'account' | 'instrument'>;
