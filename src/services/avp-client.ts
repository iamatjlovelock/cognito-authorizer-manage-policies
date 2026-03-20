import { VerifiedPermissionsClient } from '@aws-sdk/client-verifiedpermissions';

const POLICY_STORE_ID = 'BWRtaygo7MkaFaBz8BbHHz';
const REGION = 'us-east-1';

// Singleton client instance
let client: VerifiedPermissionsClient | null = null;

export function getAVPClient(): VerifiedPermissionsClient {
  if (!client) {
    client = new VerifiedPermissionsClient({ region: REGION });
  }
  return client;
}

export function getPolicyStoreId(): string {
  return POLICY_STORE_ID;
}
