import { useState, useEffect, useCallback } from 'react';
import {
  listPoliciesForGroup,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
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
