import { load, type Store } from "@tauri-apps/plugin-store";

let _store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await load("preferences.json", { autoSave: true, defaults: {} });
  }
  return _store;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const store = await getStore();
    const value = await store.get<T>(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore();
    await store.set(key, value);
  } catch {
    // silently fail if store unavailable
  }
}
