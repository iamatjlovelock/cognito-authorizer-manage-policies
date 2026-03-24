import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api-client';

export interface GroupDetails {
  groupName: string;
  description: string;
  precedence: string;
  createdTime: string;
  lastModifiedTime: string;
}

interface UseGroupDetailsResult {
  group: GroupDetails | null;
  loading: boolean;
  error: string | null;
}

export function useGroupDetails(groupName: string | undefined): UseGroupDetailsResult {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupName) {
      setLoading(false);
      return;
    }

    const loadGroup = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchApi<GroupDetails>(`/groups/${encodeURIComponent(groupName)}`);
        setGroup(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupName]);

  return { group, loading, error };
}
