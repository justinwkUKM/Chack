# Assessment API Usage Guide

## Overview
The Assessment API creates a session first, then calls the run_sse API to perform security scans. The implementation is in `/app/api/assessments/[assessmentId]/scan/route.ts`.

## API Flow

### Step 1: Create Session
```bash
POST https://chack.ngrok.app/apps/{APP_NAME}/users/{userId}/sessions/{sessionId}
Content-Type: application/json

{}
```

**Example:**
```bash
curl -X POST "https://chack.ngrok.app/apps/Nassa/users/waqasobeidy/sessions/assessment_abc123" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "id": "assessment_abc123",
  "appName": "Nassa",
  "userId": "waqasobeidy",
  "state": {},
  "events": [],
  "lastUpdateTime": 1765041529.4796646
}
```

### Step 2: Start Scan with SSE
```bash
POST https://chack.ngrok.app/run_sse
Content-Type: application/json

{
  "appName": "Nassa",
  "userId": "waqasobeidy",
  "sessionId": "assessment_abc123",
  "newMessage": {
    "role": "user",
    "parts": [
      { "text": "scan http://testphp.vulnweb.com" }
    ]
  },
  "streaming": false
}
```

**Example:**
```bash
curl -N -X POST "https://chack.ngrok.app/run_sse" \
  -H "Content-Type: application/json" \
  -d '{  
    "appName": "Nassa",
    "userId": "waqasobeidy",
    "sessionId": "assessment_abc123",
    "newMessage": {
      "role": "user",
      "parts": [
        { "text": "scan http://testphp.vulnweb.com" }
      ]
    },
    "streaming": false
  }'
```

## Implementation Details

### User ID Format
- The API extracts the username from the user's email
- Example: `waqasobeidy@example.com` → `waqasobeidy`
- This matches the curl command format

### Session ID Format
- Generated as: `{type}_{assessmentId}_{timestamp}`
- Example: If assessmentId is "k57abc123" and type is "blackbox", sessionId will be "blackbox_k57abc123_1733600000"
- The timestamp ensures each scan run creates a unique session
- SessionId is stored in the assessment record and returned in the `X-Session-ID` response header

### Request Body Parameters

**Required (one of):**
- `targetUrl`: URL to scan for blackbox testing (e.g., "http://testphp.vulnweb.com")
- `gitRepoUrl`: Git repository URL for whitebox testing

**Optional:**
- `type`: "blackbox" or "whitebox" (determines which URL to use)

### Scan Command Generation
- **Blackbox:** Uses `targetUrl` → `scan {targetUrl}`
- **Whitebox:** Uses `gitRepoUrl` → `scan {gitRepoUrl}`

## Usage Example

### Frontend API Call
```typescript
const response = await fetch(`/api/assessments/${assessmentId}/scan`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    targetUrl: 'http://testphp.vulnweb.com',
    type: 'blackbox'
  })
});

// For SSE streaming
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process SSE events
  console.log(chunk);
}
```

## Environment Variables

Set these in your `.env.local` file:

```bash
ASSESSMENT_API_URL=https://chack.ngrok.app
ASSESSMENT_APP_NAME=Nassa
```

## Error Handling

The API handles several error cases:
- **401 Unauthorized**: No valid session
- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: Backend service errors

## SSE Response Format

The API streams Server-Sent Events (SSE) in the following format:

```
data: {"author": "agent", "content": {"parts": [{"text": "Starting scan..."}]}}

data: {"author": "agent", "content": {"parts": [{"text": "Vulnerability found..."}]}}

data: {"author": "agent", "content": {"parts": [{"text": "Scan complete"}]}}
```

Each event contains:
- `author`: "agent" or "user"
- `content.parts[0].text`: The actual message/output

## Testing

To test the API:

1. Start your Next.js dev server:
```bash
npm run dev
```

2. Ensure you're authenticated (have a valid session)

3. Make a POST request to:
```
POST http://localhost:3000/api/assessments/{assessmentId}/scan
```

With body:
```json
{
  "targetUrl": "http://testphp.vulnweb.com",
  "type": "blackbox"
}
```

4. Watch the console logs for detailed debugging information

---

## Fetching Reports After Scan

Once a scan completes, you can fetch the full report from the session.

### Fetch Report API

```bash
GET /api/assessments/{assessmentId}/report?type={reportType}
```

**Parameters:**
- `assessmentId`: The assessment ID
- `type` (query param): `"blackbox"` or `"whitebox"` (optional, defaults to "blackbox")

**Example:**
```bash
curl http://localhost:3000/api/assessments/k57abc123/report?type=blackbox
```

**Response:**
```json
{
  "success": true,
  "report": "# Security Assessment Report\n...",
  "source": "events",
  "sessionId": "assessment_k57abc123",
  "reportType": "blackbox",
  "length": 15234
}
```

### Report Extraction Process

The API searches for reports in this order:

1. **Event Stream**: Collects all text from session events and looks for report markers
   - Blackbox: `===BLACKBOX_REPORT_START===` ... `===BLACKBOX_REPORT_END===`
   - Whitebox: `===WHITEBOX_REPORT_START===` ... `===WHITEBOX_REPORT_END===`

2. **Session State**: If not found in events, checks state keys:
   - `static_analysis_result`
   - `recon_report`
   - `whitebox_report`
   - `blackbox_report`

3. **Not Found**: Returns 404 with suggestions if no report exists

### Frontend Usage

Use the `useFetchReport` hook:

```typescript
import { useFetchReport } from "@/hooks/use-fetch-report";

function MyComponent() {
  const { fetchReport, isLoading, reportData } = useFetchReport({
    onSuccess: (data) => {
      console.log("Report fetched:", data.report);
    },
  });

  const handleFetch = async () => {
    await fetchReport("assessment_id", "blackbox");
  };

  return (
    <button onClick={handleFetch} disabled={isLoading}>
      {isLoading ? "Fetching..." : "Fetch Report"}
    </button>
  );
}
```

### Automatic Fallback

The assessment detail page automatically fetches the report from the session if:
- The SSE stream completes without extracting a report
- The scan finished successfully

This ensures you always get the report even if the SSE connection was interrupted.

For more details, see [REPORT_FETCHING.md](./REPORT_FETCHING.md)

