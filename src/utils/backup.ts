import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { APP_DATA_KEYS } from "./resetAppData";

const BACKUP_VERSION = 1;
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
    app: "student-toolkit",
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
  const parsed = JSON.parse(raw) as unknown;

  if (!isObject(parsed)) {
    throw new Error("Invalid backup format.");
  }

  if (!isObject(parsed.data)) {
    throw new Error("Invalid backup data.");
  }

  const normalizedData: Record<string, string | null> = {};
  Object.entries(parsed.data).forEach(([key, value]) => {
    if (typeof value === "string" || value === null) {
      normalizedData[key] = value;
    }
  });

  return {
    version: typeof parsed.version === "number" ? parsed.version : BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    app: typeof parsed.app === "string" ? parsed.app : "unknown",
    data: normalizedData,
  };
}

export async function restoreBackupFromFile(file: PickedBackupFile) {
  const raw = await file.text();
  const payload = parseBackupPayload(raw);
  const allowedKeys = getAllowedKeys();
  const allowedSet = new Set<string>(allowedKeys);

  const setPairs: [string, string][] = [];
  Object.entries(payload.data).forEach(([key, value]) => {
    if (!allowedSet.has(key)) {
      return;
    }
    if (typeof value === "string") {
      setPairs.push([key, value]);
    }
  });

  await AsyncStorage.multiRemove(allowedKeys);
  if (setPairs.length > 0) {
    await AsyncStorage.multiSet(setPairs);
  }

  return {
    restoredKeys: setPairs.length,
    backupVersion: payload.version,
    exportedAt: payload.exportedAt,
  };
}

export async function pickBackupFile() {
  const picked = await File.pickFileAsync(undefined, "application/json");
  return Array.isArray(picked) ? picked[0] : picked;
}
