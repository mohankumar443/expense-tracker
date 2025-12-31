import { Component, OnInit } from '@angular/core';
import { ProfileService, Profile } from './services/profile.service';
import { ThemeService, ThemeMode } from './services/theme.service';
import { DebtAccountService, DebtSummary } from './services/debt-account.service';
import { RetirementService } from './services/retirement.service';
import { ExpenseService } from './services/expense.service';
import { SnapshotStateService } from './services/snapshot-state.service';
import { Expense } from './models/expense.model';

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
    showQuickAddMenu = false;
    kpiLoading = true;
    kpiSnapshotDate: string | null = null;
    kpiTotalDebt = 0;
    kpiRetirementAssets = 0;
    kpiNetWorth = 0;
    kpiSavingsRate: number | null = null;
    kpiMonthlyBudget = 0;
    kpiMonthlySpend = 0;
    private kpiExpenses: Expense[] = [];
    private kpiDebtLoaded = false;
    private kpiRetirementLoaded = false;
    private kpiExpensesLoaded = false;

    ngOnInit() {
        this.loadProfiles();
        this.setupKpis();
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

    constructor(
        private profileService: ProfileService,
        private themeService: ThemeService,
        private debtService: DebtAccountService,
        private retirementService: RetirementService,
        private expenseService: ExpenseService,
        private snapshotStateService: SnapshotStateService
    ) { }

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
                    this.showProfileMenu = false;
                }
            });
        } else {
            this.profileService.createProfile(payload).subscribe({
                next: (created) => {
                    this.activeProfile = { ...created, age: this.calculateAge(created.dob) };
                    this.persistActiveProfileId(this.activeProfile.id || '');
                    this.cacheProfile(this.activeProfile);
                    this.loadProfiles();
                    this.showProfileMenu = false;
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

    toggleQuickAddMenu() {
        this.showQuickAddMenu = !this.showQuickAddMenu;
    }

    quickAddScroll(target: 'accounts' | 'budget' | 'retirement') {
        this.showQuickAddMenu = false;
        const el = document.getElementById(target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

    private setupKpis() {
        this.snapshotStateService.currentSnapshot$.subscribe(date => {
            if (date) {
                this.kpiSnapshotDate = date;
                this.loadDebtSummary(date);
                this.recomputeSavingsRate();
            } else {
                this.loadLatestSnapshotDate();
            }
        });

        this.retirementService.getLatestSnapshot().subscribe({
            next: (snapshot) => {
                this.kpiRetirementAssets = snapshot?.totalBalance || 0;
                this.kpiRetirementLoaded = true;
                this.recomputeNetWorth();
                this.updateKpiLoading();
            },
            error: () => {
                this.kpiRetirementAssets = 0;
                this.kpiRetirementLoaded = true;
                this.recomputeNetWorth();
                this.updateKpiLoading();
            }
        });

        this.expenseService.getAllExpenses().subscribe({
            next: (expenses) => {
                this.kpiExpenses = expenses || [];
                this.kpiExpensesLoaded = true;
                this.recomputeSavingsRate();
                this.updateKpiLoading();
            },
            error: () => {
                this.kpiExpenses = [];
                this.kpiExpensesLoaded = true;
                this.recomputeSavingsRate();
                this.updateKpiLoading();
            }
        });
    }

    private loadLatestSnapshotDate() {
        this.debtService.getAvailableSnapshots().subscribe({
            next: (snapshots) => {
                const latest = snapshots
                    .map(s => s.snapshotDate)
                    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                    .pop();
                if (latest) {
                    this.snapshotStateService.setCurrentSnapshot(latest);
                } else {
                    this.kpiDebtLoaded = true;
                    this.updateKpiLoading();
                }
            },
            error: () => {
                this.kpiDebtLoaded = true;
                this.updateKpiLoading();
            }
        });
    }

    private loadDebtSummary(date: string) {
        this.debtService.getSnapshotSummary(date).subscribe({
            next: (summary: DebtSummary) => {
                this.kpiTotalDebt = summary.totalDebt || 0;
                this.kpiDebtLoaded = true;
                this.recomputeNetWorth();
                this.updateKpiLoading();
            },
            error: () => {
                this.kpiTotalDebt = 0;
                this.kpiDebtLoaded = true;
                this.recomputeNetWorth();
                this.updateKpiLoading();
            }
        });
    }

    private recomputeNetWorth() {
        this.kpiNetWorth = (this.kpiRetirementAssets || 0) - (this.kpiTotalDebt || 0);
    }

    private recomputeSavingsRate() {
        if (!this.kpiExpensesLoaded || !this.kpiSnapshotDate) return;
        const snapshotDate = new Date(this.kpiSnapshotDate + 'T12:00:00');
        if (isNaN(snapshotDate.getTime())) return;
        const year = snapshotDate.getFullYear();
        const month = snapshotDate.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const budgetKey = `monthlyBudget_${year}-${month}`;
        const storedBudget = localStorage.getItem(budgetKey);
        this.kpiMonthlyBudget = storedBudget ? parseFloat(storedBudget) : 5000;
        this.kpiMonthlySpend = this.kpiExpenses
            .filter(expense => expense.date.startsWith(monthKey))
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);
        if (this.kpiMonthlyBudget > 0) {
            this.kpiSavingsRate = ((this.kpiMonthlyBudget - this.kpiMonthlySpend) / this.kpiMonthlyBudget) * 100;
        } else {
            this.kpiSavingsRate = null;
        }
    }

    private updateKpiLoading() {
        this.kpiLoading = !(this.kpiDebtLoaded && this.kpiRetirementLoaded && this.kpiExpensesLoaded);
    }
}
