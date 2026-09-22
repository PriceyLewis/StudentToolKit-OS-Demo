import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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
  if (Platform.OS === "web") {
    const uri = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = uri;
    link.download = `${BACKUP_FILE_PREFIX}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(uri), 1000);
    return { uri };
  }
  const file = new File(Paths.cache, `${BACKUP_FILE_PREFIX}-${timestamp}.json`);

  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  return file;
}

export async function validateBackupFile(file: PickedBackupFile) {
  const raw = await file.text();
  const allowedKeys = getAllowedKeys();
  return parseBackupPayload(raw, {
    appId: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    allowedKeys,
  });
}

export async function restoreBackupFromFile(file: PickedBackupFile) {
  const payload = await validateBackupFile(file);
  const allowedKeys = getAllowedKeys();
  const transaction = await applyRestoreTransaction(restoreStorage, allowedKeys, payload.data);

  return {
    ...transaction,
    backupVersion: payload.version,
    exportedAt: payload.exportedAt,
  };
}

export async function pickBackupFile() {
  if (Platform.OS === "web") {
    return new Promise<PickedBackupFile>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        input.remove();
        if (file) resolve(file);
        else reject(new Error("File selection cancelled"));
      }, { once: true });
      input.addEventListener("cancel", () => {
        input.remove();
        reject(new Error("File selection cancelled"));
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }
  const picked = await File.pickFileAsync(undefined, "application/json");
  return Array.isArray(picked) ? picked[0] : picked;
}
