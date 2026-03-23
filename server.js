import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  VerifiedPermissionsClient,
  GetSchemaCommand,
  ListPoliciesCommand,
  GetPolicyCommand,
  CreatePolicyCommand,
  DeletePolicyCommand,
} from '@aws-sdk/client-verifiedpermissions';
import {
  CognitoIdentityProviderClient,
  ListGroupsCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const app = express();
app.use(cors());
app.use(express.json());

const POLICY_STORE_ID = 'BWRtaygo7MkaFaBz8BbHHz';
const USER_POOL_ID = 'us-east-1_M49RbNHyh';
const REGION = 'us-east-1';

// Parse credentials from ~/.aws/credentials (handles non-standard format)
function loadCredentials() {
  const credentialsPath = path.join(os.homedir(), '.aws', 'credentials');

  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    const credentials = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim().replace(/\r/g, '');

      // Handle both KEY=value and key = value formats
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim().toLowerCase();
      const value = trimmed.substring(eqIndex + 1).trim();

      if (key === 'aws_access_key_id') {
        credentials.accessKeyId = value;
      } else if (key === 'aws_secret_access_key') {
        credentials.secretAccessKey = value;
      } else if (key === 'aws_session_token') {
        credentials.sessionToken = value;
      }
    }

    if (credentials.accessKeyId && credentials.secretAccessKey) {
      console.log('Loaded credentials from ~/.aws/credentials');
      console.log('Access Key ID:', credentials.accessKeyId.substring(0, 8) + '...');
      console.log('Has session token:', !!credentials.sessionToken);
      return credentials;
    }
  } catch (err) {
    console.log('Could not read ~/.aws/credentials:', err.message);
  }

  // Fall back to environment variables
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('Using credentials from environment variables');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }

  return null;
}

const credentials = loadCredentials();

if (!credentials) {
  console.error('ERROR: No AWS credentials found!');
  console.error('Please set credentials in ~/.aws/credentials or environment variables.');
  process.exit(1);
}

const avpClient = new VerifiedPermissionsClient({
  region: REGION,
  credentials: {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  },
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  },
});

// Get schema
app.get('/api/schema', async (req, res) => {
  try {
    const response = await avpClient.send(new GetSchemaCommand({
      policyStoreId: POLICY_STORE_ID,
    }));
    res.json({ schema: response.schema });
  } catch (error) {
    console.error('Error fetching schema:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List policies
app.get('/api/policies', async (req, res) => {
  try {
    const { groupName, namespace } = req.query;

    const response = await avpClient.send(new ListPoliciesCommand({
      policyStoreId: POLICY_STORE_ID,
      filter: groupName && namespace ? {
        principal: {
          identifier: {
            entityType: `${namespace}::CognitoGroup`,
            entityId: groupName,
          },
        },
      } : undefined,
    }));

    res.json({ policies: response.policies || [] });
  } catch (error) {
    console.error('Error listing policies:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single policy
app.get('/api/policies/:policyId', async (req, res) => {
  try {
    const response = await avpClient.send(new GetPolicyCommand({
      policyStoreId: POLICY_STORE_ID,
      policyId: req.params.policyId,
    }));
    res.json(response);
  } catch (error) {
    console.error('Error getting policy:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create policy
app.post('/api/policies', async (req, res) => {
  try {
    const { statement, description } = req.body;

    const response = await avpClient.send(new CreatePolicyCommand({
      policyStoreId: POLICY_STORE_ID,
      definition: {
        static: {
          statement,
          description,
        },
      },
    }));

    res.json({ policyId: response.policyId });
  } catch (error) {
    console.error('Error creating policy:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete policy
app.delete('/api/policies/:policyId', async (req, res) => {
  try {
    await avpClient.send(new DeletePolicyCommand({
      policyStoreId: POLICY_STORE_ID,
      policyId: req.params.policyId,
    }));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting policy:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List Cognito groups
app.get('/api/groups', async (req, res) => {
  try {
    const response = await cognitoClient.send(new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
    }));

    const groups = (response.Groups || []).map(group => ({
      groupName: group.GroupName,
      description: group.Description || '',
      precedence: group.Precedence?.toString() || '-',
      createdTime: group.CreationDate?.toISOString() || '',
      lastModifiedTime: group.LastModifiedDate?.toISOString() || '',
    }));

    res.json({ groups });
  } catch (error) {
    console.error('Error listing groups:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`AVP proxy server running on http://localhost:${PORT}`);
});
