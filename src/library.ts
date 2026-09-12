/** 字本子 / recent / unlocked / favorites — localStorage twin of LibraryStore. */

import type { LibraryState } from "./types";

const STORAGE_KEY = "zi-library-v1";
const RECENT_LIMIT = 24;
const PRACTICED_LIMIT = 500;

type Listener = () => void;

export class LibraryStore {
  private state: LibraryState;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  get snapshot(): LibraryState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  markViewed(character: string): void {
    this.state = {
      ...this.state,
      recentCharacters: [
        character,
        ...this.state.recentCharacters.filter((item) => item !== character),
      ].slice(0, RECENT_LIMIT),
      unlockedCharacters: this.state.unlockedCharacters.includes(character)
        ? this.state.unlockedCharacters
        : [...this.state.unlockedCharacters, character],
    };
    this.save();
  }

  /** 练一练完整写对 → 全彩贴纸（字本子的成就层）。 */
  markPracticed(character: string): void {
    this.markViewed(character);
    this.state = {
      ...this.state,
      practicedCharacters: [
        character,
        ...this.state.practicedCharacters.filter((item) => item !== character),
      ].slice(0, PRACTICED_LIMIT),
    };
    this.save();
  }

  toggleFavorite(character: string): void {
    const isFavorite = this.state.favoriteCharacters.includes(character);
    this.state = {
      ...this.state,
      favoriteCharacters: isFavorite
        ? this.state.favoriteCharacters.filter((item) => item !== character)
        : [...this.state.favoriteCharacters, character],
    };
    this.save();
  }

  isFavorite(character: string): boolean {
    return this.state.favoriteCharacters.includes(character);
  }

  private load(): LibraryState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LibraryState>;
        return {
          recentCharacters: parsed.recentCharacters ?? [],
          unlockedCharacters: parsed.unlockedCharacters ?? [],
          favoriteCharacters: parsed.favoriteCharacters ?? [],
          practicedCharacters: parsed.practicedCharacters ?? [],
        };
      }
    } catch {
      // Corrupted state — start fresh.
    }
    return {
      recentCharacters: [],
      unlockedCharacters: [],
      favoriteCharacters: [],
      practicedCharacters: [],
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Private browsing — keep working in memory only.
    }
    for (const listener of this.listeners) {
      listener();
    }
  }
}
