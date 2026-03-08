import { sql } from "drizzle-orm"

export const tradesQuerySource = {
  baseQuery: sql`
    with trade_rows as (
      select
        t.id,
        t.account_id,
        t.instrument_id,
        t.portfolio_id,
        t.symbol,
        t.description,
        t.asset_category,
        t.trade_date::text as trade_date,
        t.settle_date::text as settle_date,
        t.trade_time,
        t.exchange,
        t.quantity,
        t.trade_price,
        t.currency,
        coalesce(t.fx_rate_to_base, 1) as fx_rate_to_base,
        t.proceeds,
        coalesce(t.comm_fee, 0) as comm_fee,
        coalesce(t.other_fees, 0) as other_fees,
        t.basis,
        t.realized_pnl,
        t.mtm_pnl,
        t.trade_id,
        t.order_id,
        t.exec_id,
        t.buy_sell,
        t.order_type,
        t.open_close,
        t.notes,
        coalesce(t.is_reconciled, false) as is_reconciled,
        t.source,
        t.created_at,
        t.updated_at,
        coalesce(
          t.order_type,
          case
            when coalesce(t.proceeds, 0) > 0 then 'Buy'
            when coalesce(t.proceeds, 0) < 0 then 'Sell'
            when upper(t.buy_sell) = 'SELL' then 'Buy'
            else 'Sell'
          end
        ) as trade_type,
        t.trade_price as price,
        coalesce(t.comm_fee, 0) as commission,
        coalesce(t.other_fees, 0) as fees,
        coalesce(t.fx_rate_to_base, 1) as fx_rate,
        t.trade_id as external_id,
        coalesce(t.proceeds, 0) + coalesce(t.comm_fee, 0) + coalesce(t.other_fees, 0) as net_amount,
        a.account_name,
        p.name as portfolio_name,
        coalesce(i.symbol, t.symbol) as instrument_symbol,
        coalesce(i.description, t.description) as instrument_description,
        case
          when a.id is null then null
          else json_build_object(
            'id', a.id,
            'account_id', a.account_id,
            'account_name', a.account_name,
            'platform', a.platform
          )
        end as account,
        case
          when i.id is null then null
          else json_build_object(
            'id', i.id,
            'symbol', i.symbol,
            'description', i.description,
            'asset_category', i.asset_category,
            'currency', i.currency
          )
        end as instrument,
        case
          when p.id is null then null
          else json_build_object(
            'id', p.id,
            'name', p.name
          )
        end as portfolio
      from trades t
      left join accounts a on a.id = t.account_id
      left join instruments i on i.id = t.instrument_id
      left join portfolios p on p.id = t.portfolio_id
    )
  `,
  fromClause: sql`from trade_rows`,
  outputColumns: sql`
    id,
    account_id,
    instrument_id,
    portfolio_id,
    symbol,
    description,
    asset_category,
    trade_date,
    settle_date,
    trade_time,
    exchange,
    quantity,
    trade_price,
    currency,
    fx_rate_to_base,
    proceeds,
    comm_fee,
    other_fees,
    basis,
    realized_pnl,
    mtm_pnl,
    trade_id,
    order_id,
    exec_id,
    buy_sell,
    order_type,
    open_close,
    notes,
    is_reconciled,
    source,
    created_at,
    updated_at,
    trade_type,
    price,
    commission,
    fees,
    fx_rate,
    external_id,
    net_amount,
    account,
    instrument,
    portfolio,
    account_name,
    portfolio_name,
    instrument_symbol,
    instrument_description
  `,
  defaultOrderBy: sql`order by "trade_date" desc, "created_at" desc`,
} as const