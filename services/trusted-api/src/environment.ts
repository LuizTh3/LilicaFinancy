export interface Env {
  EXPECTED_PROJECT_ID: string; GOOGLE_SERVICE_ACCOUNT_EMAIL: string; GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  FIREBASE_AUTH_API_KEY: string; ALLOWED_ORIGINS: string; APP_BASE_URL: string;
  TURNSTILE_HOSTNAME: string; TURNSTILE_SECRET_KEY: string; SUBMISSION_HMAC_SECRET: string; NETWORK_HASH_SECRET: string;
  BREVO_API_KEY: string; BREVO_SENDER_EMAIL: string; BREVO_SENDER_NAME: string;
}
export function requireEnv(env: Env, keys: (keyof Env)[]) {
  if (keys.some(key => !env[key]?.trim())) throw new Error('CONFIG_INCOMPLETE')
}
export const googleKeys: (keyof Env)[] = ['EXPECTED_PROJECT_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'FIREBASE_AUTH_API_KEY']
