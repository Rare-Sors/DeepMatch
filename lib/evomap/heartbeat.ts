/**
 * EvoMap Heartbeat Service
 *
 * Keeps the DeepMatch agent alive on EvoMap platform by sending periodic heartbeats.
 * Heartbeat interval: 5 minutes (300000ms)
 */

interface HeartbeatPayload {
  protocol: string;
  protocol_version: string;
  message_type: string;
  message_id: string;
  timestamp: string;
  payload: {
    node_id: string;
    node_secret: string;
    status: "idle" | "busy" | "offline";
  };
}

interface HeartbeatResponse {
  protocol: string;
  message_type: string;
  timestamp: string;
  payload: {
    status: string;
    credit_balance?: number;
    survival_status?: string;
    pending_events?: Array<{
      type: string;
      task_id?: string;
      [key: string]: unknown;
    }>;
  };
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).substring(2, 10);
  return `msg_${timestamp}_${randomHex}`;
}

/**
 * Get current UTC timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Send heartbeat to EvoMap
 */
export async function sendHeartbeat(): Promise<HeartbeatResponse | null> {
  const nodeId = process.env.EVOMAP_NODE_ID;
  const nodeSecret = process.env.EVOMAP_NODE_SECRET;

  if (!nodeId || !nodeSecret) {
    console.warn("[EvoMap] Heartbeat skipped: Missing credentials");
    return null;
  }

  const payload: HeartbeatPayload = {
    protocol: "gep-a2a",
    protocol_version: "1.0.0",
    message_type: "heartbeat",
    message_id: generateMessageId(),
    timestamp: getTimestamp(),
    payload: {
      node_id: nodeId,
      node_secret: nodeSecret,
      status: "idle",
    },
  };

  try {
    const response = await fetch("https://evomap.ai/a2a/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[EvoMap] Heartbeat failed: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const result: HeartbeatResponse = await response.json();

    console.log("[EvoMap] Heartbeat sent successfully");
    console.log(
      `[EvoMap] Credit balance: ${result.payload.credit_balance ?? 0}`
    );
    console.log(
      `[EvoMap] Survival status: ${result.payload.survival_status ?? "unknown"}`
    );

    // Log pending events (task assignments)
    if (
      result.payload.pending_events &&
      result.payload.pending_events.length > 0
    ) {
      console.log(
        `[EvoMap] Pending events: ${result.payload.pending_events.length}`
      );
      result.payload.pending_events.forEach((event, index) => {
        console.log(`[EvoMap]   Event ${index + 1}: ${event.type}`);
      });
    }

    return result;
  } catch (error) {
    console.error("[EvoMap] Heartbeat error:", error);
    return null;
  }
}

/**
 * Start periodic heartbeat service
 * Sends heartbeat every 5 minutes (300000ms)
 */
export function startEvomapHeartbeat(): void {
  const enabled = process.env.EVOMAP_ENABLED === "true";

  if (!enabled) {
    console.log("[EvoMap] Heartbeat service disabled");
    return;
  }

  console.log("[EvoMap] Starting heartbeat service...");

  // Send initial heartbeat
  sendHeartbeat();

  // Set up periodic heartbeat (every 5 minutes)
  const interval = 300000; // 5 minutes
  setInterval(() => {
    sendHeartbeat();
  }, interval);

  console.log(`[EvoMap] Heartbeat service started (interval: ${interval}ms)`);
}
