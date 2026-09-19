function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStoredValue(key, value) {
  if (value === null) return;

  if (typeof value !== "string") {
    throw new Error(`Invalid value for backup key: ${key}`);
  }

  if (value.length > 2_000_000) {
    throw new Error(`Backup value is unexpectedly large: ${key}`);
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
    } catch {
      throw new Error(`Stored JSON is malformed for backup key: ${key}`);
    }
  }
}

function parseBackupPayload(
  raw,
  {
    appId = "student-toolkit",
    version = 1,
    allowedKeys = [],
  } = {},
) {
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!isObject(parsed)) {
    throw new Error("Invalid backup format.");
  }

  if (parsed.app !== appId) {
    throw new Error("This backup was not created by Student Toolkit OS.");
  }

  if (parsed.version !== version) {
    throw new Error(`Unsupported backup version. Expected version ${version}.`);
  }

  if (typeof parsed.exportedAt !== "string" || !parsed.exportedAt.trim()) {
    throw new Error("Backup metadata is incomplete.");
  }

  if (!isObject(parsed.data)) {
    throw new Error("Invalid backup data.");
  }

  const allowedSet = new Set(allowedKeys);
  const normalizedData = {};

  Object.entries(parsed.data).forEach(([key, value]) => {
    if (!allowedSet.has(key)) {
      return;
    }

    validateStoredValue(key, value);
    normalizedData[key] = value;
  });

  if (Object.keys(normalizedData).length === 0) {
    throw new Error("The backup does not contain any recognised app data.");
  }

  return {
    version,
    exportedAt: parsed.exportedAt,
    app: appId,
    data: normalizedData,
  };
}

export async function applyRestoreTransaction(storage, allowedKeys, data) {
  const allowedSet = new Set(allowedKeys);
  const previousEntries = await storage.multiGet(allowedKeys);
  const previousPairs = previousEntries.filter((entry) => typeof entry[1] === "string");

  const setPairs = [];
  const removeKeys = [];

  Object.entries(data).forEach(([key, value]) => {
    if (!allowedSet.has(key)) return;

    if (typeof value === "string") {
      setPairs.push([key, value]);
    } else if (value === null) {
      removeKeys.push(key);
    } else {
      throw new Error(`Invalid value for backup key: ${key}`);
    }
  });

  try {
    if (removeKeys.length > 0) {
      await storage.multiRemove(removeKeys);
    }
    if (setPairs.length > 0) {
      await storage.multiSet(setPairs);
    }
  } catch (error) {
    await storage.multiRemove(allowedKeys);
    if (previousPairs.length > 0) {
      await storage.multiSet(previousPairs);
    }
    throw error;
  }

  return {
    restoredKeys: setPairs.length,
    clearedKeys: removeKeys.length,
  };
}

module.exports = { parseBackupPayload, applyRestoreTransaction };
