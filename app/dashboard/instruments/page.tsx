import { createClient } from "@/lib/supabase/server"
import { InstrumentsClient } from "./instruments-client"

async function getInstruments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instruments')
    .select('*')
    .order('symbol', { ascending: true })
  
  if (error) {
    console.error('Error fetching instruments:', error)
    return []
  }
  
  return data || []
}

async function getTradedInstrumentIds() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trades')
    .select('instrument_id')
  
  if (error) {
    console.error('Error fetching traded instruments:', error)
    return []
  }
  
  // Get unique instrument IDs
  const uniqueIds = [...new Set(data?.map(t => t.instrument_id) || [])]
  return uniqueIds
}

export default async function InstrumentsPage() {
  const [instruments, tradedInstrumentIds] = await Promise.all([
    getInstruments(),
    getTradedInstrumentIds(),
  ])
  
  return (
    <InstrumentsClient 
      initialInstruments={instruments} 
      tradedInstrumentIds={tradedInstrumentIds}
    />
  )
}
