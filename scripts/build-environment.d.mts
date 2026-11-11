export const PRODUCTION_API: string;
export const LEGACY_PRODUCTION_API: string;
export const STAGING_API: string;
export function validateBuildEnvironment(env: Record<string, string | undefined>): { target: string; api: string; mcp: string };
