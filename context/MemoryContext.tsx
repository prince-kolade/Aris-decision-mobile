import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Memory, MemoryCategory } from '@/types/index';
import {
  clearMemories,
  generateId,
  getMemories,
  saveMemories,
} from '@/services/storage';

interface MemoryContextValue {
  memories: Memory[];
  isLoading: boolean;
  addMemory: (category: MemoryCategory, title: string, description: string) => Promise<void>;
  editMemory: (id: string, updates: { category?: MemoryCategory; title?: string; description?: string }) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
}

const MemoryContext = createContext<MemoryContextValue | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const stored = await getMemories();
    setMemories(stored);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMemory = useCallback(
    async (category: MemoryCategory, title: string, description: string) => {
      const newMemory: Memory = {
        id: generateId('mem'),
        category,
        title,
        description,
        createdAt: Date.now(),
      };
      const updated = [newMemory, ...memories];
      setMemories(updated);
      await saveMemories(updated);
    },
    [memories],
  );

  const editMemory = useCallback(
    async (
      id: string,
      updates: { category?: MemoryCategory; title?: string; description?: string },
    ) => {
      const updated = memories.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      );
      setMemories(updated);
      await saveMemories(updated);
    },
    [memories],
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      const updated = memories.filter((m) => m.id !== id);
      setMemories(updated);
      await saveMemories(updated);
    },
    [memories],
  );

  const clearAll = useCallback(async () => {
    setMemories([]);
    await clearMemories();
  }, []);

  return (
    <MemoryContext.Provider
      value={{
        memories,
        isLoading,
        addMemory,
        editMemory,
        deleteMemory,
        clearAll,
        reload,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory(): MemoryContextValue {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be used within MemoryProvider');
  return ctx;
}
