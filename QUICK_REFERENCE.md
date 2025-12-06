# Quick Reference: Assessment API & Report Fetching

## 🚀 Quick Start

### 1. Start a Scan

```typescript
// POST /api/assessments/{id}/scan
fetch(`/api/assessments/${assessmentId}/scan`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'http://testphp.vulnweb.com',
    type: 'blackbox'
  })
});
```

### 2. Fetch Report After Completion

```typescript
// GET /api/assessments/{id}/report?type=blackbox
fetch(`/api/assessments/${assessmentId}/report?type=blackbox`)
  .then(res => res.json())
  .then(data => console.log(data.report));
```

---

## 🔑 Key Concepts

### Session Management
- **Session ID Format**: `{type}_{assessmentId}_{timestamp}`
  - Example: `blackbox_k57abc123_1733600000`
  - Example: `whitebox_k57def456_1733600123`
- **User ID Format**: Email username (e.g., `waqasobeidy`)
- **Backend Session**: `{API_URL}/apps/{APP_NAME}/users/{userId}/sessions/{sessionId}`
- **Uniqueness**: Each scan creates a unique session using timestamp
- **Storage**: SessionId is stored in the assessment record for later retrieval

### Report Types
- **Blackbox**: Web application security scan
- **Whitebox**: Source code analysis (git repo)

### Report Markers
```
Blackbox: ===BLACKBOX_REPORT_START=== ... ===BLACKBOX_REPORT_END===
Whitebox: ===WHITEBOX_REPORT_START=== ... ===WHITEBOX_REPORT_END===
```

---

## 📡 API Endpoints

### Scan Assessment
```http
POST /api/assessments/{assessmentId}/scan
Content-Type: application/json

{
  "targetUrl": "http://example.com",  // For blackbox
  "gitRepoUrl": "https://github...",  // For whitebox
  "type": "blackbox" | "whitebox"
}

Response: SSE stream with real-time logs
```

### Fetch Report
```http
GET /api/assessments/{assessmentId}/report?type=blackbox|whitebox

Response:
{
  "success": true,
  "report": "# Report content...",
  "source": "events" | "state.{key}",
  "sessionId": "assessment_...",
  "length": 15234
}
```

---

## 🎣 React Hooks

### useSSE (Scanning)
```typescript
import { useSSE } from "@/hooks/use-sse";

const { logs, isStreaming, finalReport, error, start, stop } = useSSE(
  `/api/assessments/${id}/scan`,
  {
    method: "POST",
    body: { targetUrl, type: "blackbox" },
    onComplete: (report) => console.log("Done!", report),
    onError: (err) => console.error("Error:", err),
  }
);
```

### useFetchReport (Report Fetching)
```typescript
import { useFetchReport } from "@/hooks/use-fetch-report";

const { fetchReport, isLoading, reportData, error } = useFetchReport({
  onSuccess: (data) => console.log("Report:", data.report),
  onError: (err) => console.error("Failed:", err),
});

// Call it
await fetchReport(assessmentId, "blackbox");
```

---

## 🔄 Complete Flow

```
1. User creates assessment
   ↓
2. Click "Start Scan"
   ↓
3. POST /api/assessments/{id}/scan
   ↓
4. Backend creates session: assessment_{id}
   ↓
5. Backend streams SSE events with logs
   ↓
6. Report embedded in final events
   ↓
7a. Report extracted from stream ✅
    OR
7b. Report fetched from session (fallback) ✅
   ↓
8. Parse report → Create findings/results
   ↓
9. Assessment status → "completed"
   ↓
10. User views findings & results
```

---

## 🛠️ Environment Setup

```bash
# .env.local
ASSESSMENT_API_URL=https://chack.ngrok.app
ASSESSMENT_APP_NAME=Nassa

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# GitHub OAuth (example)
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret
```

---

## 🐛 Debugging

### Check Session Exists
```bash
curl https://chack.ngrok.app/apps/Nassa/users/{userId}/sessions/{sessionId}
```

### Check Logs
```typescript
// Browser console
[Scan API] - Scan route logs
[useSSE] - Hook logs
[useFetchReport] - Fetch hook logs
[AssessmentDetail] - Component logs
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check authentication, re-login |
| 404 Report Not Found | Wait for scan to complete, try opposite type |
| Empty report | Check backend logs, verify scan completed |
| SSE not streaming | Check network tab, verify request body |
| userId format | Should be email username (no @domain) |

---

## 📊 Status Flow

```
pending → running → completed ✅
                 → failed ❌
```

---

## 🎯 Best Practices

1. **Always implement fallback**: Auto-fetch from session if SSE misses report
2. **Add delays**: Wait 2-3s after scan before fetching
3. **Handle both types**: Try alternate report type if first fails
4. **Show loading states**: Keep users informed
5. **Log everything**: Console logs help debugging
6. **Parse immediately**: Create findings right after getting report
7. **Error gracefully**: Show helpful error messages

---

## 📚 Documentation Files

- **API_USAGE.md** - Complete API documentation
- **REPORT_FETCHING.md** - Detailed report fetching guide
- **IMPLEMENTATION_SUMMARY.md** - What was built and how
- **QUICK_REFERENCE.md** - This file (quick lookup)

---

## ✅ Checklist for New Features

When adding assessment features:

- [ ] Update API routes if needed
- [ ] Add TypeScript types
- [ ] Create/update React hooks
- [ ] Update UI components
- [ ] Add error handling
- [ ] Add loading states
- [ ] Update documentation
- [ ] Test error cases
- [ ] Add console logging
- [ ] Verify authentication

---

## 🚨 Emergency Commands

### Restart Everything
```bash
# Kill dev server
Ctrl+C

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies (if needed)
npm install

# Start fresh
npm run dev
```

### Check Backend Health
```bash
curl https://chack.ngrok.app/health
# or whatever health endpoint exists
```

### Manual Session Creation
```bash
curl -X POST "https://chack.ngrok.app/apps/Nassa/users/{userId}/sessions/{sessionId}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 💡 Tips

- **Session IDs are reusable**: Same assessment always uses same session ID
- **Reports persist**: Can fetch reports multiple times
- **Type detection**: Can auto-detect type from session ID/assessment
- **Marker fallback**: System handles reports with or without markers
- **Multi-source**: Checks both events and state for maximum reliability

---

## 🎉 Success Indicators

You know it's working when:
- ✅ Console shows "Session created successfully"
- ✅ SSE events streaming in network tab
- ✅ Logs appearing in terminal viewer
- ✅ "Report extracted" or "Report fetched" message
- ✅ Findings/results created in database
- ✅ Assessment status changes to "completed"

---

**Need more details?** See the full documentation files listed above! 📖

