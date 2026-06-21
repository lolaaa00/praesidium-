import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // GenLayer
  // No shared engine-wide signing key anymore — every agent has its own
  // GenLayer keypair (generated at registration, encrypted at rest with
  // AGENT_KEY_ENCRYPTION_SECRET below) and signs its own validate_action
  // calls. See apps/engine/src/lib/agent-key.ts.
  GENLAYER_CONTRACT_ADDRESS: z.string().default(''),
  GENLAYER_RPC_URL: z.string().url().default('https://studio.genlayer.com/api'),
  AGENT_KEY_ENCRYPTION_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
