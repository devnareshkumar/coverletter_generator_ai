
import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _theme = signal<Theme>('system');
  public readonly theme = this._theme.asReadonly();

  constructor() {
    this.loadTheme();
  }

  private loadTheme() {
    const theme = localStorage.getItem('theme') as Theme | null;
    if (theme) {
      this._theme.set(theme);
    }
    this.updateTheme();
  }

  public setTheme(theme: Theme) {
    this._theme.set(theme);
    localStorage.setItem('theme', theme);
    this.updateTheme();
  }

  private updateTheme() {
    const theme = this._theme();
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: 'light' | 'dark') {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }

  public startSystemThemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this._theme() === 'system') {
        this.updateTheme();
      }
    });
  }
}
