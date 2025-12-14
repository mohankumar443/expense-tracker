import { Component, OnInit } from '@angular/core';
import { ProfileService, Profile } from './services/profile.service';
import { ThemeService, ThemeMode } from './services/theme.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'Expense Tracker';
    isSidebarCollapsed = false;
    profiles: Array<{ id?: string; name: string; dob: string; age: number | null; retirementAge: number | null }> = [];
    activeProfile: { id?: string; name: string; dob: string; age: number | null; retirementAge: number | null } = {
        id: '',
        name: '',
        dob: '',
        age: null,
        retirementAge: null
    };
    showProfileMenu = false;

    ngOnInit() {
        this.loadProfiles();
    }

    modes: { value: ThemeMode, label: string, icon: string }[] = [
        { value: 'light', label: 'Light', icon: 'light_mode' },
        { value: 'dark', label: 'Dark', icon: 'dark_mode' },
        { value: 'system', label: 'System', icon: 'settings_brightness' },
        { value: 'custom', label: 'Custom', icon: 'palette' }
    ];
    currentTheme$ = this.themeService.currentMode$;
    private ACTIVE_PROFILE_KEY = 'activeProfileId';
    private PROFILE_CACHE_KEY = 'cachedProfile';

    constructor(private profileService: ProfileService, private themeService: ThemeService) { }

    onSidebarToggled(isCollapsed: boolean) {
        this.isSidebarCollapsed = isCollapsed;
    }

    onDobChange(value: string) {
        this.activeProfile.dob = value;
        this.activeProfile.age = this.calculateAge(value);
    }

    calculateAge(dob: string): number | null {
        if (!dob) return null;
        const birth = new Date(dob);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    loadProfiles() {
        this.profileService.getProfiles().subscribe({
            next: (profiles) => {
                this.profiles = profiles.map(p => ({
                    ...p,
                    age: this.calculateAge(p.dob)
                }));
                if (this.profiles.length > 0) {
                    const savedId = localStorage.getItem(this.ACTIVE_PROFILE_KEY);
                    const target = this.profiles.find(p => p.id === savedId) || this.profiles[0];
                    this.activeProfile = { ...target, age: this.calculateAge(target.dob) };
                } else {
                    this.loadCachedProfile();
                }
            },
            error: () => {
                this.profiles = [];
                this.loadCachedProfile();
            }
        });
    }

    saveActiveProfile() {
        const payload: Profile = {
            name: this.activeProfile.name,
            dob: this.activeProfile.dob,
            retirementAge: this.activeProfile.retirementAge
        };
        if (this.activeProfile.id) {
            this.profileService.updateProfile(this.activeProfile.id, payload).subscribe({
                next: (updated) => {
                    this.activeProfile = { ...updated, age: this.calculateAge(updated.dob) };
                    this.persistActiveProfileId(this.activeProfile.id || '');
                    this.cacheProfile(this.activeProfile);
                    this.loadProfiles();
                }
            });
        } else {
            this.profileService.createProfile(payload).subscribe({
                next: (created) => {
                    this.activeProfile = { ...created, age: this.calculateAge(created.dob) };
                    this.persistActiveProfileId(this.activeProfile.id || '');
                    this.cacheProfile(this.activeProfile);
                    this.loadProfiles();
                }
            });
        }
    }

    setActiveProfile(id: string) {
        const found = this.profiles.find(p => p.id === id);
        if (found) {
            this.activeProfile = { ...found };
            this.activeProfile.age = this.calculateAge(this.activeProfile.dob);
            this.persistActiveProfileId(id);
        }
    }

    addNewProfile() {
        this.activeProfile = {
            id: '',
            name: '',
            dob: '',
            age: null,
            retirementAge: null
        };
    }

    get projectionLabel(): string {
        const age = this.activeProfile.age;
        const retire = this.activeProfile.retirementAge;
        if (age != null && retire != null && retire > age) {
            const years = retire - age;
            return `Dynamically projecting ~${years}-year path to your retirement age (${retire}).`;
        }
        if (age != null && age < 50) {
            const years = 50 - age;
            return `Projecting ~${years}-year forward view based on your age (${age}).`;
        }
        return 'Long-horizon guidance tailored to your age and retirement goal.';
    }

    setTheme(mode: ThemeMode) {
        this.themeService.setMode(mode);
    }

    private persistActiveProfileId(id: string) {
        localStorage.setItem(this.ACTIVE_PROFILE_KEY, id);
    }

    private cacheProfile(profile: { id?: string; name: string; dob: string; age: number | null; retirementAge: number | null }) {
        localStorage.setItem(this.PROFILE_CACHE_KEY, JSON.stringify(profile));
    }

    private loadCachedProfile() {
        const cached = localStorage.getItem(this.PROFILE_CACHE_KEY);
        if (cached) {
            const profile = JSON.parse(cached);
            this.activeProfile = { ...profile, age: this.calculateAge(profile.dob) };
        } else {
            this.addNewProfile();
        }
    }
}
