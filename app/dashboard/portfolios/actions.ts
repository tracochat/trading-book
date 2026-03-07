"use server"

import { revalidatePath } from "next/cache"
import { db, sql } from "@/lib/db"
import { portfolios as portfoliosTable, trades as tradesTable } from "@/schema/schema"

interface PortfolioFormData {
  name: string
  description?: string
  account_id?: string
  base_currency: string
  strategy?: string
  status: 'active' | 'inactive' | 'closed'
}

export async function createPortfolio(data: PortfolioFormData) {
  try {
    await db.insert(portfoliosTable).values({
      name: data.name,
      description: data.description || null,
      account_id: data.account_id || null,
      base_currency: data.base_currency || 'USD',
      strategy: data.strategy || null,
      status: data.status || 'active',
    })
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/portfolios')
  return { success: true }
}

export async function updatePortfolio(id: string, data: PortfolioFormData) {
  try {
    await db
      .update(portfoliosTable)
      .set({
        name: data.name,
        description: data.description || null,
        account_id: data.account_id || null,
        base_currency: data.base_currency || 'USD',
        strategy: data.strategy || null,
        status: data.status || 'active',
        updated_at: new Date(),
      })
      .where(sql`${portfoliosTable.id} = ${id}`)
  } catch (error) {
    console.error('Error updating portfolio:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/portfolios')
  return { success: true }
}

export async function deletePortfolio(id: string) {
  try {
    // unassign trades
    await db
      .update(tradesTable)
      .set({ portfolio_id: null })
      .where(sql`${tradesTable.portfolio_id} = ${id}`)
    await db.delete(portfoliosTable).where(sql`${portfoliosTable.id} = ${id}`)
  } catch (error) {
    console.error('Error deleting portfolio:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }



  revalidatePath('/dashboard/portfolios')
  revalidatePath('/dashboard/trades')
  return { success: true }
}

export async function assignTradesToPortfolio(tradeIds: string[], portfolioId: string | null) {
  try {
    await db
      .update(tradesTable)
      .set({ 
        portfolio_id: portfolioId,
        updated_at: new Date(),
      })
      .where(tradesTable.id.in(tradeIds))
  } catch (error) {
    console.error('Error assigning trades:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  if (error) {
    console.error('Error assigning trades:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard/portfolios')
  return { success: true }
}
