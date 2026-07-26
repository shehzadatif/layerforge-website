export interface TurnstileServerEnvironment {
  publicSiteKey?: string;
  secretKey?: string;
  nodeEnvironment?: string;
}

function processEnvironmentValue(name: string): string | undefined {
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return runtimeProcess?.env?.[name];
}

export function getTurnstileServerEnvironment(): TurnstileServerEnvironment {
  return {
    publicSiteKey:
      import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ??
      processEnvironmentValue("PUBLIC_TURNSTILE_SITE_KEY"),
    secretKey:
      import.meta.env.TURNSTILE_SECRET_KEY ??
      processEnvironmentValue("TURNSTILE_SECRET_KEY"),
    nodeEnvironment:
      import.meta.env.NODE_ENV ?? processEnvironmentValue("NODE_ENV"),
  };
}
