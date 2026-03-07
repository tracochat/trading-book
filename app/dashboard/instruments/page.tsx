import { InstrumentsClient } from "./instruments-client"
import { db } from "@/lib/db"
import { instruments, trades } from "@/schema/schema"

async function getInstruments() {
  try {
    return await db.select().from(instruments).orderBy(instruments.symbol)
  } catch (error) {
    console.error('Error fetching instruments:', error)
    return []
  }
}

async function getTradedInstrumentIds() {
  try {
    const rows = await db
      .select({ instrument_id: trades.instrument_id })
      .from(trades)
    return [...new Set(rows.map(r => r.instrument_id).filter((id): id is string => id !== null))]
  } catch (error) {
    console.error('Error fetching traded instruments:', error)
    return []
  }
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
