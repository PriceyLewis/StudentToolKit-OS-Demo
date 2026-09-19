import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { APP_DATA_KEYS } from "./resetAppData";
import {
  applyRestoreTransaction,
  parseBackupPayload,
  type BackupPayload,
} from "./backupCore.js";

const BACKUP_VERSION = 1;
const BACKUP_APP_ID = "student-toolkit";
const BACKUP_FILE_PREFIX = "student-toolkit-backup";

type PickedBackupFile = {
  text: () => Promise<string>;
};

const getAllowedKeys = (): string[] => [...APP_DATA_KEYS];

const restoreStorage = {
  multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
    const entries = await AsyncStorage.multiGet(keys);
    return entries.map(([key, value]) => [key, value]);
  },
  multiRemove: async (keys: string[]) => {
    await AsyncStorage.multiRemove(keys);
  },
  multiSet: async (entries: [string, string][]) => {
    await AsyncStorage.multiSet(entries);
  },
};

const buildPayload = async (): Promise<BackupPayload> => {
  const keys = getAllowedKeys();
  const entries = await AsyncStorage.multiGet(keys);
  const data: Record<string, string | null> = {};

  entries.forEach(([key, value]) => {
    data[key] = value;
  });

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP_ID,
    data,
  };
};

export async function createLocalBackupFile() {
  const payload = await buildPayload();
  const timestamp = payload.exportedAt.replace(/[:.]/g, "-");
  const file = new File(Paths.cache, `${BACKUP_FILE_PREFIX}-${timestamp}.json`);

  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  return file;
}

export async function restoreBackupFromFile(file: PickedBackupFile) {
  const raw = await file.text();
  const allowedKeys = getAllowedKeys();
  const payload = parseBackupPayload(raw, {
    appId: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    allowedKeys,
  });

  const transaction = await applyRestoreTransaction(restoreStorage, allowedKeys, payload.data);

  return {
    ...transaction,
    backupVersion: payload.version,
    exportedAt: payload.exportedAt,
  };
}

export async function pickBackupFile() {
  const picked = await File.pickFileAsync(undefined, "application/json");
  return Array.isArray(picked) ? picked[0] : picked;
}
