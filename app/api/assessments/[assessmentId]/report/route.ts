// app/api/assessments/[assessmentId]/report/route.ts

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

const API_URL = process.env.ASSESSMENT_API_URL || "https://chack.ngrok.app";
const APP_NAME = process.env.ASSESSMENT_APP_NAME || "Nassa";

// Required keywords for report validation
const WHITEBOX_REQUIRED_KEYWORDS = [
  "Total vulnerabilities:",
  "High severity:",
  "Medium severity:",
  "Repository analyzed:",
];

const BLACKBOX_REQUIRED_KEYWORDS = [
  "Target tested:",
  "Total vulnerabilities found:",
  "Critical vulnerabilities:",
  "Reconnaissance completed:",
];

const WHITEBOX_REQUIRED_SECTIONS = [
  "# Whitebox Static Code Analysis Report",
  "## Executive Summary",
  "## Vulnerabilities Found",
  "## Security Recommendations",
];

const BLACKBOX_REQUIRED_SECTIONS = [
  "# Blackbox Security Assessment Report",
  "## Executive Summary",
  "## 1. Reconnaissance Phase",
  "## 2. Exploitation Phase",
];

/**
 * Validate that the report contains required keywords and sections
 */
function validateReport(reportContent: string, reportType: 'whitebox' | 'blackbox') {
  const requiredKeywords = reportType === 'whitebox' 
    ? WHITEBOX_REQUIRED_KEYWORDS 
    : BLACKBOX_REQUIRED_KEYWORDS;
  
  const requiredSections = reportType === 'whitebox'
    ? WHITEBOX_REQUIRED_SECTIONS
    : BLACKBOX_REQUIRED_SECTIONS;

  const missingKeywords: string[] = [];
  const missingSections: string[] = [];

  // Check for required keywords
  for (const keyword of requiredKeywords) {
    if (!reportContent.includes(keyword)) {
      missingKeywords.push(keyword);
    }
  }

  // Check for required sections
  for (const section of requiredSections) {
    if (!reportContent.includes(section)) {
      missingSections.push(section);
    }
  }

  const isValid = missingKeywords.length === 0 && missingSections.length === 0;

  return {
    valid: isValid,
    missingKeywords,
    missingSections,
    keywordCount: requiredKeywords.length - missingKeywords.length,
    sectionCount: requiredSections.length - missingSections.length,
    totalKeywords: requiredKeywords.length,
    totalSections: requiredSections.length,
  };
}

/**
 * Extract report using markers from text
 */
function extractReport(text: string, reportType: 'whitebox' | 'blackbox'): string | null {
  const markerStart = reportType === 'whitebox' 
    ? '===WHITEBOX_REPORT_START===' 
    : '===BLACKBOX_REPORT_START===';
  const markerEnd = reportType === 'whitebox' 
    ? '===WHITEBOX_REPORT_END===' 
    : '===BLACKBOX_REPORT_END===';
  
  const pattern = new RegExp(`${markerStart}(.*?)${markerEnd}`, 's');
  const match = text.match(pattern);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Fetch report from existing session
 * GET /api/assessments/[assessmentId]/report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const { assessmentId } = await params;
  
  // Get user session to extract email
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userEmail = session.user.email;
  
  if (!userEmail) {
    return new Response(JSON.stringify({ error: "User email not found in session" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract username from email
  const userId = userEmail.split('@')[0];
  
  // Get report type from query params (optional)
  const searchParams = request.nextUrl.searchParams;
  const reportType = (searchParams.get('type') as 'whitebox' | 'blackbox') || 'blackbox';
  
  try {
    // First, fetch the assessment to get the sessionId
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[Report API] ===== FETCHING REPORT FROM SESSION =====`);
    console.log(`[Report API] Assessment ID: ${assessmentId}`);
    console.log(`[Report API] User ID: ${userId}`);
    console.log(`[Report API] Report Type: ${reportType}`);
    
    // Get assessment from Convex to retrieve sessionId
    const assessment = await fetchQuery(api.assessments.get, { assessmentId });
    
    if (!assessment) {
      console.error(`[Report API] ❌ Assessment not found in database`);
      return new Response(
        JSON.stringify({ 
          error: "Assessment not found",
          assessmentId,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get sessionId from assessment or fallback to old format
    const sessionId = "sessionId" in assessment && assessment.sessionId 
      ? assessment.sessionId 
      : `assessment_${assessmentId}`; // Fallback for old assessments
    
    console.log(`[Report API] Session ID from database: ${sessionId}`);
    console.log(`${"=".repeat(80)}\n`);

    // Fetch session data
    const sessionUrl = `${API_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`;
    console.log(`[Report API] Fetching session from: ${sessionUrl}`);
    
    const sessionResponse = await fetch(sessionUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error(`[Report API] ❌ Failed to fetch session: ${sessionResponse.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch session: ${sessionResponse.statusText}`,
          details: errorText
        }),
        {
          status: sessionResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const sessionData = await sessionResponse.json();
    console.log(`[Report API] ✅ Session fetched successfully`);
    console.log(`[Report API] Events count: ${sessionData.events?.length || 0}`);
    console.log(`[Report API] State keys: ${Object.keys(sessionData.state || {}).join(', ')}`);

    // Collect ALL text parts from events
    let allText = "";
    
    console.log(`[Report API] Collecting text from events...`);
    
    for (const event of sessionData.events || []) {
      const content = event.content || {};
      const parts = content.parts || [];
      
      for (const part of parts) {
        if (part.text) {
          allText += part.text + "\n";
        }
      }
    }
    
    console.log(`[Report API] Total text collected: ${allText.length} characters`);

    // Try to extract report with markers from collected text
    const markerStart = `===${reportType.toUpperCase()}_REPORT_START===`;
    
    let report: string | null = null;
    
    if (allText.includes(markerStart)) {
      console.log(`[Report API] ✓ Found report markers in events!`);
      report = extractReport(allText, reportType);
      
      if (report) {
        console.log(`[Report API] ✅ Report extracted from events!`);
        console.log(`[Report API] Report length: ${report.length} characters`);
        console.log(`[Report API] Report lines: ${report.split('\n').length} lines`);
        
        // Validate the report
        const validation = validateReport(report, reportType);
        console.log(`[Report API] Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
        console.log(`[Report API] Keywords: ${validation.keywordCount}/${validation.totalKeywords}`);
        console.log(`[Report API] Sections: ${validation.sectionCount}/${validation.totalSections}`);
        
        if (validation.missingKeywords.length > 0) {
          console.warn(`[Report API] Missing keywords:`, validation.missingKeywords);
        }
        if (validation.missingSections.length > 0) {
          console.warn(`[Report API] Missing sections:`, validation.missingSections);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            report,
            source: 'events',
            sessionId,
            reportType,
            length: report.length,
            validation,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // If markers not found in events, check session state
    console.log(`[Report API] ⚠ Markers not found in events, checking session state...`);
    
    const state = sessionData.state || {};
    const stateKeys = [
      'static_analysis_result',
      'final_blackbox_report',
      'recon_report',
      'whitebox_report',
      'blackbox_report',
      `${reportType}_report`,
    ];

    for (const key of stateKeys) {
      if (key in state && state[key]) {
        console.log(`[Report API] Found state key: ${key}`);
        const stateText = state[key];
        
        // Try to extract with markers first
        report = extractReport(stateText, reportType);
        
        if (report) {
          console.log(`[Report API] ✅ Report extracted from state with markers!`);
          console.log(`[Report API] Report length: ${report.length} characters`);
          
          // Validate the report
          const validation = validateReport(report, reportType);
          console.log(`[Report API] Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
          console.log(`[Report API] Keywords: ${validation.keywordCount}/${validation.totalKeywords}`);
          console.log(`[Report API] Sections: ${validation.sectionCount}/${validation.totalSections}`);
          
          if (validation.missingKeywords.length > 0) {
            console.warn(`[Report API] Missing keywords:`, validation.missingKeywords);
          }
          if (validation.missingSections.length > 0) {
            console.warn(`[Report API] Missing sections:`, validation.missingSections);
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              report,
              source: `state.${key}`,
              sessionId,
              reportType,
              length: report.length,
              validation,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } else if (stateText) {
          // No markers, but we have text - validate and return raw report
          console.log(`[Report API] ⚠ Report found without markers`);
          console.log(`[Report API] Report length: ${stateText.length} characters`);
          
          // Still validate even without markers
          const validation = validateReport(stateText, reportType);
          console.log(`[Report API] Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
          
          return new Response(
            JSON.stringify({
              success: true,
              report: stateText,
              source: `state.${key}`,
              sessionId,
              reportType,
              length: stateText.length,
              hasMarkers: false,
              validation,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // No report found
    console.log(`[Report API] ❌ No report found in session`);
    console.log(`[Report API] Available state keys: ${Object.keys(state).join(', ') || 'none'}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Report not found in session',
        details: {
          sessionId,
          reportType,
          availableStateKeys: Object.keys(state),
          eventsCount: sessionData.events?.length || 0,
          suggestions: [
            'Report may not have been generated yet',
            'Try the opposite report type (whitebox/blackbox)',
            'Check if the scan completed successfully',
          ],
        },
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error(`\n${"=".repeat(80)}`);
    console.error(`[Report API] ❌ ERROR OCCURRED:`);
    console.error(`[Report API] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[Report API] Error message:`, error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(`[Report API] Stack trace:`, error.stack);
    }
    console.error(`${"=".repeat(80)}\n`);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

