import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProfileService, Profile } from './services/profile.service';
import { ThemeService, ThemeMode } from './services/theme.service';
import { DebtAccountService, DebtSummary, DebtAccount } from './services/debt-account.service';
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
    Math = Math;
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
    kpiDebtPrevious: number | null = null;
    kpiRetirementPrevious: number | null = null;

    // Trend Properties
    kpiNetWorthTrend: { percent: number; diff: number } | null = null;
    kpiDebtTrend: { percent: number; diff: number } | null = null;
    kpiRetirementTrend: { percent: number; diff: number } | null = null;
    kpiSavingsTrend: { percent: number; diff: number } | null = null;
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
                this.loadRetirementSnapshot(date);
                this.updateNetWorthTrendForSnapshot(date);
                this.recomputeSavingsRate();
            } else {
                this.kpiSnapshotDate = null;
                this.updateNetWorthTrendForSnapshot(null);
                this.loadLatestSnapshotDate();
            }
        });

        this.expenseService.getAllExpenses().subscribe({
            next: (expenses) => {
                this.kpiExpenses = expenses || [];
                this.kpiExpensesLoaded = true;
                this.updateKpisAndLoading();
            },
            error: () => {
                this.kpiExpenses = [];
                this.kpiExpensesLoaded = true;
                this.updateKpisAndLoading();
            }
        });
    }

    private updateKpisAndLoading() {
        this.recomputeNetWorth();
        this.recomputeSavingsRate();
        this.updateKpiLoading();
    }

    private loadLatestSnapshotDate() {
        this.debtService.getAvailableSnapshots().subscribe({
            next: (snapshots) => {
                const sorted = snapshots
                    .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());

                const latestWithData = sorted.find(s => (s.totalDebt || 0) > 0);
                if (latestWithData) {
                    this.snapshotStateService.setCurrentSnapshot(latestWithData.snapshotDate);

                    // Calculate debt trend if previous populate exists
                    const index = sorted.indexOf(latestWithData);
                    const previousWithData = sorted.slice(index + 1).find(s => (s.totalDebt || 0) > 0);

                    this.updateDebtTrend(latestWithData.snapshotDate, previousWithData?.snapshotDate || null);
                } else {
                    this.kpiDebtPrevious = null;
                    this.kpiDebtTrend = null;
                    this.kpiDebtLoaded = true;
                    this.updateKpisAndLoading();
                }
            },
            error: () => {
                this.kpiDebtPrevious = null;
                this.kpiDebtTrend = null;
                this.kpiDebtLoaded = true;
                this.updateKpisAndLoading();
            }
        });
    }

    private loadDebtSummary(date: string) {
        this.debtService.getAvailableSnapshots().subscribe({
            next: (snapshots) => {
                const ordered = (snapshots || []).slice().sort((a, b) => {
                    return new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime();
                });
                const current = ordered.find(s => s.snapshotDate === date) || null;
                const previous = current ? this.pickPreviousSnapshot(ordered, current.snapshotDate) : null;
                this.updateDebtTrend(current?.snapshotDate || null, previous?.snapshotDate || null);
            },
            error: () => {
                this.kpiDebtPrevious = null;
                this.kpiDebtTrend = null;
                this.kpiDebtLoaded = true;
                this.updateKpisAndLoading();
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

    private loadRetirementSnapshot(date: string) {
        const monthKey = this.getMonthKey(date);
        if (!monthKey) {
            this.kpiRetirementAssets = 0;
            this.kpiRetirementTrend = null;
            this.kpiRetirementPrevious = null;
            this.kpiRetirementLoaded = true;
            this.updateKpisAndLoading();
            return;
        }

        this.retirementService.getAllSnapshots().subscribe({
            next: (snapshots) => {
                const ordered = (snapshots || []).slice().sort((a, b) => {
                    return new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime();
                });
                const current = this.pickSnapshotForMonth(ordered, monthKey)
                    || this.pickLatestBeforeMonth(ordered, monthKey);
                const currentTotal = current?.totalBalance || 0;
                const previous = current ? this.pickPreviousSnapshot(ordered, current.snapshotDate) : null;
                const previousTotal = previous?.totalBalance ?? null;

                this.kpiRetirementAssets = currentTotal;
                if (previousTotal !== null) {
                    this.kpiRetirementPrevious = previousTotal;
                    this.kpiRetirementTrend = {
                        diff: currentTotal - previousTotal,
                        percent: previousTotal !== 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0
                    };
                } else {
                    this.kpiRetirementPrevious = null;
                    this.kpiRetirementTrend = null;
                }
                this.kpiRetirementLoaded = true;
                this.updateKpisAndLoading();
            },
            error: () => {
                this.kpiRetirementAssets = 0;
                this.kpiRetirementTrend = null;
                this.kpiRetirementPrevious = null;
                this.kpiRetirementLoaded = true;
                this.updateKpisAndLoading();
            }
        });
    }

    private getMonthKey(value: string | null): string | null {
        if (!value) return null;
        return value.length >= 7 ? value.slice(0, 7) : null;
    }

    private pickSnapshotForMonth(snapshots: any[], monthKey: string): any | null {
        return snapshots.find(s => (s.snapshotDate || '').startsWith(monthKey)) || null;
    }

    private pickLatestBeforeMonth(snapshots: any[], monthKey: string): any | null {
        const monthStart = new Date(`${monthKey}-01`);
        if (isNaN(monthStart.getTime())) return null;
        const previous = snapshots.filter(s => new Date(s.snapshotDate) < monthStart);
        return previous.length ? previous[previous.length - 1] : null;
    }

    private pickPreviousSnapshot(snapshots: any[], snapshotDate: string): any | null {
        if (!snapshotDate) return null;
        const index = snapshots.findIndex(s => s.snapshotDate === snapshotDate);
        if (index > 0) return snapshots[index - 1];
        if (index === -1) {
            const target = new Date(snapshotDate);
            const previous = snapshots.filter(s => new Date(s.snapshotDate) < target);
            return previous.length ? previous[previous.length - 1] : null;
        }
        return null;
    }

    private getPreviousMonthKey(monthKey: string): string | null {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        if (!year || !month || month < 1 || month > 12) return null;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    private updateNetWorthTrendForSnapshot(date: string | null): void {
        const monthKey = this.getMonthKey(date);
        if (!monthKey) {
            this.kpiNetWorthTrend = null;
            return;
        }
        const previousMonthKey = this.getPreviousMonthKey(monthKey);
        if (!previousMonthKey) {
            this.kpiNetWorthTrend = null;
            return;
        }

        forkJoin({
            debtSnapshots: this.debtService.getAvailableSnapshots(),
            retirementSnapshots: this.retirementService.getAllSnapshots()
        }).subscribe({
            next: ({ debtSnapshots, retirementSnapshots }) => {
                const orderedDebt = (debtSnapshots || []).slice().sort((a, b) => {
                    return new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime();
                });
                const orderedRetirement = (retirementSnapshots || []).slice().sort((a, b) => {
                    return new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime();
                });

                const currentDebtSnapshot = this.pickSnapshotForMonth(orderedDebt, monthKey)
                    || this.pickLatestBeforeMonth(orderedDebt, monthKey);
                const currentRetirementSnapshot = this.pickSnapshotForMonth(orderedRetirement, monthKey)
                    || this.pickLatestBeforeMonth(orderedRetirement, monthKey);

                const prevDebtSnapshot = this.pickSnapshotForMonth(orderedDebt, previousMonthKey)
                    || this.pickLatestBeforeMonth(orderedDebt, previousMonthKey);
                const prevRetirementSnapshot = this.pickSnapshotForMonth(orderedRetirement, previousMonthKey)
                    || this.pickLatestBeforeMonth(orderedRetirement, previousMonthKey);

                const currentDebtDate = currentDebtSnapshot?.snapshotDate || null;
                const prevDebtDate = prevDebtSnapshot?.snapshotDate || null;
                const currentRetirement = currentRetirementSnapshot?.totalBalance ?? null;
                const prevRetirement = prevRetirementSnapshot?.totalBalance ?? null;

                if (!currentDebtDate || !prevDebtDate || currentRetirement === null || prevRetirement === null) {
                    this.kpiNetWorthTrend = null;
                    return;
                }

                forkJoin({
                    currentAccounts: this.debtService.getSnapshotAccounts(currentDebtDate),
                    previousAccounts: this.debtService.getSnapshotAccounts(prevDebtDate)
                }).subscribe({
                    next: ({ currentAccounts, previousAccounts }) => {
                        const currentDebt = this.computeDebtTotal(currentAccounts);
                        const prevDebt = this.computeDebtTotal(previousAccounts);

                        const currentNetWorth = currentRetirement - currentDebt;
                        const previousNetWorth = prevRetirement - prevDebt;
                        const diff = currentNetWorth - previousNetWorth;
                        this.kpiNetWorthTrend = {
                            diff,
                            percent: previousNetWorth !== 0 ? (diff / Math.abs(previousNetWorth)) * 100 : 0
                        };
                    },
                    error: () => {
                        this.kpiNetWorthTrend = null;
                    }
                });
            },
            error: () => {
                this.kpiNetWorthTrend = null;
            }
        });
    }

    private computeDebtTotal(accounts: DebtAccount[]): number {
        return (accounts || []).filter(acc =>
            (acc.currentBalance || 0) > 0
            && acc.status !== 'PAID_OFF'
            && acc.type !== 'UNKNOWN'
        ).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    }

    private updateDebtTrend(currentDate: string | null, previousDate: string | null) {
        if (!currentDate) {
            this.kpiDebtPrevious = null;
            this.kpiDebtTrend = null;
            this.kpiDebtLoaded = true;
            this.updateKpisAndLoading();
            return;
        }

        if (!previousDate) {
            this.debtService.getSnapshotAccounts(currentDate).subscribe({
                next: (currentAccounts) => {
                    this.kpiTotalDebt = this.computeDebtTotal(currentAccounts);
                    this.kpiDebtPrevious = null;
                    this.kpiDebtTrend = null;
                    this.kpiDebtLoaded = true;
                    this.updateKpisAndLoading();
                },
                error: () => {
                    this.kpiDebtPrevious = null;
                    this.kpiDebtTrend = null;
                    this.kpiDebtLoaded = true;
                    this.updateKpisAndLoading();
                }
            });
            return;
        }

        forkJoin({
            currentAccounts: this.debtService.getSnapshotAccounts(currentDate),
            previousAccounts: this.debtService.getSnapshotAccounts(previousDate)
        }).subscribe({
            next: ({ currentAccounts, previousAccounts }) => {
                const currentDebt = this.computeDebtTotal(currentAccounts);
                const previousDebt = this.computeDebtTotal(previousAccounts);
                this.kpiTotalDebt = currentDebt;
                this.kpiDebtPrevious = previousDebt;
                this.kpiDebtTrend = {
                    diff: currentDebt - previousDebt,
                    percent: previousDebt !== 0 ? ((currentDebt - previousDebt) / previousDebt) * 100 : 0
                };
                this.kpiDebtLoaded = true;
                this.updateKpisAndLoading();
            },
            error: () => {
                this.kpiDebtPrevious = null;
                this.kpiDebtTrend = null;
                this.kpiDebtLoaded = true;
                this.updateKpisAndLoading();
            }
        });
    }

    private updateKpiLoading() {
        this.kpiLoading = !(this.kpiDebtLoaded && this.kpiRetirementLoaded && this.kpiExpensesLoaded);
    }
}
