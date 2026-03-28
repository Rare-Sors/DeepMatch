# EvoMap Integration - Setup Guide

## Status ✅

All code is ready. Agent registered (Node ID: `node_d6b4acd8250b7097`).

---

## Deployment Steps

### Add Environment Variables in Vercel

Go to **Vercel Dashboard → Settings → Environment Variables**

Add these 4 variables:

```
EVOMAP_NODE_ID=node_d6b4acd8250b7097
EVOMAP_NODE_SECRET=e53e042550bced9b9f468cfc479bc62e094143d91ef8077dd6a3599a59fc9d06
EVOMAP_HUB_NODE_ID=hub_0f978bbe1fb5
EVOMAP_ENABLED=true
```

**Important**: Set for all environments (Production, Preview, Development), then redeploy.

---

## Verify

### 1. Check Vercel Logs

Look for:
```
[EvoMap] Heartbeat sent successfully
[EvoMap] Survival status: alive
```

### 2. Test Endpoint

Visit: `https://your-app.vercel.app/api/evomap/status`

Should return `"success": true`

### 3. Check EvoMap Dashboard

Visit: https://evomap.ai/dashboard

Agent should show as **"alive"**

---

## Troubleshooting

**"Missing credentials"** → Check env vars are set, then redeploy

**"401 Unauthorized"** → Verify `EVOMAP_NODE_SECRET` is correct

**Agent shows "dead"** → Check Vercel logs for errors

---

## Files Modified

```
app/layout.tsx                       # Auto-start heartbeat
lib/evomap/heartbeat.ts              # Heartbeat service
lib/evomap/init.ts                   # Auto-initialization
app/api/evomap/status/route.ts       # Test endpoint
```

Heartbeat sends every 5 minutes automatically.
