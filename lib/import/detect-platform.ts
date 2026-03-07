// Placeholder for platform detection logic
import { load } from "cheerio";
import type { Platform } from "@/lib/types";

export function detectPlatform(html: string): Platform {
  // TODO: implement real heuristics
  const $ = load(html);
  if (html.includes("Interactive Brokers")) return "IBKR";
  if (html.includes("Futu")) return "Futu";
  if (html.includes("Tiger")) return "Tiger";
  return "Other";
}
