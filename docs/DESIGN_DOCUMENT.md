# Trading Book Management System - Design Document

## 1. Overview

A comprehensive trading book management system that captures and manages trading activities, portfolios, and financial instruments across multiple brokerage platforms (IBKR, Futu, Tiger, etc.). The system provides reconciliation capabilities with broker activity reports.

## 2. Core Features

### 2.1 Account Management
- **Multi-platform Support**: IBKR, Futu, Tiger, and custom accounts
- **Account Information**: Name, Account ID, Address, Account Type, Customer Type, Account Capabilities, Base Currency
- **Account Settings**: Platform configuration, API credentials storage

### 2.2 Financial Instrument Universe
- **Instrument Types**: Stocks, ETFs, Bonds, Options, Futures, Forex
- **Data Fields**:
  - Symbol, Description, ISIN/Security ID
  - Underlying, Listing Exchange, Multiplier
  - Asset Type, Currency, Sector, Industry
- **Bulk Import**: Support for NASDAQ/NYSE/SEHK listed securities files
- **Universe Toggle**: View traded instruments vs. full universe

### 2.3 Trade Management (Trade Blotter)
- **Trade Capture**:
  - Symbol, Date/Time, Quantity, Price
  - Trade Type (Buy/Sell), Order Type
  - Commission/Fees, Realized P/L
  - Trade Codes (O/C/P etc.)
- **Trade Reconciliation**:
  - Upload IBKR activity report (HTML/CSV)
  - Parse and extract trades from report
  - Match against existing system records
  - Identify: Duplicates, Missing, Incorrect
  - Interactive resolution workflow

### 2.4 Portfolio Management
- **Portfolio Definition**: Name, Description, Base Currency, Benchmark
- **Trade Assignment**: Assign trades to portfolios
- **Portfolio Views**: Holdings, Performance, Allocation

### 2.5 Reporting Sections (Based on IBKR Activity Report)

1. **Account Information**
   - Account details and holder information

2. **Net Asset Value (NAV)**
   - Starting/Ending values for Cash, Stock, Interest Accruals
   - Long/Short breakdown
   - Change in NAV components
   - Time Weighted Rate of Return

3. **Mark-to-Market Performance Summary**
   - Position P/L, Transaction P/L
   - Commissions, Other fees
   - By symbol and asset class

4. **Realized & Unrealized Performance Summary**
   - Short-term/Long-term Profit/Loss
   - Cost adjustments
   - By symbol breakdown

5. **Cash Report**
   - Starting/Ending cash by currency
   - Commissions, Deposits, Dividends
   - Interest, Trades, Fees, Tax

6. **Open Positions**
   - Quantity, Multiplier, Cost Price/Basis
   - Close Price, Market Value
   - Unrealized P/L

7. **Forex Balances**
   - Currency holdings
   - Cost basis and current value
   - FX P/L

8. **Trades**
   - Full trade history with all fields
   - Filtering by date, symbol, account

9. **Transaction Fees**
   - Detailed fee breakdown
   - By date, symbol, amount

10. **Deposits & Withdrawals**
    - Cash movements in/out
    - Date, Amount, Currency, Description

11. **Dividends**
    - Dividend payments received
    - Ex-date, Pay date, Amount, Tax withheld

12. **Withholding Tax**
    - Tax withheld on dividends/interest
    - By date, symbol, amount

13. **Interest**
    - Interest earned/paid
    - Credit interest, Margin interest

14. **Interest Accruals**
    - Accrued interest tracking
    - Starting/Ending balances

15. **Change in Dividend Accruals**
    - Dividend accrual tracking
    - Ex-date based accruals

16. **Financial Instrument Information**
    - Full instrument details
    - CRUD maintenance page
    - Universe import functionality

17. **Codes**
    - Trade/transaction code reference
    - Meaning lookup

## 3. Data Architecture

### 3.1 Database Schema

```sql
-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  platform VARCHAR(50) NOT NULL, -- IBKR, Futu, Tiger, Custom
  account_id VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  holder_name VARCHAR(255),
  address TEXT,
  account_type VARCHAR(50), -- Individual, Joint, Corporate
  customer_type VARCHAR(50),
  account_capabilities VARCHAR(50), -- Cash, Margin
  base_currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Instruments (Universe)
CREATE TABLE instruments (
  id UUID PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  isin VARCHAR(12),
  conid VARCHAR(20), -- IBKR Contract ID
  underlying VARCHAR(50),
  listing_exchange VARCHAR(20),
  multiplier DECIMAL(10,4) DEFAULT 1,
  asset_type VARCHAR(20), -- STOCK, ETF, BOND, OPTION, FUTURE, FOREX
  currency VARCHAR(3),
  sector VARCHAR(100),
  industry VARCHAR(100),
  is_traded BOOLEAN DEFAULT false, -- Whether we've traded this
  source VARCHAR(50), -- NASDAQ, NYSE, MANUAL, IBKR
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, listing_exchange)
);

-- Portfolios
CREATE TABLE portfolios (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_currency VARCHAR(3) DEFAULT 'USD',
  benchmark VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  portfolio_id UUID REFERENCES portfolios(id),
  instrument_id UUID REFERENCES instruments(id),
  symbol VARCHAR(50) NOT NULL,
  trade_date DATE NOT NULL,
  trade_time TIME,
  settlement_date DATE,
  quantity DECIMAL(18,6) NOT NULL,
  price DECIMAL(18,6) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  gross_amount DECIMAL(18,2),
  commission DECIMAL(18,2) DEFAULT 0,
  fees DECIMAL(18,2) DEFAULT 0,
  net_amount DECIMAL(18,2),
  cost_basis DECIMAL(18,2),
  realized_pnl DECIMAL(18,2),
  mtm_pnl DECIMAL(18,2),
  trade_code VARCHAR(20), -- O, C, P, etc.
  order_id VARCHAR(50),
  execution_id VARCHAR(50),
  source VARCHAR(50), -- MANUAL, IBKR_IMPORT, API
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Open Positions (calculated/snapshot)
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  portfolio_id UUID REFERENCES portfolios(id),
  instrument_id UUID REFERENCES instruments(id),
  symbol VARCHAR(50) NOT NULL,
  quantity DECIMAL(18,6) NOT NULL,
  cost_price DECIMAL(18,6),
  cost_basis DECIMAL(18,2),
  market_price DECIMAL(18,6),
  market_value DECIMAL(18,2),
  unrealized_pnl DECIMAL(18,2),
  currency VARCHAR(3),
  as_of_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Transactions (Deposits, Withdrawals)
CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  transaction_date DATE NOT NULL,
  settle_date DATE,
  transaction_type VARCHAR(50) NOT NULL, -- DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  description TEXT,
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forex Balances
CREATE TABLE forex_balances (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  currency VARCHAR(3) NOT NULL,
  quantity DECIMAL(18,6) NOT NULL,
  cost_price DECIMAL(18,6),
  cost_basis DECIMAL(18,2),
  market_price DECIMAL(18,6),
  market_value DECIMAL(18,2),
  unrealized_pnl DECIMAL(18,2),
  as_of_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dividends
CREATE TABLE dividends (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  instrument_id UUID REFERENCES instruments(id),
  symbol VARCHAR(50) NOT NULL,
  ex_date DATE,
  pay_date DATE NOT NULL,
  gross_amount DECIMAL(18,2) NOT NULL,
  tax_withheld DECIMAL(18,2) DEFAULT 0,
  net_amount DECIMAL(18,2),
  currency VARCHAR(3),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withholding Tax
CREATE TABLE withholding_tax (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  tax_date DATE NOT NULL,
  symbol VARCHAR(50),
  description TEXT,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interest
CREATE TABLE interest (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  interest_date DATE NOT NULL,
  interest_type VARCHAR(50), -- CREDIT, DEBIT, MARGIN
  currency VARCHAR(3) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Fees
CREATE TABLE transaction_fees (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  trade_id UUID REFERENCES trades(id),
  fee_date DATE NOT NULL,
  fee_type VARCHAR(50), -- EXCHANGE, CLEARING, SEC, OTHER
  symbol VARCHAR(50),
  quantity DECIMAL(18,6),
  price DECIMAL(18,6),
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NAV History
CREATE TABLE nav_history (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  as_of_date DATE NOT NULL,
  cash_total DECIMAL(18,2),
  cash_long DECIMAL(18,2),
  cash_short DECIMAL(18,2),
  stock_total DECIMAL(18,2),
  stock_long DECIMAL(18,2),
  stock_short DECIMAL(18,2),
  interest_accruals DECIMAL(18,2),
  total_nav DECIMAL(18,2),
  twrr DECIMAL(10,4), -- Time Weighted Rate of Return
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, as_of_date)
);

-- Interest Accruals
CREATE TABLE interest_accruals (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  as_of_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL,
  accrual_type VARCHAR(50), -- CREDIT, DEBIT
  starting_accrual DECIMAL(18,4),
  interest_charged DECIMAL(18,4),
  accrual_reversal DECIMAL(18,4),
  fx_translation DECIMAL(18,4),
  ending_accrual DECIMAL(18,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dividend Accruals
CREATE TABLE dividend_accruals (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  instrument_id UUID REFERENCES instruments(id),
  symbol VARCHAR(50) NOT NULL,
  ex_date DATE NOT NULL,
  pay_date DATE,
  starting_accrual DECIMAL(18,4),
  gross_amount DECIMAL(18,4),
  net_amount DECIMAL(18,4),
  fx_translation DECIMAL(18,4),
  ending_accrual DECIMAL(18,4),
  currency VARCHAR(3),
  as_of_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation History
CREATE TABLE reconciliation_history (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  reconciliation_date TIMESTAMPTZ NOT NULL,
  report_type VARCHAR(50), -- IBKR_ACTIVITY, FUTU_STATEMENT
  report_period_start DATE,
  report_period_end DATE,
  total_trades_in_report INT,
  matched_trades INT,
  missing_trades INT,
  duplicate_trades INT,
  incorrect_trades INT,
  status VARCHAR(20), -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation Items
CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY,
  reconciliation_id UUID REFERENCES reconciliation_history(id),
  trade_id UUID REFERENCES trades(id),
  report_symbol VARCHAR(50),
  report_date DATE,
  report_quantity DECIMAL(18,6),
  report_price DECIMAL(18,6),
  report_amount DECIMAL(18,2),
  system_symbol VARCHAR(50),
  system_date DATE,
  system_quantity DECIMAL(18,6),
  system_price DECIMAL(18,6),
  system_amount DECIMAL(18,2),
  discrepancy_type VARCHAR(20), -- MATCH, MISSING, DUPLICATE, INCORRECT
  resolution_status VARCHAR(20), -- PENDING, RESOLVED, IGNORED
  resolution_action VARCHAR(50), -- ADD, UPDATE, DELETE, IGNORE
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade Codes Reference
CREATE TABLE trade_codes (
  code VARCHAR(10) PRIMARY KEY,
  meaning TEXT NOT NULL,
  category VARCHAR(50)
);
```

## 4. Application Architecture

### 4.1 Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: SWR for data fetching
- **Database**: Supabase (PostgreSQL)
- **File Processing**: Client-side HTML/CSV parsing

### 4.2 Page Structure

```
/app
  /page.tsx                    # Dashboard
  /accounts
    /page.tsx                  # Account list
    /[id]/page.tsx            # Account details
    /new/page.tsx             # Create account
  /instruments
    /page.tsx                  # Instrument universe
    /import/page.tsx          # Bulk import
  /trades
    /page.tsx                  # Trade blotter
    /reconcile/page.tsx       # Reconciliation
    /new/page.tsx             # Manual trade entry
  /portfolios
    /page.tsx                  # Portfolio list
    /[id]/page.tsx            # Portfolio details
  /reports
    /nav/page.tsx             # NAV report
    /mtm/page.tsx             # Mark-to-Market
    /realized/page.tsx        # Realized/Unrealized P&L
    /cash/page.tsx            # Cash report
    /positions/page.tsx       # Open positions
    /forex/page.tsx           # Forex balances
    /fees/page.tsx            # Transaction fees
    /deposits/page.tsx        # Deposits & Withdrawals
    /dividends/page.tsx       # Dividends
    /tax/page.tsx             # Withholding tax
    /interest/page.tsx        # Interest
    /accruals/page.tsx        # Interest & Dividend Accruals
  /settings
    /codes/page.tsx           # Trade codes reference
```

### 4.3 API Routes

```
/api
  /accounts              # CRUD for accounts
  /instruments           # CRUD for instruments
    /import              # Bulk import endpoint
  /trades                # CRUD for trades
    /reconcile           # Reconciliation logic
  /portfolios            # CRUD for portfolios
  /cash-transactions     # Deposits/Withdrawals
  /dividends             # Dividend records
  /interest              # Interest records
  /fees                  # Transaction fees
  /reports               # Report generation
    /nav
    /mtm
    /positions
    /forex
  /import
    /ibkr                # IBKR report parser
```

## 5. Key Workflows

### 5.1 Trade Reconciliation Flow

1. **Upload Report**: User uploads IBKR activity HTML file
2. **Parse Report**: Extract trades using DOM parsing
3. **Match Trades**: Compare with system records by:
   - Symbol + Date + Time + Quantity (exact match)
   - Symbol + Date + Quantity (fuzzy match)
4. **Identify Discrepancies**:
   - Missing: In report but not in system
   - Duplicate: In system but not in report
   - Incorrect: Matching key but different values
5. **Present Results**: Show categorized discrepancies
6. **Resolution**: User can:
   - Add missing trades
   - Delete duplicates
   - Update incorrect trades
   - Ignore discrepancies
7. **Complete**: Update reconciliation status

### 5.2 Instrument Import Flow

1. **Select Source**: NASDAQ, NYSE, SEHK, etc.
2. **Upload File**: CSV/TXT file with instrument list
3. **Map Columns**: Symbol, Name, Exchange, Type
4. **Preview**: Show records to be imported
5. **Import**: Bulk insert/update instruments
6. **Report**: Show success/failure counts

## 6. UI/UX Design Principles

- **Professional Financial Interface**: Clean, data-dense layouts
- **Color Scheme**: 
  - Primary: Deep blue (#1e40af)
  - Positive: Green (#16a34a)
  - Negative: Red (#dc2626)
  - Neutral: Gray scale
- **Typography**: Monospace for numbers, proportional for text
- **Data Tables**: Sortable, filterable, exportable
- **Responsive**: Mobile-friendly but optimized for desktop

## 7. Security Considerations

- Row Level Security (RLS) on all tables
- API authentication via Supabase Auth
- Sensitive data encryption
- Audit logging for all changes

## 8. Future Enhancements

- Real-time market data integration
- API connections to brokers
- Advanced portfolio analytics
- Tax lot optimization
- Multi-currency reporting
- Mobile app
