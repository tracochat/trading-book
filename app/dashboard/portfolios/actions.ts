"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface PortfolioFormData {
  name: string
  description: string
  benchmark: string
  inception_date: string
  is_active: boolean
}

export async function createPortfolio(data: PortfolioFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('portfolios').insert({
    name: data.name,
    description: data.description || null,
    benchmark: data.benchmark || null,
    inception_date: data.inception_date || null,
    is_active: data.is_active,
  })

  if (error) {
    console.error('Error creating portfolio:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/portfolios')
  return { success: true }
}

export async function updatePortfolio(id: string, data: PortfolioFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('portfolios')
    .update({
      name: data.name,
      description: data.description || null,
      benchmark: data.benchmark || null,
      inception_date: data.inception_date || null,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating portfolio:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/portfolios')
  return { success: true }
}

export async function deletePortfolio(id: string) {
  const supabase = await createClient()
  
  // First unassign any trades from this portfolio
  await supabase
    .from('trades')
    .update({ portfolio_id: null })
    .eq('portfolio_id', id)
  
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting portfolio:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/portfolios')
  revalidatePath('/dashboard/trades')
  return { success: true }
}

export async function assignTradesToPortfolio(tradeIds: string[], portfolioId: string | null) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('trades')
    .update({ 
      portfolio_id: portfolioId,
      updated_at: new Date().toISOString(),
    })
    .in('id', tradeIds)

  if (error) {
    console.error('Error assigning trades:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard/portfolios')
  return { success: true }
}
