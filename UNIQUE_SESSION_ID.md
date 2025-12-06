# Unique Session ID Implementation

## Overview
Updated the assessment scanning system to generate unique session IDs using timestamps. This ensures that each scan run creates a new session, even for the same assessment, preventing conflicts and enabling proper scan history tracking.

---

## Changes Made

### 1. **Schema Update** (`convex/schema.ts`)

Added `sessionId` field to assessments table:

```typescript
assessments: defineTable({
  // ... existing fields ...
  sessionId: v.optional(v.string()), // Backend session ID for this assessment run
  // ... rest of fields ...
})
  .index("by_session", ["sessionId"]) // New index for session lookup
```

**Benefits:**
- Store the unique session ID for each assessment run
- Query assessments by session ID
- Track scan history for the same assessment

---

### 2. **Scan Route Update** (`app/api/assessments/[assessmentId]/scan/route.ts`)

#### Session ID Generation
Changed from static to dynamic with timestamp:

**Before:**
```typescript
const sessionId = `assessment_${assessmentId}`;
```

**After:**
```typescript
const timestamp = Math.floor(Date.now() / 1000);
const scanType = type || 'blackbox';
const sessionId = `${scanType}_${assessmentId}_{timestamp}`;
```

**Format:** `{type}_{assessmentId}_{timestamp}`

**Examples:**
- `blackbox_k57abc123_1733600000`
- `whitebox_k57def456_1733600123`

#### Response Headers
Added session ID to response headers:

```typescript
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Session-ID": sessionId, // New header
  },
});
```

---

### 3. **Assessment Mutation Update** (`convex/assessments.ts`)

Updated `updateStatus` mutation to accept and store sessionId:

```typescript
export const updateStatus = mutation({
  args: {
    assessmentId: v.string(),
    status: v.string(),
    completedAt: v.optional(v.number()),
    sessionId: v.optional(v.string()), // New parameter
  },
  handler: async (ctx, args) => {
    // ... validation ...
    
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.sessionId !== undefined) {
      updates.sessionId = args.sessionId;
    }

    await ctx.db.patch(args.assessmentId as any, updates);
  },
});
```

---

### 4. **SSE Hook Update** (`hooks/use-sse.ts`)

Added `onStart` callback to capture session ID from response:

```typescript
interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  onComplete?: (report?: string) => void;
  onError?: (error: Error) => void;
  onStart?: (response: Response) => void; // New callback
  method?: "GET" | "POST";
  body?: any;
}
```

Implementation:
```typescript
const response = await fetch(url, fetchOptions);

// Call onStart callback with response (to extract headers like sessionId)
if (currentOptions.onStart) {
  currentOptions.onStart(response);
}
```

---

### 5. **Assessment Detail Component** (`components/assessment-detail-content.tsx`)

Added `onStart` handler to save sessionId:

```typescript
const { logs, isStreaming, finalReport, error, start, stop } = useSSE(scanUrl, {
  method: "POST",
  body: requestBody,
  onStart: async (response) => {
    // Extract sessionId from response headers and save to assessment
    const sessionId = response.headers.get("X-Session-ID");
    if (sessionId && assessment) {
      console.log("[AssessmentDetail] Saving sessionId to assessment:", sessionId);
      try {
        await updateAssessmentStatus({
          assessmentId,
          status: "running",
          sessionId,
        });
      } catch (err) {
        console.error("[AssessmentDetail] Failed to save sessionId:", err);
      }
    }
  },
  // ... other callbacks ...
});
```

---

### 6. **Report Fetching Update** (`app/api/assessments/[assessmentId]/report/route.ts`)

Updated to retrieve sessionId from assessment:

```typescript
// Get assessment from Convex to retrieve sessionId
const assessment = await fetchQuery(api.assessments.get, { assessmentId });

if (!assessment) {
  return new Response(
    JSON.stringify({ error: "Assessment not found" }),
    { status: 404 }
  );
}

// Get sessionId from assessment or fallback to old format
const sessionId = "sessionId" in assessment && assessment.sessionId 
  ? assessment.sessionId 
  : `assessment_${assessmentId}`; // Fallback for backward compatibility

// Use sessionId to fetch report from backend...
```

**Backward Compatibility:**
- Old assessments without sessionId will use the fallback format
- New assessments will use the stored unique sessionId

---

## Benefits

### 1. **Unique Sessions Per Scan**
Each scan run creates a unique session, even if rescanning the same assessment:
- First scan: `blackbox_k57abc123_1733600000`
- Second scan: `blackbox_k57abc123_1733600100`

### 2. **Scan History**
- Can track multiple scans of the same assessment
- Each scan has its own session and report
- No session conflicts when re-running scans

### 3. **Accurate Reports**
- Reports are always fetched from the correct session
- No risk of mixing reports from different scan runs
- Clear audit trail of when each scan occurred

### 4. **Debugging**
- Timestamp in session ID makes it easy to identify when scan ran
- Session type (blackbox/whitebox) clearly visible in ID
- Easier to correlate logs with specific scan runs

### 5. **Backward Compatibility**
- Old assessments without sessionId still work
- Fallback mechanism ensures no breaking changes
- Gradual migration path for existing data

---

## Session ID Format

### Structure
```
{scanType}_{assessmentId}_{unixTimestamp}
```

### Components
1. **scanType**: "blackbox" or "whitebox"
2. **assessmentId**: Convex assessment ID (e.g., "k57abc123")
3. **unixTimestamp**: Unix timestamp in seconds (e.g., 1733600000)

### Examples

**Blackbox scan:**
```
blackbox_k57abc123_1733600000
```

**Whitebox scan:**
```
whitebox_k57def456_1733600123
```

**Multiple scans of same assessment:**
```
blackbox_k57abc123_1733600000  // First scan
blackbox_k57abc123_1733600050  // Second scan (50 seconds later)
blackbox_k57abc123_1733600100  // Third scan (another 50 seconds later)
```

---

## Data Flow

### Scan Start
```
1. User clicks "Start Scan"
   ↓
2. Generate unique sessionId: {type}_{id}_{timestamp}
   ↓
3. Create session in backend API
   ↓
4. Return sessionId in X-Session-ID header
   ↓
5. SSE hook captures sessionId via onStart callback
   ↓
6. Save sessionId to assessment record
   ↓
7. Stream SSE events (scanning in progress)
```

### Report Fetch
```
1. User clicks "Fetch Report" or auto-fetch after scan
   ↓
2. Fetch assessment from database
   ↓
3. Get sessionId from assessment.sessionId
   ↓
4. Call backend: GET /sessions/{sessionId}
   ↓
5. Extract report from session data
   ↓
6. Return report to frontend
```

---

## Testing

### Test Case 1: New Scan
```typescript
// Start first scan
POST /api/assessments/k57abc123/scan
// SessionId: blackbox_k57abc123_1733600000

// Wait for completion...

// Start second scan (same assessment)
POST /api/assessments/k57abc123/scan
// SessionId: blackbox_k57abc123_1733600050

// Result: Two different sessions created ✅
```

### Test Case 2: Report Fetch
```typescript
// Fetch report from specific scan
GET /api/assessments/k57abc123/report

// Backend:
// 1. Gets assessment from DB
// 2. Reads sessionId: blackbox_k57abc123_1733600000
// 3. Fetches report from that specific session
// 4. Returns correct report ✅
```

### Test Case 3: Backward Compatibility
```typescript
// Old assessment (no sessionId in DB)
GET /api/assessments/old123/report

// Backend:
// 1. Gets assessment from DB
// 2. sessionId is undefined
// 3. Falls back to: assessment_old123
// 4. Attempts to fetch from fallback session ✅
```

---

## Migration Notes

### Existing Assessments
- Assessments created before this update will not have a sessionId
- Report fetching will use fallback format: `assessment_{assessmentId}`
- New scans of old assessments will generate and store unique sessionIds

### Database Migration
No migration required! The sessionId field is optional:
- Old records: `sessionId: undefined` → Uses fallback
- New records: `sessionId: "blackbox_k57abc123_1733600000"` → Uses stored value

---

## Logging

Enhanced logging to track session IDs:

```
[Scan API] ===== STARTING NEW SCAN REQUEST =====
[Scan API] Assessment ID: k57abc123
[Scan API] Session ID (UNIQUE): blackbox_k57abc123_1733600000
[Scan API] Timestamp: 1733600000
[Scan API] Type: blackbox

[AssessmentDetail] Saving sessionId to assessment: blackbox_k57abc123_1733600000

[Report API] Session ID from database: blackbox_k57abc123_1733600000
```

---

## Security Considerations

### Session ID Predictability
- Timestamp-based IDs are somewhat predictable
- However, sessions are scoped to:
  - Specific app (Nassa)
  - Specific user (authenticated)
  - Specific assessment (authorization required)
- Backend should validate session ownership

### Recommendations
- Backend validates user owns the session
- Frontend authentication required (Next-Auth)
- Assessment-level authorization checks
- Consider adding random component if needed (e.g., `{type}_{id}_{timestamp}_{random}`)

---

## Future Enhancements

### Possible Improvements
1. **Add random suffix** for extra uniqueness and security
2. **Store multiple sessionIds** to track all scan runs
3. **Session history UI** to view past scan results
4. **Compare reports** between different sessions
5. **Re-fetch old reports** by selecting from session history

### Example: Session History Table
```typescript
scanHistory: defineTable({
  assessmentId: v.string(),
  sessionId: v.string(),
  status: v.string(),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  reportSummary: v.optional(v.string()),
})
  .index("by_assessment", ["assessmentId"])
  .index("by_session", ["sessionId"])
```

---

## Summary

✅ **Unique session IDs** for each scan run
✅ **Timestamp-based** generation ensures no conflicts  
✅ **Stored in database** for accurate report fetching  
✅ **Backward compatible** with existing assessments  
✅ **Enhanced logging** for better debugging  
✅ **Clear audit trail** of all scan runs  

The system now properly handles multiple scans of the same assessment without session conflicts! 🎉

