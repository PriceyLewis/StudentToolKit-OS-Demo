import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignored on purpose to keep app stable on storage failures
  }
}

export async function removeKey(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignored
  }
}

export async function removeKeys(keys: string[]) {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // ignored
  }
}
