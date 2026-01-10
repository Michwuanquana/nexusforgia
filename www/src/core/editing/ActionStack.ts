import type { Action } from './interfaces';
import { useMapStore } from '../../store/mapStore';

export class ActionStack {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxSize: number = 100;
  private listeners: Set<() => void> = new Set();

  execute(action: Action): void {
    // Try to merge with the last action if possible
    const lastAction = this.undoStack[this.undoStack.length - 1];
    if (lastAction && lastAction.canMerge?.(action)) {
      lastAction.merge?.(action);
      this.markDirty();
      this.notify();
      return;
    }

    // Execute the action
    action.execute();

    // Add to undo stack
    this.undoStack.push(action);

    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    // Clear redo stack
    this.redoStack = [];

    this.markDirty();
    this.notify();
  }

  undo(): void {
    const action = this.undoStack.pop();
    if (!action) return;

    action.undo();
    this.redoStack.push(action);

    this.markDirty();
    this.notify();
  }

  redo(): void {
    const action = this.redoStack.pop();
    if (!action) return;

    action.execute();
    this.undoStack.push(action);

    this.markDirty();
    this.notify();
  }

  private markDirty(): void {
    useMapStore.getState().markDirty();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
