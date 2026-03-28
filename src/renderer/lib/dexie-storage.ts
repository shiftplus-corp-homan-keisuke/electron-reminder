import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { db } from './db';

/**
 * Dexie IndexedDB をバックエンドとする Zustand StateStorage アダプタ
 * createJSONStorage でラップして PersistStorage として使用する
 */
const dexieStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const record = await db.settings.get(name);
      return record ? (record.value as string) : null;
    } catch (error) {
      console.error(`[dexieStorage] getItem failed for key "${name}":`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await db.settings.put({ key: name, value });
    } catch (error) {
      console.error(`[dexieStorage] setItem failed for key "${name}":`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await db.settings.delete(name);
    } catch (error) {
      console.error(`[dexieStorage] removeItem failed for key "${name}":`, error);
    }
  },
};

// createJSONStorage でラップ: StateStorage → PersistStorage<S>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dexieStorage = createJSONStorage<any>(() => dexieStateStorage)!
