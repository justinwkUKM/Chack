// lib/security.ts
// Security utilities for input validation, sanitization, and authorization

import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

/**
 * Sanitize JSON string to prevent XSS in dangerouslySetInnerHTML
 * Escapes HTML entities in JSON string
 */
export function sanitizeJSONForHTML(json: unknown): string {
  const jsonString = JSON.stringify(json);
  // Escape HTML entities
  return jsonString
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validate URL to prevent malicious inputs
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    // Basic validation - no javascript: or data: protocols
    if (url.toLowerCase().includes("javascript:") || url.toLowerCase().includes("data:")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate GitHub repository URL
 */
export function validateGitHubURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must be github.com
    if (!parsed.hostname.includes("github.com")) {
      return false;
    }
    // Must have owner and repo in path
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate GitHub installation ID (must be numeric string)
 */
export function validateGitHubInstallationId(installationId: string | undefined): boolean {
  if (!installationId) {
    return false;
  }
  // Must be numeric string
  return /^\d+$/.test(installationId);
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") {
    return "";
  }
  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized;
}

/**
 * Verify user has access to an assessment via their organization
 * Uses Promise.race with timeout to prevent hanging requests
 */
export async function verifyAssessmentAccess(
  assessmentId: string,
  userId: string
): Promise<boolean> {
  try {
    // Add timeout to prevent hanging requests (5 seconds)
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("Authorization check timeout")), 5000);
    });

    const checkPromise = (async () => {
      // Get assessment first to check if user created it (fallback check)
      const assessment = await fetchQuery(api.assessments.get, { assessmentId });

      if (!assessment) {
        console.warn(`[Security] Assessment not found: ${assessmentId}`);
        return false;
      }

      // Check if user created the assessment (direct ownership check)
      const createdByUserId = "createdByUserId" in assessment ? (assessment.createdByUserId as string) : "";
      if (createdByUserId === userId) {
        // User created the assessment, grant access
        if (process.env.NODE_ENV === "development") {
          console.log(`[Security] ✅ Access granted: user ${userId} created assessment ${assessmentId}`);
        }
        return true;
      }

      // Get user's membership for org-based access check
      const membership = await fetchQuery(api.organizations.getMembershipByUser, {
        userId,
      });

      if (!membership) {
        console.warn(`[Security] No membership found for user: ${userId}`);
        return false;
      }

      // Get project to check org access
      const projectId = "projectId" in assessment ? (assessment.projectId as string) : "";
      if (!projectId) {
        console.warn(`[Security] No projectId in assessment: ${assessmentId}`);
        return false;
      }

      const project = await fetchQuery(api.projects.get, { projectId: projectId });

      if (!project || !("orgId" in project)) {
        console.warn(`[Security] Project not found or no orgId: ${projectId}`);
        return false;
      }

      // Verify project belongs to user's organization
      const hasAccess = project.orgId === membership.orgId;
      
      if (hasAccess) {
        // Only log success in development to reduce noise
        if (process.env.NODE_ENV === "development") {
          console.log(`[Security] ✅ Access granted for user ${userId} to assessment ${assessmentId} (org match)`);
        }
      } else {
        // Log access denial (important for security)
        console.warn(`[Security] ❌ Access denied: user ${userId} (org: ${membership.orgId}) cannot access assessment ${assessmentId} (project org: ${project.orgId})`);
      }
      
      return hasAccess;
    })();

    // Race between the check and timeout
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    // Log error details for debugging (but don't expose sensitive info)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Security] Authorization check failed for assessment ${assessmentId}:`, errorMessage);
    return false;
  }
}

/**
 * Rate limiting helper - simple in-memory store (use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Create new window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

