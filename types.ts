export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Global window declaration for aistudio

// FIX: Moved AIStudio interface out of `declare global` to the module scope.
// This resolves declaration conflicts for `window.aistudio` by using a module-local type
// for the global augmentation, preventing clashes with other global types.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
    webkitAudioContext: typeof AudioContext;
  }
}
