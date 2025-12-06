# Manual Report Generation Flow

## Overview
Changed the report generation flow from automatic to manual. Reports are now ONLY generated when the user explicitly clicks "Generate Report" button after the scan completes successfully.

## New User Flow

### 1. Assessment Running
```
User starts assessment
        ↓
SSE stream begins
        ↓
Terminal shows real-time logs
        ↓
[NO report extraction during stream]
```

### 2. Assessment Completes
```
SSE stream ends successfully
        ↓
Assessment status → "completed"
        ↓
Success notification shown
        ↓
[STOP - No automatic report fetch]
        ↓
Show "Generate Report" button
```

### 3. User Generates Report
```
User clicks "Generate Report" button
        ↓
Call /api/assessments/[id]/report
        ↓
Fetch report from Nassa Agent session
        ↓
Validate report
        ↓
Parse report & create findings
        ↓
Auto-open Report Viewer modal
```

## Changes Made

### 1. SSE Hook (`hooks/use-sse.ts`)

#### Removed Report Extraction
```typescript
// BEFORE: Checked every text chunk for report markers
if (part.text) {
  const report = extractReport(text, reportType);
  if (report) {
    // Auto-extracted and completed
  }
}

// AFTER: Just logs the text, no extraction
if (part.text) {
  addLog({ text, ... });
  // NOTE: We don't extract reports here anymore
}
```

#### Stream End Behavior
```typescript
// BEFORE: Auto-fetched report after stream
onStreamEnd: () => {
  setTimeout(() => fetchReport(), 3000);
}

// AFTER: Just marks as complete
onStreamEnd: () => {
  updateStatus("completed");
  showSuccess("Assessment completed!");
}
```

### 2. Assessment Detail Content (`components/assessment-detail-content.tsx`)

#### Removed Auto-Fetch
```typescript
// BEFORE: onComplete tried to auto-fetch
onComplete: async (report) => {
  if (report) {
    await parseReport(report);
  } else {
    await fetchReport(); // Auto-fetch fallback
  }
}

// AFTER: onComplete just logs completion
onComplete: async () => {
  // Persist logs
  console.log("Scan completed successfully");
  // No auto-fetch!
}
```

#### New UI State
```typescript
// Shows different UI based on report state:

// 1. Running - Show terminal with logs
// 2. Completed + No Report - Show "Generate Report" button
// 3. Completed + Has Report - Show "View Report" button
```

## UI Components

### Before Report Generation
```tsx
<div className="bg-green-50">
  <h3>✅ Assessment Completed Successfully!</h3>
  <p>Click the button to generate and view the report</p>
  <button onClick={generateReport}>
    {loading ? "Generating..." : "Generate Report"}
  </button>
</div>
```

### After Report Generation
```tsx
<div className="bg-blue-50">
  <h3>📄 Report Generated!</h3>
  <p>Source: {source} • {length} characters</p>
  <p>Validation: {valid ? "PASSED" : "INCOMPLETE"}</p>
  <button onClick={viewReport}>
    View Report
  </button>
</div>
```

## Terminal Display

The terminal now shows:
- ✅ All SSE events (no filtering)
- ✅ Complete text content (no truncation)
- ✅ Function calls with arguments
- ✅ Function responses with data
- ✅ Real-time streaming status
- ❌ NO report extraction markers
- ❌ NO "Report fetched" messages during scan

## Benefits

### 1. **User Control**
- User decides when to generate report
- No unexpected API calls
- Clear action required

### 2. **Performance**
- Stream not interrupted by report checks
- Faster SSE processing
- No regex matching on every chunk

### 3. **Reliability**
- Stream completes fully before report generation
- Backend has time to finalize data
- Better error handling

### 4. **UX Clarity**
- Clear "completed" state
- Explicit action to generate report
- Progress feedback on button

### 5. **Resource Efficiency**
- Report only generated when needed
- User might not want report immediately
- Saves API calls if user leaves

## Error Handling

### Stream Errors
```typescript
onError: (err) => {
  showError("Scan failed");
  updateStatus("failed");
  // No report generation attempted
}
```

### Report Generation Errors
```typescript
onError: (err) => {
  showError("Failed to fetch report");
  // Show retry button
  // Keep "Generate Report" button available
}
```

## State Management

```typescript
// Assessment states:
- "pending"   → Not started
- "running"   → SSE streaming (show terminal)
- "completed" → Stream finished (show generate button)
- "failed"    → Error occurred

// Report states:
- null            → Not generated yet
- loading         → Fetching from API
- success + data  → Generated and ready
- error           → Generation failed
```

## Code Flow

### Stream Completion
```typescript
1. SSE stream ends
2. onStreamEnd() called
3. Update assessment status to "completed"
4. Show success notification
5. Display "Generate Report" button
6. [STOP - Wait for user]
```

### Report Generation
```typescript
1. User clicks "Generate Report"
2. Call fetchReport(assessmentId, type)
3. API fetches from Nassa Agent session
4. Validate report (keywords & sections)
5. Parse report & create findings
6. Auto-open Report Viewer modal
7. Show "View Report" button for re-opening
```

## API Integration

### Report API Call
```typescript
GET /api/assessments/[assessmentId]/report?type=blackbox|whitebox

// Called ONLY when user clicks button
// Not called during stream
// Not called on stream end
```

### Response
```json
{
  "success": true,
  "report": "# Security Report...",
  "source": "events",
  "sessionId": "assessment_xyz",
  "reportType": "blackbox",
  "length": 12345,
  "validation": {
    "valid": true,
    "missingKeywords": [],
    "missingSections": [],
    ...
  }
}
```

## User Experience

### Old Flow (Automatic)
```
Scan running → Stream ends → [3s delay] → Report auto-fetched → Modal opens
                                ↑
                        User has no control
```

### New Flow (Manual)
```
Scan running → Stream ends → Success message → [User sees button]
                                                      ↓
                                              [User clicks when ready]
                                                      ↓
                                              Report generated → Modal opens
```

## Summary

✅ **Manual control** - User triggers report generation  
✅ **Clean stream** - No report checking during scan  
✅ **Better UX** - Clear states and actions  
✅ **More reliable** - Backend has time to finalize  
✅ **Efficient** - Only generate when needed  
✅ **Same validation** - Still checks quality  
✅ **Same viewer** - Beautiful report display  

The report generation is now a **deliberate user action** rather than an automatic background process!

