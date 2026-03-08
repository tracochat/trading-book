import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { SSRMRequestSchema } from "../../../lib/ssrm/types"
import { buildSSRMQuery } from "../../../lib/ssrm/query-builder"
import { tableRegistry } from "../../../lib/ssrm/registry"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request against schema
    const parseResult = SSRMRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const ssrmRequest = parseResult.data

    // Security: Check if table is allowed
    if (!ssrmRequest.tableName || !tableRegistry[ssrmRequest.tableName]) {
      return NextResponse.json(
        { error: "Table not found or not allowed" },
        { status: 403 }
      )
    }

    const tableConfig = tableRegistry[ssrmRequest.tableName]

    // Build and execute query
    const startTime = performance.now()

    const response = await buildSSRMQuery(
      db,
      tableConfig,
      ssrmRequest
    )

    const queryTime = performance.now() - startTime

    return NextResponse.json({
      ...response,
      metadata: {
        ...response.metadata,
        queryTime: Math.round(queryTime),
      },
    })
  } catch (error) {
    console.error("SSRM API Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
