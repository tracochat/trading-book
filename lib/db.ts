import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"

// re-export schema for convenience
export * from "@/schema/schema"

// initialize pg pool with connection string from env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// export a drizzle instance bound to the pool
export const db = drizzle(pool)

// also export sql helper for building raw queries
export { sql }
