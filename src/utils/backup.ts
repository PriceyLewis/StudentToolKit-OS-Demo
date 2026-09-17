import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { APP_DATA_KEYS } from "./resetAppData";

const BACKUP_VERSION = 1;
const BACKUP_APP_ID = "student-toolkit";
const BACKUP_FILE_PREFIX = "student-toolkit-backup";

type PickedBackupFile = {
  text: () => Promise<string>;
};

type BackupPayload = {
  version: number;
  exportedAt: string;
  app: string;
  data: Record<string, string | null>;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getAllowedKeys = (): string[] => [...APP_DATA_KEYS];

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

function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!isObject(parsed)) {
    throw new Error("Invalid backup format.");
  }

  if (parsed.app !== BACKUP_APP_ID) {
    throw new Error("This backup was not created by Student Toolkit OS.");
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version. Expected version ${BACKUP_VERSION}.`,
    );
  }

  if (typeof parsed.exportedAt !== "string" || !parsed.exportedAt.trim()) {
    throw new Error("Backup metadata is incomplete.");
  }

  if (!isObject(parsed.data)) {
    throw new Error("Invalid backup data.");
  }

  const allowedSet = new Set<string>(getAllowedKeys());
  const normalizedData: Record<string, string | null> = {};

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (!allowedSet.has(key)) {
      return;
    }

    if (typeof value === "string" || value === null) {
      normalizedData[key] = value;
      return;
    }

    throw new Error(`Invalid value for backup key: ${key}`);
  });

  if (Object.keys(normalizedData).length === 0) {
    throw new Error("The backup does not contain any recognised app data.");
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: parsed.exportedAt,
    app: BACKUP_APP_ID,
    data: normalizedData,
  };
}

export async function restoreBackupFromFile(file: PickedBackupFile) {
  const raw = await file.text();
  const payload = parseBackupPayload(raw);
  const allowedKeys = getAllowedKeys();
  const allowedSet = new Set<string>(allowedKeys);

  const previousEntries = await AsyncStorage.multiGet(allowedKeys);
  const previousPairs = previousEntries.filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  const setPairs: [string, string][] = [];
  const removeKeys: string[] = [];

  Object.entries(payload.data).forEach(([key, value]) => {
    if (!allowedSet.has(key)) {
      return;
    }

    if (typeof value === "string") {
      setPairs.push([key, value]);
    } else {
      removeKeys.push(key);
    }
  });

  try {
    if (removeKeys.length > 0) {
      await AsyncStorage.multiRemove(removeKeys);
    }
    if (setPairs.length > 0) {
      await AsyncStorage.multiSet(setPairs);
    }
  } catch (error) {
    // Best-effort rollback so a failed restore does not silently wipe local data.
    await AsyncStorage.multiRemove(allowedKeys);
    if (previousPairs.length > 0) {
      await AsyncStorage.multiSet(previousPairs);
    }
    throw error;
  }

  return {
    restoredKeys: setPairs.length,
    clearedKeys: removeKeys.length,
    backupVersion: payload.version,
    exportedAt: payload.exportedAt,
  };
}

export async function pickBackupFile() {
  const picked = await File.pickFileAsync(undefined, "application/json");
  return Array.isArray(picked) ? picked[0] : picked;
}
