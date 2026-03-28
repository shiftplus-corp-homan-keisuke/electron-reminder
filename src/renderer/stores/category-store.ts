import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Category } from '../types/reminder';
import { dexieStorage } from '../lib/dexie-storage';

interface CategoryState {
  categories: Category[];
  addCategory(data: Omit<Category, 'id' | 'createdAt'>): void;
  updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'createdAt'>>): void;
  deleteCategory(id: string): void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: [],

      addCategory(data) {
        const now = new Date().toISOString();
        set((state) => ({
          categories: [...state.categories, { ...data, id: uuidv4(), createdAt: now }],
        }));
      },

      updateCategory(id, data) {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      deleteCategory(id) {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },
    }),
    {
      name: 'category-storage',
      storage: dexieStorage,
    },
  ),
);
