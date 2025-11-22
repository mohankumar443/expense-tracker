import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private currentMode = new BehaviorSubject<ThemeMode>('system');
    currentMode$ = this.currentMode.asObservable();

    private customColor = new BehaviorSubject<string>('#4f46e5'); // Default Indigo
    customColor$ = this.customColor.asObservable();

    constructor() {
        this.initTheme();
    }

    setMode(mode: ThemeMode) {
        this.currentMode.next(mode);
        this.applyTheme(mode);
        localStorage.setItem('themeMode', mode);
    }

    setCustomColor(color: string) {
        console.log('ThemeService: Setting custom color:', color);
        this.customColor.next(color);
        localStorage.setItem('customColor', color);
        // Force update if we are in custom mode
        if (this.currentMode.value === 'custom') {
            this.applyTheme('custom');
        }
    }

    // ... (initTheme and applyTheme remain similar, maybe add log in applyTheme if needed)

    private initTheme() {
        const savedMode = localStorage.getItem('themeMode') as ThemeMode || 'system';
        const savedColor = localStorage.getItem('customColor') || '#4f46e5';

        this.customColor.next(savedColor);
        this.setMode(savedMode);

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.currentMode.value === 'system') {
                this.applyTheme('system');
            }
        });
    }

    private applyTheme(mode: ThemeMode) {
        const root = document.documentElement;
        const body = document.body;
        const isDark = mode === 'dark' ||
            (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        console.log(`Applying theme: ${mode}, isDark: ${isDark}`);

        if (isDark) {
            root.classList.add('dark');
            body.classList.add('dark'); // Add to body as well just in case
        } else {
            root.classList.remove('dark');
            body.classList.remove('dark');
        }

        if (mode === 'custom') {
            this.updateCustomProperties(this.customColor.value);
        } else {
            this.updateCustomProperties('#4f46e5');
        }
    }

    private updateCustomProperties(color: string) {
        const rgb = this.hexToRgb(color);
        console.log('ThemeService: Updating custom properties. Color:', color, 'RGB:', rgb);
        if (rgb) {
            document.documentElement.style.setProperty('--color-primary', rgb);
            document.documentElement.style.setProperty('--color-primary-hover', rgb);
        }
    }

    private hexToRgb(hex: string): string | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
    }
}
