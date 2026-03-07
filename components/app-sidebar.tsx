"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  BarChart3,
  Briefcase,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Banknote,
  PiggyBank,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  Upload,
  Database,
  Tag,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const navigation = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Account Information", href: "/dashboard/accounts", icon: Building2 },
      { title: "Net Asset Value", href: "/dashboard/nav", icon: Wallet },
    ],
  },
  {
    title: "Performance",
    items: [
      { title: "Performance Summary", href: "/dashboard/performance", icon: TrendingUp },
    ],
  },
  {
    title: "Positions & Trading",
    items: [
      { title: "Open Positions", href: "/dashboard/positions", icon: Briefcase },
      { title: "Trade Blotter", href: "/dashboard/trades", icon: ArrowLeftRight },
      { title: "Forex Balances", href: "/dashboard/forex", icon: Banknote },
    ],
  },
  {
    title: "Cash & Transactions",
    items: [
      { title: "Cash Report", href: "/dashboard/cash", icon: CreditCard },
      { title: "Deposits & Withdrawals", href: "/dashboard/deposits", icon: PiggyBank },
      { title: "Transaction Fees", href: "/dashboard/fees", icon: Receipt },
    ],
  },
  {
    title: "Income",
    collapsible: true,
    items: [
      { title: "Dividends", href: "/dashboard/dividends", icon: Banknote },
      { title: "Withholding Tax", href: "/dashboard/withholding-tax", icon: Receipt },
      { title: "Interest", href: "/dashboard/interest", icon: TrendingUp },
      { title: "Interest Accruals", href: "/dashboard/interest-accruals", icon: FileText },
      { title: "Dividend Accruals", href: "/dashboard/dividend-accruals", icon: FileText },
    ],
  },
  {
    title: "Reference Data",
    items: [
      { title: "Instruments", href: "/dashboard/instruments", icon: Database },
      { title: "Portfolios", href: "/dashboard/portfolios", icon: Briefcase },
      { title: "Codes", href: "/dashboard/codes", icon: Tag },
    ],
  },
  {
    title: "Import & Reconciliation",
    items: [
      { title: "Import Activity", href: "/dashboard/import", icon: Upload },
      { title: "Reconciliation", href: "/dashboard/reconciliation", icon: FileText },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trading Book</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Management System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            {group.collapsible ? (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center">
                    {group.title}
                    <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={pathname === item.href}>
                          <Link href={item.href}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"}>
              <Link href="/dashboard/settings">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
