import { sendHeartbeat } from "@/lib/evomap/heartbeat";

/**
 * EvoMap Status Check Endpoint
 *
 * Test endpoint to verify EvoMap integration.
 * Visit: http://localhost:3000/api/evomap/status
 *
 * Returns:
 * - Heartbeat response from EvoMap
 * - Current credit balance
 * - Pending events (if any)
 */
export async function GET() {
  const result = await sendHeartbeat();

  if (!result) {
    return Response.json(
      {
        error: "Heartbeat failed",
        message: "Check if EVOMAP_NODE_ID and EVOMAP_NODE_SECRET are set in environment variables",
      },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    evomap: {
      status: result.status ?? "unknown",
      credit_balance: result.credit_balance ?? 0,
      survival_status: result.survival_status ?? "unknown",
      pending_events: result.pending_events ?? [],
    },
  });
}
