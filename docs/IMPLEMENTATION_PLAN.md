# Trading Book Management System - Implementation Plan

## Phase 1: Foundation & Core Infrastructure

### Task 1.1: Database Setup
- [ ] Create Drizzle ORM database schema
- [ ] Set up Row Level Security policies
- [ ] Create indexes for performance
- [ ] Seed trade codes reference data

### Task 1.2: Base Layout & Navigation
- [ ] Create app layout with sidebar navigation
- [ ] Implement theme (professional financial look)
- [ ] Set up navigation structure for all pages
- [ ] Create reusable page layout components

### Task 1.3: Shared Components
- [ ] Data table component with sorting/filtering
- [ ] Form components (input, select, date picker)
- [ ] Modal/dialog for CRUD operations
- [ ] Loading states and error handling
- [ ] Currency/number formatters

## Phase 2: Account Management

### Task 2.1: Account CRUD
- [ ] Account list page
- [ ] Account creation form (IBKR, Futu, Tiger, Custom)
- [ ] Account detail view
- [ ] Account edit/delete

### Task 2.2: Account Dashboard
- [ ] Account summary cards
- [ ] Quick stats (NAV, P&L, cash)
- [ ] Recent activity

## Phase 3: Financial Instrument Management

### Task 3.1: Instrument CRUD
- [ ] Instrument list with search/filter
- [ ] Manual instrument creation
- [ ] Instrument detail/edit
- [ ] Toggle: Traded vs Universe view

### Task 3.2: Bulk Import
- [ ] File upload component
- [ ] CSV/TXT parser
- [ ] Column mapping UI
- [ ] Preview and import logic
- [ ] Support for NASDAQ/NYSE/SEHK formats

## Phase 4: Trade Management

### Task 4.1: Trade Blotter
- [ ] Trade list with advanced filtering
- [ ] Trade detail view
- [ ] Manual trade entry form
- [ ] Trade edit/delete

### Task 4.2: Trade Reconciliation
- [ ] IBKR HTML report parser
- [ ] Trade matching algorithm
- [ ] Reconciliation UI with discrepancy categories
- [ ] Resolution workflow (add/update/delete/ignore)
- [ ] Reconciliation history

## Phase 5: Portfolio Management

### Task 5.1: Portfolio CRUD
- [ ] Portfolio list
- [ ] Portfolio creation/edit
- [ ] Trade assignment to portfolios

### Task 5.2: Portfolio Views
- [ ] Holdings breakdown
- [ ] P&L by portfolio
- [ ] Allocation charts

## Phase 6: Reporting Pages

### Task 6.1: Core Reports
- [ ] Net Asset Value (NAV) page
- [ ] Mark-to-Market Performance Summary
- [ ] Realized & Unrealized Performance Summary
- [ ] Cash Report

### Task 6.2: Position Reports
- [ ] Open Positions
- [ ] Forex Balances

### Task 6.3: Transaction Reports
- [ ] Transaction Fees
- [ ] Deposits & Withdrawals

### Task 6.4: Income Reports
- [ ] Dividends
- [ ] Withholding Tax
- [ ] Interest

### Task 6.5: Accrual Reports
- [ ] Interest Accruals
- [ ] Change in Dividend Accruals

### Task 6.6: Reference Data
- [ ] Financial Instrument Information
- [ ] Codes reference page

## Phase 7: Dashboard & Analytics

### Task 7.1: Main Dashboard
- [ ] Portfolio overview
- [ ] Recent trades
- [ ] P&L summary
- [ ] Position highlights

### Task 7.2: Charts & Visualizations
- [ ] NAV history chart
- [ ] P&L trends
- [ ] Asset allocation pie chart

## Implementation Order

The implementation will follow this priority order:

1. **Phase 1** - Foundation (Must have first)
2. **Phase 3.1** - Instruments (Needed for trades)
3. **Phase 2** - Accounts (Needed for trades)
4. **Phase 4.1** - Trade Blotter (Core functionality)
5. **Phase 4.2** - Reconciliation (Key feature)
6. **Phase 5** - Portfolios
7. **Phase 6** - Reports
8. **Phase 7** - Dashboard

## File Structure

```
/app
  /layout.tsx              # Root layout with sidebar
  /page.tsx                # Dashboard
  /accounts/
  /instruments/
  /trades/
  /portfolios/
  /reports/
  /settings/

/components
  /layout/
    sidebar.tsx
    header.tsx
    page-header.tsx
  /ui/                     # shadcn components
  /data-table/
    data-table.tsx
    columns.tsx
  /forms/
    account-form.tsx
    instrument-form.tsx
    trade-form.tsx
    portfolio-form.tsx
  /charts/
    nav-chart.tsx
    allocation-chart.tsx

/lib
  /db/
    schema.ts              # Type definitions
  /parsers/
    ibkr-parser.ts         # IBKR HTML parser
  /utils/
    formatters.ts          # Number/currency formatters
    reconciliation.ts      # Matching algorithm

/api
  /accounts/
  /instruments/
  /trades/
  /portfolios/
  /reports/
```

## Estimated Timeline

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Foundation | Medium |
| 2 | Accounts | Low |
| 3 | Instruments | Medium |
| 4 | Trades | High |
| 5 | Portfolios | Medium |
| 6 | Reports | Medium |
| 7 | Dashboard | Low |

## Notes

- All phases can be built incrementally
- Each page should be functional standalone
- Focus on IBKR integration first as primary use case
- Design for extensibility to other brokers
