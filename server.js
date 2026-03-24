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
  ListPolicyStoresCommand,
  ListTagsForResourceCommand,
} from '@aws-sdk/client-verifiedpermissions';
import {
  CognitoIdentityProviderClient,
  ListGroupsCommand,
  GetGroupCommand,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const app = express();
app.use(cors());
app.use(express.json());

const USER_POOL_ID = 'us-east-1_M49RbNHyh';
const REGION = 'us-east-1';

// Cache for policy store ID lookup (keyed by user pool ID)
let policyStoreIdCache = null;

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

// Find policy store ID by Cognito user pool ID (using CognitoUserPool tag or description)
async function getPolicyStoreIdByUserPool(userPoolId) {
  // Return cached value if available
  if (policyStoreIdCache) {
    return policyStoreIdCache;
  }

  console.log(`Looking for policy store with tag CognitoUserPool = ${userPoolId}`);

  // Collect all policy stores for potential description fallback
  const allPolicyStores = [];

  // Paginate through all policy stores - first try to match by tag
  let nextToken = undefined;

  do {
    const policyStoresResponse = await avpClient.send(new ListPolicyStoresCommand({ nextToken }));
    const policyStores = policyStoresResponse.policyStores || [];
    nextToken = policyStoresResponse.nextToken;

    for (const store of policyStores) {
      allPolicyStores.push(store);

      const tagsResponse = await avpClient.send(new ListTagsForResourceCommand({
        resourceArn: store.arn,
      }));

      const tags = tagsResponse.tags || {};
      if (tags.CognitoUserPool === userPoolId) {
        console.log(`Found policy store ${store.policyStoreId} with matching CognitoUserPool tag`);
        policyStoreIdCache = store.policyStoreId;
        return policyStoreIdCache;
      }
    }
  } while (nextToken);

  // Fallback: search descriptions for "Cognito User Pool: <userPoolId>"
  console.log(`No tagged policy store found, searching descriptions for "Cognito User Pool: ${userPoolId}"`);
  const descriptionPattern = `Cognito User Pool: ${userPoolId}`;

  for (const store of allPolicyStores) {
    if (store.description && store.description.includes(descriptionPattern)) {
      console.log(`Found policy store ${store.policyStoreId} with matching description`);
      policyStoreIdCache = store.policyStoreId;
      return policyStoreIdCache;
    }
  }

  throw new Error(`No policy store found with tag or description matching CognitoUserPool = ${userPoolId}`);
}

// Get schema
app.get('/api/schema', async (req, res) => {
  try {
    const policyStoreId = await getPolicyStoreIdByUserPool(USER_POOL_ID);

    console.log('\n========== GET SCHEMA REQUEST ==========');
    console.log('Policy Store ID:', policyStoreId);
    console.log('=========================================\n');

    const response = await avpClient.send(new GetSchemaCommand({
      policyStoreId,
    }));

    console.log('========== GET SCHEMA RESPONSE ==========');
    console.log('SUCCESS - Schema retrieved');
    console.log('==========================================\n');

    res.json({ schema: response.schema });
  } catch (error) {
    console.error('========== GET SCHEMA ERROR ==========');
    console.error('FAILED:', error.message);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('======================================\n');
    res.status(500).json({ error: error.message });
  }
});

// List policies
app.get('/api/policies', async (req, res) => {
  try {
    const { groupName, userId, namespace } = req.query;
    const policyStoreId = await getPolicyStoreIdByUserPool(USER_POOL_ID);

    console.log('\n========== LIST POLICIES REQUEST ==========');
    console.log('Policy Store ID:', policyStoreId);
    console.log('Group Name:', groupName || '(none)');
    console.log('User ID:', userId || '(none)');
    console.log('Namespace:', namespace || '(none)');
    console.log('============================================\n');

    let filter = undefined;
    if (namespace) {
      if (groupName) {
        filter = {
          principal: {
            identifier: {
              entityType: `${namespace}::CognitoGroup`,
              entityId: groupName,
            },
          },
        };
      } else if (userId) {
        filter = {
          principal: {
            identifier: {
              entityType: `${namespace}::User`,
              entityId: userId,
            },
          },
        };
      }
    }

    const response = await avpClient.send(new ListPoliciesCommand({
      policyStoreId,
      filter,
    }));

    console.log('========== LIST POLICIES RESPONSE ==========');
    console.log('SUCCESS - Found', (response.policies || []).length, 'policies');
    console.log('=============================================\n');

    res.json({ policies: response.policies || [] });
  } catch (error) {
    console.error('========== LIST POLICIES ERROR ==========');
    console.error('FAILED:', error.message);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('=========================================\n');
    res.status(500).json({ error: error.message });
  }
});

// Get single policy
app.get('/api/policies/:policyId', async (req, res) => {
  try {
    const policyStoreId = await getPolicyStoreIdByUserPool(USER_POOL_ID);

    console.log('\n========== GET POLICY REQUEST ==========');
    console.log('Policy Store ID:', policyStoreId);
    console.log('Policy ID:', req.params.policyId);
    console.log('=========================================\n');

    const response = await avpClient.send(new GetPolicyCommand({
      policyStoreId,
      policyId: req.params.policyId,
    }));

    console.log('========== GET POLICY RESPONSE ==========');
    console.log('SUCCESS - Policy ID:', response.policyId);
    console.log('=========================================\n');

    res.json(response);
  } catch (error) {
    console.error('========== GET POLICY ERROR ==========');
    console.error('FAILED:', error.message);
    console.error('Policy ID:', req.params.policyId);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('======================================\n');
    res.status(500).json({ error: error.message });
  }
});

// Create policy
app.post('/api/policies', async (req, res) => {
  try {
    const { statement, description } = req.body;
    const policyStoreId = await getPolicyStoreIdByUserPool(USER_POOL_ID);

    console.log('\n========== CREATE POLICY REQUEST ==========');
    console.log('Policy Store ID:', policyStoreId);
    console.log('Description:', description || '(none)');
    console.log('Cedar Statement:');
    console.log('--------------------------------------------');
    console.log(statement);
    console.log('--------------------------------------------');
    console.log('Statement length:', statement?.length || 0);
    console.log('Contains "resource":', statement?.includes('resource') || false);
    console.log('============================================\n');

    const response = await avpClient.send(new CreatePolicyCommand({
      policyStoreId,
      definition: {
        static: {
          statement,
          description,
        },
      },
    }));

    console.log('========== CREATE POLICY RESPONSE ==========');
    console.log('SUCCESS - Policy ID:', response.policyId);
    console.log('Principal:', JSON.stringify(response.principal));
    console.log('Resource:', JSON.stringify(response.resource));
    console.log('Actions:', JSON.stringify(response.actions));
    console.log('Created:', response.createdDate);
    console.log('=============================================\n');

    res.json({ policyId: response.policyId });
  } catch (error) {
    console.error('========== CREATE POLICY ERROR ==========');
    console.error('FAILED:', error.message);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('=========================================\n');
    res.status(500).json({ error: error.message });
  }
});

// Delete policy
app.delete('/api/policies/:policyId', async (req, res) => {
  try {
    const policyStoreId = await getPolicyStoreIdByUserPool(USER_POOL_ID);

    console.log('\n========== DELETE POLICY REQUEST ==========');
    console.log('Policy Store ID:', policyStoreId);
    console.log('Policy ID:', req.params.policyId);
    console.log('============================================\n');

    await avpClient.send(new DeletePolicyCommand({
      policyStoreId,
      policyId: req.params.policyId,
    }));

    console.log('========== DELETE POLICY RESPONSE ==========');
    console.log('SUCCESS - Policy deleted:', req.params.policyId);
    console.log('=============================================\n');

    res.json({ success: true });
  } catch (error) {
    console.error('========== DELETE POLICY ERROR ==========');
    console.error('FAILED:', error.message);
    console.error('Policy ID:', req.params.policyId);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
      console.error('Request ID:', error.$metadata.requestId);
    }
    console.error('=========================================\n');
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

// Get single Cognito group
app.get('/api/groups/:groupName', async (req, res) => {
  try {
    const { groupName } = req.params;

    const response = await cognitoClient.send(new GetGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: groupName,
    }));

    const group = response.Group;
    res.json({
      groupName: group.GroupName,
      description: group.Description || '',
      precedence: group.Precedence?.toString() || '-',
      createdTime: group.CreationDate?.toISOString() || '',
      lastModifiedTime: group.LastModifiedDate?.toISOString() || '',
    });
  } catch (error) {
    console.error('Error getting group:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List Cognito users
app.get('/api/users', async (req, res) => {
  try {
    const response = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
    }));

    const users = (response.Users || []).map(user => {
      const attrs = user.Attributes || [];
      const getAttr = (name) => attrs.find(a => a.Name === name)?.Value || '';

      return {
        username: user.Username,
        email: getAttr('email'),
        emailVerified: getAttr('email_verified') === 'true' ? 'Yes' : 'No',
        confirmationStatus: user.UserStatus === 'CONFIRMED' ? 'Confirmed' : user.UserStatus,
        status: user.Enabled ? 'Enabled' : 'Disabled',
        createdTime: user.UserCreateDate?.toISOString() || '',
        lastModifiedTime: user.UserLastModifiedDate?.toISOString() || '',
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single Cognito user
app.get('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const userResponse = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }));

    const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }));

    const attrs = userResponse.UserAttributes || [];
    const userAttributes = attrs.map(attr => ({
      attributeName: attr.Name,
      value: attr.Value || '',
      type: attr.Name === 'sub' ? 'Required' : 'Optional',
      verified: attr.Name === 'email' ? attrs.find(a => a.Name === 'email_verified')?.Value === 'true' : false,
    }));

    const groups = (groupsResponse.Groups || []).map(group => ({
      groupName: group.GroupName,
      description: group.Description || '-',
      groupCreatedTime: group.CreationDate?.toISOString() || '',
    }));

    const getAttr = (name) => attrs.find(a => a.Name === name)?.Value || '';

    res.json({
      username: userResponse.Username,
      userId: getAttr('sub'),
      email: getAttr('email'),
      emailVerified: getAttr('email_verified') === 'true',
      status: userResponse.Enabled ? 'Enabled' : 'Disabled',
      confirmationStatus: userResponse.UserStatus === 'CONFIRMED' ? 'Confirmed' : userResponse.UserStatus,
      mfaEnabled: userResponse.MFAOptions && userResponse.MFAOptions.length > 0,
      createdTime: userResponse.UserCreateDate?.toISOString() || '',
      lastModifiedTime: userResponse.UserLastModifiedDate?.toISOString() || '',
      userAttributes,
      groups,
    });
  } catch (error) {
    console.error('Error getting user:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`AVP proxy server running on http://localhost:${PORT}`);
});
