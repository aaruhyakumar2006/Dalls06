/**
 * Offline-first utilities for Daily Planner PWA
 * Handles mutation tracking, batch uploads, conflict resolution, and retry logic
 */

export type MutationType = 'create' | 'update' | 'delete';
export type EntityType = 'task' | 'block' | 'review' | 'checklist' | 'daylog' | 'template' | 'focussession' | 'dsatopic' | 'aptitude' | 'sport' | 'startup' | 'weeklyreview';
export type MutationStatus = 'pending' | 'retrying' | 'failed';

export interface PendingMutation {
  id: string;
  type: MutationType;
  entity: EntityType;
  entityId: string;
  payload: any;
  timestamp: number;
  status: MutationStatus;
  retryCount?: number;
  errorMessage?: string;
}

const PENDING_MUTATIONS_KEY = 'pending_mutations';

/**
 * Load pending mutations from localStorage
 */
export function loadPendingMutations(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load pending mutations:', e);
    return [];
  }
}

/**
 * Save pending mutations to localStorage
 */
export function savePendingMutations(mutations: PendingMutation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(mutations));
  } catch (e) {
    console.error('Failed to save pending mutations:', e);
  }
}

/**
 * Add a new pending mutation
 */
export function addPendingMutation(
  mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'status'>
): PendingMutation {
  const newMutation: PendingMutation = {
    ...mutation,
    id: generateMutationId(mutation.type, mutation.entity, mutation.entityId),
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  const mutations = loadPendingMutations();
  const existingIndex = mutations.findIndex(
    (m) => m.type === mutation.type && m.entity === mutation.entity && m.entityId === mutation.entityId
  );

  if (existingIndex >= 0) {
    mutations[existingIndex] = newMutation;
  } else {
    mutations.push(newMutation);
  }

  savePendingMutations(mutations);
  return newMutation;
}

/**
 * Generate consistent mutation ID based on type, entity, and entityId
 */
export function generateMutationId(type: MutationType, entity: EntityType, entityId: string): string {
  return `${type}_${entity}_${entityId}`;
}

/**
 * Batch upload mutations to Supabase with conflict resolution
 * Returns { succeeded: string[], failed: string[] } where values are mutation IDs
 */
export async function batchUploadMutations(
  mutations: PendingMutation[],
  supabase: any
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  if (!supabase || mutations.length === 0) {
    return { succeeded, failed };
  }

  // Group mutations by entity type
  const grouped = mutations.reduce((acc, mut) => {
    if (!acc[mut.entity]) {
      acc[mut.entity] = [];
    }
    acc[mut.entity].push(mut);
    return acc;
  }, {} as Record<EntityType, PendingMutation[]>);

  // Process each entity type
  for (const [entity, muts] of Object.entries(grouped)) {
    const tableName = getTableName(entity as EntityType);

    for (const mutation of muts) {
      try {
        // Check for conflicts: if server has more recent version, skip
        if (mutation.type !== 'delete') {
          const existing = await supabase
            .from(tableName)
            .select('updated_at')
            .eq('id', mutation.entityId)
            .single()
            .then((res: any) => res.data)
            .catch(() => null);

          if (existing?.updated_at) {
            const serverTimestamp = new Date(existing.updated_at).getTime();
            // If server is >1 hour newer, consider it a conflict and discard local change
            if (serverTimestamp > mutation.timestamp + 3600000) {
              succeeded.push(mutation.id);
              continue;
            }
          }
        }

        // Execute mutation
        if (mutation.type === 'create' || mutation.type === 'update') {
          await supabase.from(tableName).upsert(mutation.payload, {
            onConflict: 'id',
          });
          succeeded.push(mutation.id);
        } else if (mutation.type === 'delete') {
          await supabase.from(tableName).delete().eq('id', mutation.entityId);
          succeeded.push(mutation.id);
        }
      } catch (error: any) {
        console.error(`Failed to sync ${entity}:`, error);
        failed.push(mutation.id);
      }
    }
  }

  return { succeeded, failed };
}

/**
 * Get retry delay in milliseconds based on retry count
 * Exponential backoff: 30s, 60s, 120s for retries 0, 1, 2+
 */
export function getRetryDelay(retryCount: number): number {
  if (retryCount === 0) return 30000;
  if (retryCount === 1) return 60000;
  return 120000;
}

/**
 * Map entity type to Supabase table name
 */
function getTableName(entity: EntityType): string {
  const tableMap: Record<EntityType, string> = {
    task: 'tasks',
    block: 'block_completions',
    review: 'review_items',
    checklist: 'checklist_items',
    daylog: 'day_logs',
    template: 'block_templates',
    focussession: 'focus_sessions',
    dsatopic: 'dsa_topics',
    aptitude: 'aptitude_logs',
    sport: 'sport_logs',
    startup: 'startups',
    weeklyreview: 'weekly_reviews',
  };
  return tableMap[entity] || entity + 's';
}

/**
 * Apply conflict resolution between client and server timestamps
 * Returns true if client mutation should be applied
 */
export function applyConflictResolution(clientTimestamp: number, serverTimestamp: number): boolean {
  // Last-write-wins with >1 hour threshold
  // If server is more recent AND > 1 hour older than client, discard client
  const timeDiff = serverTimestamp - clientTimestamp;
  return timeDiff <= 3600000; // Apply if server is not >1 hour newer
}
