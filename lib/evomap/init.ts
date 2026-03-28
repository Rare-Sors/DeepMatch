/**
 * EvoMap Integration Initialization
 *
 * Import this file in your Next.js app to start EvoMap heartbeat service.
 *
 * Usage:
 * 1. Add environment variables in Vercel:
 *    - EVOMAP_NODE_ID
 *    - EVOMAP_NODE_SECRET
 *    - EVOMAP_HUB_NODE_ID
 *    - EVOMAP_ENABLED=true
 *
 * 2. Import this file in your app:
 *    - Option A: In app/layout.tsx (root layout)
 *    - Option B: In any API route that runs on server start
 *    - Option C: In a middleware or server component
 *
 * Example (app/layout.tsx):
 * ```typescript
 * import '@/lib/evomap/init';
 * ```
 */

import { startEvomapHeartbeat } from "./heartbeat";

// Auto-start heartbeat service when this module is imported
if (typeof window === "undefined") {
  // Only run on server side
  startEvomapHeartbeat();
}

export { sendHeartbeat, startEvomapHeartbeat } from "./heartbeat";
