import { Component } from '@angular/core';
import { ThemeService, ThemeMode } from '../../services/theme.service';

@Component({
    selector: 'app-theme-switcher',
    templateUrl: './theme-switcher.component.html',
    styleUrls: ['./theme-switcher.component.css']
})
export class ThemeSwitcherComponent {
    currentMode$ = this.themeService.currentMode$;
    customColor$ = this.themeService.customColor$;
    showThemeMenu = false;

    modes: { value: ThemeMode, label: string, icon: string }[] = [
        { value: 'light', label: 'Light', icon: 'light_mode' },
        { value: 'dark', label: 'Dark', icon: 'dark_mode' },
        { value: 'system', label: 'System', icon: 'settings_brightness' },
        { value: 'custom', label: 'Custom', icon: 'palette' }
    ];

    constructor(private themeService: ThemeService) { }

    setMode(mode: ThemeMode) {
        this.themeService.setMode(mode);
    }

    updateColor(event: Event) {
        const color = (event.target as HTMLInputElement).value;
        console.log('ThemeSwitcher: Color picked:', color);
        this.themeService.setCustomColor(color);
    }
}
