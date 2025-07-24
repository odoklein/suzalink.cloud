import { create } from 'zustand';

export type ProspectActionType = 'edit' | 'delete' | 'bulkEdit';

export interface ProspectAction {
  type: ProspectActionType;
  targetId: string;
  prevData: any; // JSON of old data
  nextData: any; // JSON of new data
  actionId?: string; // Backend log id for undo
}

export interface ProspectHistoryState {
  past: ProspectAction[];
  future: ProspectAction[];
  addAction: (action: ProspectAction) => void;
  undo: () => void;
  redo: () => void;
}

export const useProspectHistoryStore = create<ProspectHistoryState>((set, get) => ({
  past: [],
  future: [],

  addAction: (action: ProspectAction) => {
    set((state: ProspectHistoryState) => ({
      ...state,
      past: [...state.past, action],
      future: [],
    }));
    console.log('[ProspectHistory] Action added:', action);
  },

  undo: () => {
    const { past, future } = get();
    if (!Array.isArray(past) || past.length === 0) {
      console.error('[ProspectHistory] Undo failed: no actions in history.');
      return;
    }
    const lastAction = past[past.length - 1];
    if (!lastAction || !lastAction.targetId) {
      console.error('[ProspectHistory] Undo failed: invalid last action:', lastAction);
      return;
    }
    set((state: ProspectHistoryState) => ({
      ...state,
      past: past.slice(0, -1),
      future: [lastAction, ...future],
    }));
    // Log reverse operation
    console.log('[ProspectHistory] Undo:', {
      type: lastAction.type,
      targetId: lastAction.targetId,
      undoData: lastAction.prevData,
      redoData: lastAction.nextData,
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const nextAction = future[0];
    set((state: ProspectHistoryState) => ({
      ...state,
      past: [...past, nextAction],
      future: future.slice(1),
    }));
    // Log re-application
    console.log('[ProspectHistory] Redo:', {
      type: nextAction.type,
      targetId: nextAction.targetId,
      redoData: nextAction.nextData,
      undoData: nextAction.prevData,
    });
  },
}));
