-- Trading Book Management System Schema
-- Version 1.0

-- =====================================================
-- ACCOUNTS TABLE - Trading accounts from different platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('IBKR', 'Futu', 'Tiger', 'Other')),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  account_type TEXT DEFAULT 'Individual',
  account_capabilities TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL INSTRUMENTS TABLE - Universe of tradeable instruments
-- =====================================================
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  con_id TEXT,
  description TEXT,
  asset_category TEXT NOT NULL CHECK (asset_category IN ('Stocks', 'Equity and Index Options', 'Bonds', 'Cash', 'Futures', 'Forex', 'Funds', 'Warrants', 'CFD', 'Other')),
  listing_exchange TEXT,
  multiplier NUMERIC DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  security_id TEXT,
  security_id_type TEXT,
  cusip TEXT,
  isin TEXT,
  figi TEXT,
  issuer_country_code TEXT,
  underlying_symbol TEXT,
  underlying_con_id TEXT,
  underlying_category TEXT,
  strike NUMERIC,
  expiry DATE,
  put_call TEXT CHECK (put_call IN ('P', 'C', NULL)),
  maturity_date DATE,
  issue_date DATE,
  underlying_listing_exchange TEXT,
  is_traded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, currency, listing_exchange)
);

-- =====================================================
-- PORTFOLIOS TABLE - User-defined portfolios
-- =====================================================
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  strategy TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRADES TABLE - Trade blotter
-- =====================================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  asset_category TEXT NOT NULL,
  trade_date DATE NOT NULL,
  settle_date DATE,
  trade_time TIME,
  exchange TEXT,
  quantity NUMERIC NOT NULL,
  trade_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  fx_rate_to_base NUMERIC DEFAULT 1,
  proceeds NUMERIC,
  comm_fee NUMERIC DEFAULT 0,
  other_fees NUMERIC DEFAULT 0,
  basis NUMERIC,
  realized_pnl NUMERIC,
  mtm_pnl NUMERIC,
  trade_id TEXT,
  order_id TEXT,
  exec_id TEXT,
  buy_sell TEXT NOT NULL CHECK (buy_sell IN ('BUY', 'SELL', 'BUY (Ca.)', 'SELL (Ca.)')),
  order_type TEXT,
  open_close TEXT CHECK (open_close IN ('O', 'C', 'O;C', NULL)),
  notes TEXT,
  is_reconciled BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CASH TRANSACTIONS TABLE - Deposits, Withdrawals, Transfers
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  settle_date DATE,
  currency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'Deposits', 'Withdrawals', 'Electronic Fund Transfer', 
    'Transfer Between Accounts', 'Internal Transfer', 
    'Advisor Fee', 'Other'
  )),
  description TEXT,
  fx_rate_to_base NUMERIC DEFAULT 1,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DIVIDENDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL,
  ex_date DATE,
  pay_date DATE NOT NULL,
  quantity NUMERIC,
  tax NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  gross_rate NUMERIC,
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  fx_rate_to_base NUMERIC DEFAULT 1,
  action_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- WITHHOLDING TAX TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS withholding_tax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL,
  tax_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  tax_type TEXT,
  fx_rate_to_base NUMERIC DEFAULT 1,
  action_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INTEREST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  symbol TEXT,
  description TEXT,
  currency TEXT NOT NULL,
  interest_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  interest_type TEXT CHECK (interest_type IN (
    'Credit Interest', 'Debit Interest', 'Bond Interest', 
    'Bond Coupon', 'Payment In Lieu Of Dividends', 'Other'
  )),
  fx_rate_to_base NUMERIC DEFAULT 1,
  action_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INTEREST ACCRUALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS interest_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL,
  accrual_date DATE NOT NULL,
  starting_accrual_balance NUMERIC DEFAULT 0,
  interest_accrued NUMERIC NOT NULL,
  ending_accrual_balance NUMERIC NOT NULL,
  fx_rate_to_base NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DIVIDEND ACCRUALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dividend_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL,
  ex_date DATE NOT NULL,
  pay_date DATE,
  quantity NUMERIC,
  tax NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  gross_rate NUMERIC,
  gross_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  fx_rate_to_base NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRANSACTION FEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transaction_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  symbol TEXT,
  description TEXT,
  currency TEXT NOT NULL,
  fee_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  fee_type TEXT,
  fx_rate_to_base NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- FOREX BALANCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS forex_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL,
  currency TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  cost_basis NUMERIC,
  close_price NUMERIC,
  value NUMERIC,
  unrealized_pnl NUMERIC,
  fx_rate_to_base NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, as_of_date, currency)
);

-- =====================================================
-- OPEN POSITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  as_of_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  asset_category TEXT NOT NULL,
  currency TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  cost_basis_price NUMERIC,
  cost_basis_money NUMERIC,
  close_price NUMERIC,
  market_value NUMERIC,
  unrealized_pnl NUMERIC,
  unrealized_pnl_pct NUMERIC,
  fx_rate_to_base NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- NET ASSET VALUE SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS nav_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL,
  cash NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  options NUMERIC DEFAULT 0,
  bonds NUMERIC DEFAULT 0,
  funds NUMERIC DEFAULT 0,
  futures NUMERIC DEFAULT 0,
  accrued_interest NUMERIC DEFAULT 0,
  dividend_accruals NUMERIC DEFAULT 0,
  total_nav NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, as_of_date)
);

-- =====================================================
-- PERFORMANCE SUMMARY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  starting_nav NUMERIC,
  ending_nav NUMERIC,
  deposits NUMERIC DEFAULT 0,
  withdrawals NUMERIC DEFAULT 0,
  dividends NUMERIC DEFAULT 0,
  interest NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  commissions NUMERIC DEFAULT 0,
  fees NUMERIC DEFAULT 0,
  net_pnl NUMERIC,
  time_weighted_return NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, period_start, period_end)
);

-- =====================================================
-- ACTIVITY REPORT IMPORTS TABLE - Track uploaded files
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  platform TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  import_status TEXT NOT NULL DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_log JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- RECONCILIATION LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES activity_imports(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('matched', 'missing_in_system', 'missing_in_report', 'mismatch', 'duplicate', 'resolved')),
  system_record JSONB,
  report_record JSONB,
  differences JSONB,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_trades_account_date ON trades(account_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_is_traded ON instruments(is_traded);
CREATE INDEX IF NOT EXISTS idx_open_positions_account ON open_positions(account_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_dividends_account ON dividends(account_id, pay_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account ON cash_transactions(account_id, transaction_date);

-- =====================================================
-- Updated at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instruments_updated_at BEFORE UPDATE ON instruments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cash_transactions_updated_at BEFORE UPDATE ON cash_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dividends_updated_at BEFORE UPDATE ON dividends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withholding_tax_updated_at BEFORE UPDATE ON withholding_tax FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interest_updated_at BEFORE UPDATE ON interest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interest_accruals_updated_at BEFORE UPDATE ON interest_accruals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dividend_accruals_updated_at BEFORE UPDATE ON dividend_accruals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_fees_updated_at BEFORE UPDATE ON transaction_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forex_balances_updated_at BEFORE UPDATE ON forex_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_open_positions_updated_at BEFORE UPDATE ON open_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
