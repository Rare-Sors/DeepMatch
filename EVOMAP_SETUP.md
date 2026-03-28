# EvoMap Integration - Implementation Notes

## What's Been Done (Local)

✅ **Documentation**:
- `evomap-integration.md` - Complete integration guide for deployment

✅ **Code Implementation**:
- `lib/evomap/heartbeat.ts` - Heartbeat service (sends every 5 minutes)
- `lib/evomap/init.ts` - Auto-initialization module
- `app/api/evomap/status/route.ts` - Test endpoint for verification

✅ **Credentials**:
- Agent already registered and claimed on EvoMap
- Node ID: `node_d6b4acd8250b7097`
- Claim Code: `RCHW-LHY4` (already bound)

---

## What Needs to Be Done (Vercel Deployment)

### Step 1: Add Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:
```
EVOMAP_NODE_ID=node_d6b4acd8250b7097
EVOMAP_NODE_SECRET=e53e042550bced9b9f468cfc479bc62e094143d91ef8077dd6a3599a59fc9d06
EVOMAP_HUB_NODE_ID=hub_0f978bbe1fb5
EVOMAP_ENABLED=true
```

**Important**: Set for all environments (Production, Preview, Development)

---

### Step 2: Start Heartbeat Service

Choose ONE of these options:

#### Option A: In Root Layout (Recommended)

Edit `app/layout.tsx`:

```typescript
import '@/lib/evomap/init';  // Add this line at the top

export default function RootLayout({ children }) {
  // ... rest of your layout
}
```

#### Option B: In API Route

Create or edit `app/api/health/route.ts`:

```typescript
import { startEvomapHeartbeat } from '@/lib/evomap/heartbeat';

// Start on first request
let started = false;
if (!started) {
  startEvomapHeartbeat();
  started = true;
}

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

#### Option C: In Middleware

Edit `middleware.ts`:

```typescript
import { startEvomapHeartbeat } from '@/lib/evomap/heartbeat';

let started = false;
if (!started) {
  startEvomapHeartbeat();
  started = true;
}

export function middleware(request: Request) {
  // ... your middleware logic
}
```

---

### Step 3: Deploy and Verify

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Add EvoMap integration"
   git push
   ```

2. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Deployments → Latest → Logs
   - Look for:
     ```
     [EvoMap] Starting heartbeat service...
     [EvoMap] Heartbeat sent successfully
     [EvoMap] Credit balance: 0
     ```

3. **Test Status Endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/evomap/status
   ```

   Should return:
   ```json
   {
     "success": true,
     "timestamp": "2026-03-28T...",
     "evomap": {
       "status": "acknowledged",
       "credit_balance": 0,
       "survival_status": "alive",
       "pending_events": []
     }
   }
   ```

4. **Check EvoMap Dashboard**:
   - Visit https://evomap.ai/dashboard
   - Your agent should show as "alive"
   - Heartbeat timestamp should update every 5 minutes

---

## Troubleshooting

### "Heartbeat skipped: Missing credentials"

**Cause**: Environment variables not set

**Fix**:
1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure all 4 variables are set
3. Redeploy after adding variables

---

### "Heartbeat failed: 401 Unauthorized"

**Cause**: Wrong `node_secret` or node expired

**Fix**:
1. Verify `EVOMAP_NODE_SECRET` matches the value in `evomap_credentials.json`
2. If node expired, re-register using `register_agent.py`

---

### Agent shows as "dead" on EvoMap

**Cause**: Heartbeat not running or interval too long

**Fix**:
1. Check Vercel logs for heartbeat messages
2. Ensure heartbeat service is started (see Step 2)
3. Verify no errors in logs

---

### Environment variables not working

**Cause**: Variables not applied to current deployment

**Fix**:
1. After adding env vars, trigger a new deployment
2. Or: Redeploy → Deployments → Latest → Redeploy

---

## Files Created

```
DeepMatch/
├── evomap-integration.md           # Integration guide
├── lib/
│   └── evomap/
│       ├── heartbeat.ts             # Heartbeat service
│       └── init.ts                  # Auto-initialization
└── app/
    └── api/
        └── evomap/
            └── status/
                └── route.ts         # Test endpoint
```

---

## Security Notes

⚠️ **DO NOT commit `evomap_credentials.json` to git**

The credentials file in `C:\Users\Wang Hongyue\Downloads\workspace\` should stay local.
Only use environment variables in Vercel.

---

## Estimated Time

- **Adding env vars**: 2 minutes
- **Starting heartbeat**: 5 minutes (choose one option)
- **Deploy and verify**: 10 minutes

**Total**: ~15-20 minutes

---

## Questions?

Read `evomap-integration.md` for detailed explanations.
