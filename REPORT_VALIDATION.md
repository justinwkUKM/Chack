# Report Validation Feature

## Overview
Enhanced the report API to include comprehensive validation similar to the Python validation script. The API now validates reports for completeness before returning them to the frontend.

## Changes Made

### 1. Report API (`app/api/assessments/[assessmentId]/report/route.ts`)

#### Added Validation Constants
```typescript
// Required keywords for each report type
WHITEBOX_REQUIRED_KEYWORDS = [
  "Total vulnerabilities:",
  "High severity:",
  "Medium severity:",
  "Repository analyzed:",
]

BLACKBOX_REQUIRED_KEYWORDS = [
  "Target tested:",
  "Total vulnerabilities found:",
  "Critical vulnerabilities:",
  "Reconnaissance completed:",
]

// Required sections for each report type
WHITEBOX_REQUIRED_SECTIONS = [
  "# Whitebox Static Code Analysis Report",
  "## Executive Summary",
  "## Vulnerabilities Found",
  "## Security Recommendations",
]

BLACKBOX_REQUIRED_SECTIONS = [
  "# Blackbox Security Assessment Report",
  "## Executive Summary",
  "## 1. Reconnaissance Phase",
  "## 2. Exploitation Phase",
]
```

#### Added Validation Function
```typescript
function validateReport(reportContent: string, reportType: 'whitebox' | 'blackbox') {
  // Checks for:
  // - Required keywords presence
  // - Required sections presence
  // - Returns validation metrics
}
```

#### Enhanced Response
The API now returns validation data with every report:
```json
{
  "success": true,
  "report": "...",
  "source": "events|state.key",
  "sessionId": "...",
  "reportType": "whitebox|blackbox",
  "length": 12345,
  "validation": {
    "valid": true|false,
    "missingKeywords": [],
    "missingSections": [],
    "keywordCount": 4,
    "sectionCount": 4,
    "totalKeywords": 4,
    "totalSections": 4
  }
}
```

### 2. Hook (`hooks/use-fetch-report.ts`)

Updated `ReportData` interface to include validation data:
```typescript
export interface ReportData {
  // ... existing fields
  validation?: {
    valid: boolean;
    missingKeywords: string[];
    missingSections: string[];
    keywordCount: number;
    sectionCount: number;
    totalKeywords: number;
    totalSections: number;
  };
}
```

### 3. Component (`components/assessment-detail-content.tsx`)

Enhanced the UI to display validation status:
- Shows validation pass/fail status
- Displays keyword and section completion counts
- Color-coded indicators (green for valid, yellow for incomplete)

Example display:
```
✅ Report fetched from events (12345 chars)
✓ Validation: PASSED (4/4 keywords, 4/4 sections)
```

Or:
```
✅ Report fetched from state.static_analysis_result (8765 chars)
⚠ Validation: INCOMPLETE (3/4 keywords, 3/4 sections)
```

## How It Works

1. **Report Extraction**: The API fetches the session from Nassa Agent
2. **Marker Detection**: Looks for report markers in events and state
3. **Report Extraction**: Extracts content between markers (or raw content if no markers)
4. **Validation**: Validates the report for required keywords and sections
5. **Logging**: Comprehensive console logging of validation results
6. **Response**: Returns report with validation metadata

## Validation Flow

```
Session Fetch → Extract Report → Validate Report → Log Results → Return Response
                                        ↓
                        Check Keywords & Sections
                                        ↓
                    Generate Validation Metrics
```

## Console Logging

The API provides detailed console output:
```
[Report API] ✅ Report extracted from events!
[Report API] Report length: 12345 characters
[Report API] Validation: PASSED
[Report API] Keywords: 4/4
[Report API] Sections: 4/4
```

Or if validation fails:
```
[Report API] Validation: FAILED
[Report API] Keywords: 3/4
[Report API] Sections: 3/4
[Report API] Missing keywords: ["Total vulnerabilities:"]
[Report API] Missing sections: ["## Summary"]
```

## Benefits

1. **Quality Assurance**: Ensures reports are complete before showing to users
2. **Early Detection**: Identifies incomplete reports immediately
3. **Debugging**: Detailed logging helps troubleshoot report generation issues
4. **User Experience**: Visual feedback shows report completeness
5. **API Parity**: Matches Python validation script functionality

## Future Enhancements

- Add retry logic for incomplete reports
- Store validation results in database
- Alert users when reports are incomplete
- Add custom validation rules per assessment type
- Generate reports summary based on validation data

