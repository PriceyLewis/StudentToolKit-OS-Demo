export type BackupPayload = {
  version: number;
  exportedAt: string;
  app: string;
  data: Record<string, string | null>;
};

export type RestoreStorage = {
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiRemove(keys: string[]): Promise<void>;
  multiSet(entries: [string, string][]): Promise<void>;
};

export function parseBackupPayload(
  raw: string,
  options?: {
    appId?: string;
    version?: number;
    allowedKeys?: string[];
  },
): BackupPayload;

export function applyRestoreTransaction(
  storage: RestoreStorage,
  allowedKeys: string[],
  data: Record<string, string | null>,
): Promise<{ restoredKeys: number; clearedKeys: number }>;
