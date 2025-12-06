/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as credits from "../credits.js";
import type * as findings from "../findings.js";
import type * as migrations from "../migrations.js";
import type * as onboarding from "../onboarding.js";
import type * as organizations from "../organizations.js";
import type * as projects from "../projects.js";
import type * as results from "../results.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assessments: typeof assessments;
  auth: typeof auth;
  credits: typeof credits;
  findings: typeof findings;
  migrations: typeof migrations;
  onboarding: typeof onboarding;
  organizations: typeof organizations;
  projects: typeof projects;
  results: typeof results;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
