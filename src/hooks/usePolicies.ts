import { useState, useEffect, useCallback } from 'react';
import {
  listPoliciesForGroup,
  listPoliciesForUser,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  createPolicyForUser,
  updatePolicyForUser,
} from '../services/policy-service';
import type { UXPolicy } from '../types/policy';

interface UsePoliciesResult {
  policies: UXPolicy[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePoliciesForGroup(groupName: string): UsePoliciesResult {
  const [policies, setPolicies] = useState<UXPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    if (!groupName) return;

    setLoading(true);
    setError(null);
    try {
      const result = await listPoliciesForGroup(groupName);
      setPolicies(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [groupName]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  return { policies, loading, error, refetch: loadPolicies };
}

export interface UserPolicyWithGroup extends UXPolicy {
  groupName: string;
}

interface UsePoliciesForUserResult {
  policies: UserPolicyWithGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePoliciesForUser(groupNames: string[]): UsePoliciesForUserResult {
  const [policies, setPolicies] = useState<UserPolicyWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    if (!groupNames || groupNames.length === 0) {
      setPolicies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const allPolicies: UserPolicyWithGroup[] = [];
      for (const groupName of groupNames) {
        const groupPolicies = await listPoliciesForGroup(groupName);
        for (const policy of groupPolicies) {
          allPolicies.push({ ...policy, groupName });
        }
      }
      setPolicies(allPolicies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [groupNames.join(',')]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  return { policies, loading, error, refetch: loadPolicies };
}

interface UsePolicyResult {
  policy: UXPolicy | null;
  loading: boolean;
  error: string | null;
}

export function usePolicy(policyId: string | undefined): UsePolicyResult {
  const [policy, setPolicy] = useState<UXPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!policyId) {
      setLoading(false);
      return;
    }

    const loadPolicy = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPolicy(policyId);
        setPolicy(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy');
      } finally {
        setLoading(false);
      }
    };

    loadPolicy();
  }, [policyId]);

  return { policy, loading, error };
}

interface UsePolicyMutationsResult {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  createPolicy: (policy: UXPolicy, groupName: string) => Promise<string>;
  updatePolicy: (policy: UXPolicy, groupName: string) => Promise<string>;
  deletePolicy: (policyId: string) => Promise<void>;
}

export function usePolicyMutations(): UsePolicyMutationsResult {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (policy: UXPolicy, groupName: string): Promise<string> => {
    setCreating(true);
    setError(null);
    try {
      const policyId = await createPolicy(policy, groupName);
      return policyId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create policy';
      setError(message);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (policy: UXPolicy, groupName: string): Promise<string> => {
    setUpdating(true);
    setError(null);
    try {
      const policyId = await updatePolicy(policy, groupName);
      return policyId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update policy';
      setError(message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (policyId: string): Promise<void> => {
    setDeleting(true);
    setError(null);
    try {
      await deletePolicy(policyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete policy';
      setError(message);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return {
    creating,
    updating,
    deleting,
    error,
    createPolicy: handleCreate,
    updatePolicy: handleUpdate,
    deletePolicy: handleDelete,
  };
}

// Hook to fetch policies directly assigned to a user (not via groups)
export function useDirectPoliciesForUser(userId: string | undefined): UsePoliciesResult {
  const [policies, setPolicies] = useState<UXPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    if (!userId) {
      setPolicies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await listPoliciesForUser(userId);
      setPolicies(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  return { policies, loading, error, refetch: loadPolicies };
}

interface UseUserPolicyMutationsResult {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  createPolicy: (policy: UXPolicy, userId: string) => Promise<string>;
  updatePolicy: (policy: UXPolicy, userId: string) => Promise<string>;
  deletePolicy: (policyId: string) => Promise<void>;
}

export function useUserPolicyMutations(): UseUserPolicyMutationsResult {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (policy: UXPolicy, userId: string): Promise<string> => {
    setCreating(true);
    setError(null);
    try {
      const policyId = await createPolicyForUser(policy, userId);
      return policyId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create policy';
      setError(message);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (policy: UXPolicy, userId: string): Promise<string> => {
    setUpdating(true);
    setError(null);
    try {
      const policyId = await updatePolicyForUser(policy, userId);
      return policyId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update policy';
      setError(message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (policyId: string): Promise<void> => {
    setDeleting(true);
    setError(null);
    try {
      await deletePolicy(policyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete policy';
      setError(message);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return {
    creating,
    updating,
    deleting,
    error,
    createPolicy: handleCreate,
    updatePolicy: handleUpdate,
    deletePolicy: handleDelete,
  };
}
