# Report Fetching Functionality

This document explains how to fetch security assessment reports from completed scans using the Nassa CTF Agent session API.

## Overview

When an assessment scan completes, the full report is stored in the backend session. This functionality allows you to retrieve that report even if it wasn't fully captured during the SSE stream.

## Architecture

### 1. **API Route: `/api/assessments/[assessmentId]/report`**

Location: `app/api/assessments/[assessmentId]/report/route.ts`

This GET endpoint fetches the report from an existing session.

#### Request Format

```typescript
GET /api/assessments/{assessmentId}/report?type={reportType}
```

**Query Parameters:**
- `type` (optional): `"blackbox"` or `"whitebox"` (defaults to `"blackbox"`)

**Authentication:** Requires valid Next-Auth session

#### Response Format

**Success (200):**
```json
{
  "success": true,
  "report": "# Security Assessment Report\n...",
  "source": "events" | "state.{key}",
  "sessionId": "assessment_abc123",
  "reportType": "blackbox",
  "length": 15234,
  "hasMarkers": true
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Report not found in session",
  "details": {
    "sessionId": "assessment_abc123",
    "reportType": "blackbox",
    "availableStateKeys": ["recon_report"],
    "eventsCount": 45,
    "suggestions": [
      "Report may not have been generated yet",
      "Try the opposite report type (whitebox/blackbox)",
      "Check if the scan completed successfully"
    ]
  }
}
```

### 2. **React Hook: `useFetchReport`**

Location: `hooks/use-fetch-report.ts`

A custom hook that wraps the report fetching logic with loading and error states.

#### Usage

```typescript
import { useFetchReport } from "@/hooks/use-fetch-report";

function MyComponent() {
  const { fetchReport, isLoading, error, reportData } = useFetchReport({
    onSuccess: (data) => {
      console.log("Report fetched:", data.report);
    },
    onError: (err) => {
      console.error("Failed:", err);
    },
  });

  const handleFetch = async () => {
    const data = await fetchReport("assessment_123", "blackbox");
    if (data?.success) {
      // Use the report
      console.log(data.report);
    }
  };

  return (
    <button onClick={handleFetch} disabled={isLoading}>
      {isLoading ? "Fetching..." : "Fetch Report"}
    </button>
  );
}
```

#### API

**Parameters:**
```typescript
interface UseFetchReportOptions {
  onSuccess?: (data: ReportData) => void;
  onError?: (error: Error) => void;
}
```

**Return Value:**
```typescript
{
  fetchReport: (assessmentId: string, reportType?: "blackbox" | "whitebox") => Promise<ReportData | null>;
  isLoading: boolean;
  error: Error | null;
  reportData: ReportData | null;
  reset: () => void;
}
```

## Report Extraction Logic

The system uses a multi-stage approach to find and extract reports:

### Stage 1: Search Event Stream

1. Collect all text from session events
2. Look for report markers:
   - Blackbox: `===BLACKBOX_REPORT_START===` ... `===BLACKBOX_REPORT_END===`
   - Whitebox: `===WHITEBOX_REPORT_START===` ... `===WHITEBOX_REPORT_END===`
3. Extract content between markers if found

### Stage 2: Search Session State

If markers not found in events, check session state keys in order:
1. `static_analysis_result`
2. `recon_report`
3. `whitebox_report`
4. `blackbox_report`
5. `{reportType}_report`

Try to extract with markers first, then return raw content if no markers.

### Stage 3: Report Not Found

Return 404 with helpful suggestions if no report found.

## Integration with Assessment Flow

### Automatic Fallback

The `AssessmentDetailContent` component automatically attempts to fetch the report from the session if:
1. SSE stream completes
2. No report was extracted from the stream
3. Assessment is still in "running" or "completed" state

```typescript
onComplete: async (report) => {
  if (!report && assessment) {
    // No report in stream, fetch from session
    setTimeout(async () => {
      await fetchReport(assessmentId, assessment.type);
    }, 2000); // 2s delay to ensure session is updated
  }
}
```

### Manual Fetch Button

For completed assessments, users can manually fetch the report:

```typescript
<button
  onClick={async () => {
    await fetchReport(assessmentId, assessment.type);
  }}
  disabled={isLoadingReport}
>
  {isLoadingReport ? "Fetching..." : "Fetch Report"}
</button>
```

## Python Reference Script

The original Python script (`fetch_report_from_session.py`) demonstrates the API usage:

```python
# Fetch session
url = f"{API_URL}/apps/{APP_NAME}/users/{USER_ID}/sessions/{session_id}"
response = requests.get(url)
session_data = response.json()

# Extract report from events
all_text = ""
for event in session_data.get('events', []):
    for part in event.get('content', {}).get('parts', []):
        if 'text' in part:
            all_text += part['text'] + "\n"

# Look for markers
marker_start = f"==={report_type.upper()}_REPORT_START==="
if marker_start in all_text:
    report = extract_report(all_text, report_type)
```

## Testing

### Manual Testing

1. **Complete an assessment scan:**
   ```bash
   # Start a scan through the UI or API
   POST /api/assessments/{id}/scan
   ```

2. **Wait for completion:**
   - Monitor SSE stream
   - Check assessment status changes to "completed"

3. **Fetch the report:**
   ```bash
   # Via API
   curl http://localhost:3000/api/assessments/{id}/report?type=blackbox
   
   # Or click "Fetch Report" button in UI
   ```

### Expected Behavior

**Scenario 1: Report with markers in events**
- ✅ Report extracted from events
- Source: `"events"`
- Has markers: `true`

**Scenario 2: Report without markers in state**
- ✅ Report extracted from state
- Source: `"state.blackbox_report"`
- Has markers: `false`

**Scenario 3: No report found**
- ❌ 404 error
- Suggestions provided
- Available state keys listed

## Environment Variables

Required in `.env.local`:

```bash
ASSESSMENT_API_URL=https://chack.ngrok.app
ASSESSMENT_APP_NAME=Nassa
```

## Session ID Format

Session IDs are generated as:
```typescript
const sessionId = `assessment_${assessmentId}`;
```

Example: `assessment_k57abc123def456789`

## Error Handling

### Common Errors

**401 Unauthorized**
- User not authenticated
- Session expired
- Solution: Re-login

**404 Not Found**
- Session doesn't exist
- Report not generated yet
- Wrong report type
- Solution: Check assessment status, try opposite type

**500 Internal Server Error**
- Backend API unavailable
- Network error
- Solution: Check backend logs, verify API_URL

## Best Practices

1. **Always use fallback:** Implement automatic report fetching if SSE doesn't capture it
2. **Add delays:** Wait 2-3 seconds after scan completion before fetching
3. **Handle both types:** Try both blackbox and whitebox if one fails
4. **Show progress:** Display loading states during fetch
5. **Cache results:** Store fetched reports to avoid redundant requests
6. **Parse immediately:** When report is fetched, parse it into findings/results right away

## Future Enhancements

Possible improvements:
- [ ] Add report download as PDF/Markdown
- [ ] Support partial report fetching (pagination)
- [ ] Add report comparison between scans
- [ ] Implement report caching on client side
- [ ] Add webhook notifications when report is ready
- [ ] Support multiple report formats (JSON, HTML, PDF)

