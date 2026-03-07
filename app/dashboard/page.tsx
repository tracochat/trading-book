import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Briefcase, 
  ArrowLeftRight,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { db, sql } from "@/lib/db"
import { accounts as accountsTable, trades as tradesTable, openPositions, navSnapshots } from "@/schema/schema"

async function getDashboardStats() {
  try {
    const [accountCountRes, tradeCountRes, positionCountRes, latestNavRows] = await Promise.all([
      db.select({ count: sql`count(${accountsTable.id})`.as('count') })
        .from(accountsTable)
        .where(sql`${accountsTable.status} = 'active'`),
      db.select({ count: sql`count(${tradesTable.id})`.as('count') }).from(tradesTable),
      db.select({ count: sql`count(${openPositions.id})`.as('count') }).from(openPositions),
      db.select({ total_nav: navSnapshots.total_nav, currency: navSnapshots.currency })
        .from(navSnapshots)
        .orderBy(navSnapshots.as_of_date, 'desc')
        .limit(1),
    ])

    return {
      accountCount: accountCountRes[0]?.count || 0,
      tradeCount: tradeCountRes[0]?.count || 0,
      positionCount: positionCountRes[0]?.count || 0,
      latestNav: latestNavRows[0] || null,
    }
  } catch (error) {
    console.error('Error loading dashboard stats', error)
    return { accountCount: 0, tradeCount: 0, positionCount: 0, latestNav: null }
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: "Total Accounts",
      value: stats.accountCount.toString(),
      description: "Active trading accounts",
      icon: Building2,
      href: "/dashboard/accounts",
      trend: null,
    },
    {
      title: "Net Asset Value",
      value: stats.latestNav 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: stats.latestNav.currency }).format(stats.latestNav.total_nav)
        : "No data",
      description: "Latest portfolio value",
      icon: Wallet,
      href: "/dashboard/nav",
      trend: null,
    },
    {
      title: "Open Positions",
      value: stats.positionCount.toString(),
      description: "Current holdings",
      icon: Briefcase,
      href: "/dashboard/positions",
      trend: null,
    },
    {
      title: "Total Trades",
      value: stats.tradeCount.toString(),
      description: "All-time transactions",
      icon: ArrowLeftRight,
      href: "/dashboard/trades",
      trend: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your trading activity and portfolio performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link 
              href="/dashboard/trades?action=new" 
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeftRight className="size-5 text-primary" />
              <div>
                <p className="font-medium">Record New Trade</p>
                <p className="text-sm text-muted-foreground">Add a manual trade entry</p>
              </div>
            </Link>
            <Link 
              href="/dashboard/import" 
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <TrendingUp className="size-5 text-primary" />
              <div>
                <p className="font-medium">Import Activity Report</p>
                <p className="text-sm text-muted-foreground">Upload IBKR or other broker reports</p>
              </div>
            </Link>
            <Link 
              href="/dashboard/accounts?action=new" 
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <Building2 className="size-5 text-primary" />
              <div>
                <p className="font-medium">Add Trading Account</p>
                <p className="text-sm text-muted-foreground">Connect a new brokerage account</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Set up your trading book in a few steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Add your trading accounts</p>
                <p className="text-sm text-muted-foreground">Register accounts from IBKR, Futu, Tiger, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Import your instruments</p>
                <p className="text-sm text-muted-foreground">Upload NYSE/NASDAQ listings or add manually</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Upload activity reports</p>
                <p className="text-sm text-muted-foreground">Import trades, dividends, and transactions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Create portfolios</p>
                <p className="text-sm text-muted-foreground">Organize trades into portfolios for tracking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
