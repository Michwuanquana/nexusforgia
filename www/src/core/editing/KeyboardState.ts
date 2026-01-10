export class KeyboardState {
  private keysDown: Set<string> = new Set();
  private shiftDown: boolean = false;
  private ctrlDown: boolean = false;
  private altDown: boolean = false;

  constructor() {
    // Bind to window events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keysDown.add(event.key.toLowerCase());
    this.shiftDown = event.shiftKey;
    this.ctrlDown = event.ctrlKey || event.metaKey;
    this.altDown = event.altKey;
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.key.toLowerCase());
    this.shiftDown = event.shiftKey;
    this.ctrlDown = event.ctrlKey || event.metaKey;
    this.altDown = event.altKey;
  };

  private handleBlur = (): void => {
    // Clear all keys when window loses focus
    this.keysDown.clear();
    this.shiftDown = false;
    this.ctrlDown = false;
    this.altDown = false;
  };

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key.toLowerCase());
  }

  isShiftDown(): boolean {
    return this.shiftDown;
  }

  isCtrlDown(): boolean {
    return this.ctrlDown;
  }

  isAltDown(): boolean {
    return this.altDown;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
