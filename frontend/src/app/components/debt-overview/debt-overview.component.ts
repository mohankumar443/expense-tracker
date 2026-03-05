import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { fadeIn, slideInUp, staggerFadeIn } from '../../animations';
import { DebtAccountService, DebtSummary, DebtAccount } from '../../services/debt-account.service';
import { RetirementService } from '../../services/retirement.service';
import { RetirementStateService } from '../../services/retirement-state.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { CompareStateService } from '../../services/compare-state.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SnapshotManagerComponent } from '../snapshot-manager/snapshot-manager.component';

@Component({
    selector: 'app-debt-overview',
    templateUrl: './debt-overview.component.html',
    styleUrls: ['./debt-overview.component.css'],
    animations: [fadeIn, slideInUp, staggerFadeIn]
})
export class DebtOverviewComponent implements OnInit {
    Math = Math; // Expose Math to template
    private readonly COMPARE_STORAGE_KEY = 'compare_snapshot_date';
    private readonly COMPARE_PRIMARY_KEY = 'compare_snapshot_primary';

    @ViewChild(SnapshotManagerComponent, { static: false }) snapshotManager!: SnapshotManagerComponent;

    summary: DebtSummary = {
        snapshotDate: '',
        totalDebt: 0,
        creditCardDebt: 0,
        personalLoanDebt: 0,
        autoLoanDebt: 0,
        totalAccounts: 0
    };

    previousSummary: DebtSummary | null = null;
    previousAccounts: DebtAccount[] = [];
    compareSummary: DebtSummary | null = null;
    compareLabel = '';
    compareSnapshotDate = '';
    compareSelectionPrimary = '';
    compareSelectionBaseline = '';
    showCompareModal = false;

    highestInterestAccount: DebtAccount | null = null;
    availableSnapshots: any[] = [];
    selectedSnapshot: string = '';
    snapshotsReady = false;
    allAccounts: DebtAccount[] = [];
    lastUpdatedAt: Date | null = null;

    // UI State
    loading = false;
    error = '';
    snapshotSubscription: any;
    compareSubscription?: Subscription;

    // Analytics Data
    interestBreakdown: any;
    payoffTimeline: any;
    nextMonthProjection: any;
    highAprAccounts: DebtAccount[] = [];

    // Priority List State
    showAllPriorities = false;
    payoffStrategyMode: 'APR' | 'INTEREST' | 'COMBINED' = 'APR';

    // Extra Payment Calculator
    extraPaymentAmount = 0;
    projectedSavings = 0;
    projectedMonthsSaved = 0;

    // Net Worth
    totalAssets = 0;
    netWorth = 0;
    retirementCurrent = 0;
    retirementPrevious = 0;

    constructor(
        private debtService: DebtAccountService,
        private snapshotStateService: SnapshotStateService,
        private analyticsService: AnalyticsService,
        private retirementService: RetirementService,
        public retirementStateService: RetirementStateService,
        private compareStateService: CompareStateService,
        private cdr: ChangeDetectorRef
    ) {
        effect(() => {
            this.retirementCurrent = this.retirementStateService.totalRetirementBalance();
            // Optional: You could also sync retirementPrevious from service here if needed
            // const prev = this.retirementStateService.previousSnapshot();
            // ... logic ...
            this.calculateNetWorth();
        });
    }

    ngOnInit() {
        // Initial data loading is handled after snapshots are loaded.
        // Removed premature loadSummary call to avoid empty snapshot requests.
        this.loadHighestInterest();
        this.compareSnapshotDate = localStorage.getItem(this.COMPARE_STORAGE_KEY) || '';
        this.compareSelectionPrimary = localStorage.getItem(this.COMPARE_PRIMARY_KEY) || '';
        this.compareStateService.setActive(!!this.compareSnapshotDate);
        this.loadSnapshots();

        // Subscribe to snapshot changes
        this.snapshotSubscription = this.snapshotStateService.currentSnapshot$.subscribe(fileName => {
            if (!fileName) {
                // Ignore initial empty emission.
                return;
            }
            const resolvedDate = this.resolveSnapshotDate(fileName);
            this.selectedSnapshot = resolvedDate;
            this.loadData(resolvedDate);
        });

        this.compareSubscription = this.compareStateService.openCompare$.subscribe(() => {
            this.openCompareModal();
        });

    }

    loadSnapshots() {
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            // Map backend Snapshot objects to UI format
            this.availableSnapshots = snapshots.map(s => {
                const normalizedDate = this.normalizeSnapshotDate(s.snapshotDate) || s.snapshotDate;
                return {
                    fileName: normalizedDate, // Use date as the identifier
                    // Append T12:00:00 to ensure it's treated as the correct day regardless of timezone
                    displayName: new Date(normalizedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    snapshotDate: normalizedDate,
                    createdAt: s.createdAt ? new Date(s.createdAt) : null,
                    updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
                };
            });

            // Sort chronologically: oldest to newest (Jan, Feb, Mar... by year)
            this.availableSnapshots.sort((a, b) => {
                const dateA = new Date(a.snapshotDate).getTime();
                const dateB = new Date(b.snapshotDate).getTime();
                return dateA - dateB; // Ascending order (oldest first)
            });

            this.ensureSelectedSnapshot();
            this.snapshotsReady = true;
            this.ensureCompareSelection();
        });
    }

    onSnapshotChange() {
        const resolved = this.resolveSnapshotDate(this.selectedSnapshot);
        if (!resolved) return;
        this.selectedSnapshot = resolved;
        this.snapshotStateService.setCurrentSnapshot(resolved);
        this.setLastUpdated(resolved);
    }

    ngOnDestroy() {
        if (this.snapshotSubscription) {
            this.snapshotSubscription.unsubscribe();
        }
        this.compareSubscription?.unsubscribe();
    }

    loadData(date: string) {
        if (!date) return;
        this.loading = true;
        this.error = '';
        const resolvedDate = this.resolveSnapshotDate(date);
        this.compareSelectionPrimary = resolvedDate;
        if (this.compareSnapshotDate) {
            localStorage.setItem(this.COMPARE_PRIMARY_KEY, resolvedDate);
        }
        this.setLastUpdated(resolvedDate);
        this.refreshSnapshots(resolvedDate);

        // Load Summary
        this.debtService.getSnapshotSummary(resolvedDate).subscribe({
            next: (data) => {
                this.summary = data;
                if (data?.snapshotDate) {
                    const summaryDate = this.resolveSnapshotDate(data.snapshotDate);
                    // Single source of truth: backend tells us what date we are viewing
                    if (this.selectedSnapshot !== summaryDate) {
                        this.selectedSnapshot = summaryDate;
                    }
                    this.ensureSnapshotOption(summaryDate);
                    if (summaryDate !== this.snapshotStateService.getCurrentSnapshot()) {
                        this.snapshotStateService.setCurrentSnapshot(summaryDate);
                    }
                }
                if (this.allAccounts.length > 0) {
                    this.applyAccountDerivedSummary(this.allAccounts, resolvedDate);
                }
                this.calculateNetWorth();
            },
            error: (err) => {
                console.error('Error loading summary', err);
                this.error = 'Failed to load debt summary';
                this.loading = false;
            }
        });

        // Load Previous Month Summary
        const currentIndex = this.availableSnapshots.findIndex(s => s.snapshotDate === resolvedDate);
        if (currentIndex > 0) {
            const previousDate = this.availableSnapshots[currentIndex - 1].snapshotDate;
            const previousMonthYear = previousDate.slice(0, 7);
            this.debtService.getSnapshotSummary(previousDate).subscribe({
                next: (data) => {
                    if (this.previousAccounts.length === 0) {
                        this.previousSummary = data;
                    }
                },
                error: (err) => console.error('Error loading previous summary', err)
            });
            this.debtService.getSnapshotAccounts(previousDate).subscribe({
                next: (accounts) => {
                    this.previousAccounts = accounts;
                    this.previousSummary = this.buildSummaryFromAccounts(accounts, previousDate);
                },
                error: (err) => console.error('Error loading previous accounts', err)
            });
            this.retirementService.getSnapshotByDate(previousDate).subscribe({
                next: (snapshot) => {
                    if (snapshot) {
                        this.retirementPrevious = this.getRetirementTotal(snapshot);
                        return;
                    }
                    this.retirementService.getSnapshotByMonth(previousMonthYear).subscribe({
                        next: (fallback) => {
                            this.retirementPrevious = this.getRetirementTotal(fallback);
                        },
                        error: () => {
                            this.retirementPrevious = 0;
                        }
                    });
                },
                error: () => {
                    this.retirementService.getSnapshotByMonth(previousMonthYear).subscribe({
                        next: (fallback) => {
                            this.retirementPrevious = this.getRetirementTotal(fallback);
                        },
                        error: () => {
                            this.retirementPrevious = 0;
                        }
                    });
                }
            });
        } else {
            this.previousSummary = null;
            this.previousAccounts = [];
            this.retirementPrevious = 0;
        }

        // Load Accounts & Run Analytics
        this.debtService.getSnapshotAccounts(resolvedDate).subscribe({
            next: (accounts) => {
                this.allAccounts = accounts;
                this.applyAccountDerivedSummary(accounts, resolvedDate);
                this.runAnalytics();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading accounts', err);
                this.error = 'Failed to load accounts';
                this.loading = false;
            }
        });

        const currentMonthYear = resolvedDate.slice(0, 7);

        // Single Source of Truth: Delegate to RetirementStateService
        // The effect() in constructor will update the UI when this loads.
        this.retirementStateService.setMonthYear(currentMonthYear);
        this.retirementStateService.loadState(currentMonthYear);
        this.calculateNetWorth();

        this.loadCompareData(resolvedDate);
    }

    private setLastUpdated(snapshotDate: string) {
        const matched = this.availableSnapshots.find(s => s.snapshotDate === snapshotDate);
        this.lastUpdatedAt = matched?.updatedAt || matched?.createdAt || null;
    }

    private refreshSnapshots(snapshotDate: string) {
        this.debtService.getAvailableSnapshots().subscribe({
            next: (snapshots) => {
                this.availableSnapshots = snapshots.map(s => {
                    const normalizedDate = this.normalizeSnapshotDate(s.snapshotDate) || s.snapshotDate;
                    return {
                        fileName: normalizedDate,
                        displayName: new Date(normalizedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                        snapshotDate: normalizedDate,
                        createdAt: s.createdAt ? new Date(s.createdAt) : null,
                        updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
                    };
                });
                this.availableSnapshots.sort((a, b) => {
                    const dateA = new Date(a.snapshotDate).getTime();
                    const dateB = new Date(b.snapshotDate).getTime();
                    return dateA - dateB;
                });
                const normalizedDate = this.normalizeSnapshotDate(snapshotDate) || snapshotDate;
                this.ensureSnapshotOption(normalizedDate);
                this.ensureSelectedSnapshot(normalizedDate);
                this.setLastUpdated(normalizedDate);
                this.snapshotsReady = true;
                this.ensureCompareSelection();
            }
        });
    }

    private ensureSnapshotOption(snapshotDate: string) {
        if (!snapshotDate) return;
        const normalizedDate = this.normalizeSnapshotDate(snapshotDate) || snapshotDate;
        const exists = this.availableSnapshots.some(s => s.snapshotDate === normalizedDate);
        if (!exists) {
            this.availableSnapshots.push({
                fileName: normalizedDate,
                displayName: new Date(normalizedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                snapshotDate: normalizedDate,
                createdAt: null,
                updatedAt: null
            });
            this.availableSnapshots.sort((a, b) => {
                const dateA = new Date(a.snapshotDate).getTime();
                const dateB = new Date(b.snapshotDate).getTime();
                return dateA - dateB;
            });
        }
    }

    private normalizeSnapshotDate(value: any): string | null {
        if (!value) return null;
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value === 'string') {
            if (value.length >= 10) {
                return value.slice(0, 10);
            }
            return value;
        }
        return null;
    }

    private resolveSnapshotDate(value: any): string {
        const normalized = this.normalizeSnapshotDate(value) || value;
        if (!normalized || this.availableSnapshots.length === 0) {
            return normalized;
        }
        const exact = this.availableSnapshots.find(s => s.snapshotDate === normalized);
        if (exact) {
            return exact.snapshotDate;
        }
        const monthKey = normalized.slice(0, 7);
        const sameMonth = this.availableSnapshots.find(s => s.snapshotDate.startsWith(monthKey));
        return sameMonth ? sameMonth.snapshotDate : normalized;
    }

    private ensureSelectedSnapshot(preferredDate?: string) {
        const normalizedPreferred = this.normalizeSnapshotDate(preferredDate)
            || this.normalizeSnapshotDate(this.summary?.snapshotDate)
            || this.normalizeSnapshotDate(this.snapshotStateService.getCurrentSnapshot())
            || this.normalizeSnapshotDate(this.selectedSnapshot)
            || null;
        const normalizedLatest = this.availableSnapshots.length > 0
            ? this.availableSnapshots[this.availableSnapshots.length - 1].snapshotDate
            : null;
        let nextSelection = normalizedPreferred && this.availableSnapshots.some(s => s.snapshotDate === normalizedPreferred)
            ? normalizedPreferred
            : null;
        if (!nextSelection && normalizedPreferred) {
            const monthKey = normalizedPreferred.slice(0, 7);
            const monthMatch = this.availableSnapshots.find(s => s.snapshotDate.startsWith(monthKey));
            nextSelection = monthMatch ? monthMatch.snapshotDate : null;
        }
        if (!nextSelection) {
            nextSelection = normalizedLatest;
        }
        if (!nextSelection) return;
        if (this.selectedSnapshot !== nextSelection) {
            this.selectedSnapshot = nextSelection;
        }
        if (this.snapshotStateService.getCurrentSnapshot() !== nextSelection) {
            this.snapshotStateService.setCurrentSnapshot(nextSelection);
        } else if (!preferredDate) {
            this.loadData(nextSelection);
        }
    }

    private ensureCompareSelection() {
        if (!this.compareSnapshotDate) {
            this.compareSummary = null;
            this.compareLabel = '';
            return;
        }
        const normalized = this.normalizeSnapshotDate(this.compareSnapshotDate) || this.compareSnapshotDate;
        if (normalized && this.availableSnapshots.some(s => s.snapshotDate === normalized)) {
            this.compareSnapshotDate = normalized;
            this.compareSelectionBaseline = normalized;
            this.compareLabel = this.getSnapshotLabel(normalized);
            this.loadCompareData(this.selectedSnapshot || normalized);
            this.compareStateService.setActive(true);
        } else {
            this.compareSnapshotDate = '';
            this.compareSelectionBaseline = '';
            this.compareSummary = null;
            this.compareLabel = '';
            localStorage.removeItem(this.COMPARE_STORAGE_KEY);
            localStorage.removeItem(this.COMPARE_PRIMARY_KEY);
            this.compareStateService.setActive(false);
        }
    }

    openCompareModal() {
        if (!this.snapshotsReady) return;
        const resolvedCurrent = this.resolveSnapshotDate(this.selectedSnapshot)
            || (this.availableSnapshots[this.availableSnapshots.length - 1]?.snapshotDate || '');
        const storedPrimary = this.resolveSnapshotDate(this.compareSelectionPrimary);
        const currentPrimary = storedPrimary && this.availableSnapshots.some(s => s.snapshotDate === storedPrimary)
            ? storedPrimary
            : resolvedCurrent;
        const storedBaseline = this.resolveSnapshotDate(this.compareSnapshotDate);
        let baseline = storedBaseline && this.availableSnapshots.some(s => s.snapshotDate === storedBaseline)
            ? storedBaseline
            : this.getPreviousSnapshotDate(currentPrimary);
        if (!baseline) {
            baseline = this.availableSnapshots[0]?.snapshotDate || '';
        }
        if (baseline === currentPrimary) {
            baseline = this.getPreviousSnapshotDate(currentPrimary) || this.availableSnapshots[0]?.snapshotDate || '';
        }
        this.compareSelectionPrimary = currentPrimary;
        this.compareSelectionBaseline = baseline;
        this.showCompareModal = true;
    }

    cancelCompare() {
        this.showCompareModal = false;
        this.compareSelectionPrimary = this.selectedSnapshot;
        this.compareSelectionBaseline = this.compareSnapshotDate;
    }

    applyCompare() {
        if (!this.compareSelectionPrimary || !this.compareSelectionBaseline) return;
        const resolvedPrimary = this.resolveSnapshotDate(this.compareSelectionPrimary);
        const resolvedBaseline = this.resolveSnapshotDate(this.compareSelectionBaseline);
        if (!resolvedPrimary || !resolvedBaseline || resolvedPrimary === resolvedBaseline) return;
        this.compareSnapshotDate = resolvedBaseline;
        localStorage.setItem(this.COMPARE_STORAGE_KEY, resolvedBaseline);
        localStorage.setItem(this.COMPARE_PRIMARY_KEY, resolvedPrimary);
        this.compareLabel = this.getSnapshotLabel(resolvedBaseline);
        this.selectedSnapshot = resolvedPrimary;
        this.snapshotStateService.setCurrentSnapshot(resolvedPrimary);
        this.loadCompareData(resolvedPrimary);
        this.compareStateService.setActive(true);
        this.showCompareModal = false;
    }

    clearCompare() {
        this.compareSnapshotDate = '';
        this.compareSelectionBaseline = '';
        this.compareSummary = null;
        this.compareLabel = '';
        localStorage.removeItem(this.COMPARE_STORAGE_KEY);
        localStorage.removeItem(this.COMPARE_PRIMARY_KEY);
        this.compareStateService.setActive(false);
        this.loadData(this.selectedSnapshot);
    }

    private loadCompareData(currentDate: string) {
        if (!this.compareSnapshotDate) {
            this.compareSummary = null;
            this.compareLabel = '';
            return;
        }
        const resolvedCompare = this.resolveSnapshotDate(this.compareSnapshotDate);
        if (!resolvedCompare) {
            this.compareSummary = null;
            this.compareLabel = '';
            return;
        }
        if (resolvedCompare === currentDate) {
            this.compareSummary = null;
            this.compareLabel = this.getSnapshotLabel(resolvedCompare);
            this.retirementPrevious = this.retirementCurrent;
            return;
        }

        this.debtService.getSnapshotSummary(resolvedCompare).subscribe({
            next: (summary) => {
                this.compareSummary = summary;
            },
            error: () => {
                this.compareSummary = null;
            }
        });

        this.retirementService.getSnapshotByDate(resolvedCompare).subscribe({
            next: (snapshot) => {
                if (snapshot) {
                    this.retirementPrevious = this.getRetirementTotal(snapshot);
                    return;
                }
                const compareMonthYear = resolvedCompare.slice(0, 7);
                this.retirementService.getSnapshotByMonth(compareMonthYear).subscribe({
                    next: (fallback) => {
                        this.retirementPrevious = this.getRetirementTotal(fallback);
                    },
                    error: () => {
                        this.retirementPrevious = 0;
                    }
                });
            },
            error: () => {
                const compareMonthYear = resolvedCompare.slice(0, 7);
                this.retirementService.getSnapshotByMonth(compareMonthYear).subscribe({
                    next: (fallback) => {
                        this.retirementPrevious = this.getRetirementTotal(fallback);
                    },
                    error: () => {
                        this.retirementPrevious = 0;
                    }
                });
            }
        });
    }

    getCompareLabel(): string {
        if (this.compareSnapshotDate) {
            return `vs ${this.getSnapshotLabel(this.compareSnapshotDate)}`;
        }
        return 'vs last month';
    }

    getSnapshotLabel(snapshotDate: string): string {
        if (!snapshotDate) return '';
        const date = new Date(snapshotDate + 'T12:00:00');
        if (isNaN(date.getTime())) return snapshotDate;
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    isCompareActive(): boolean {
        return !!this.compareSnapshotDate;
    }

    private getPreviousSnapshotDate(currentDate: string): string {
        const resolved = this.resolveSnapshotDate(currentDate);
        const index = this.availableSnapshots.findIndex(s => s.snapshotDate === resolved);
        if (index > 0) {
            return this.availableSnapshots[index - 1].snapshotDate;
        }
        return '';
    }

    // Placeholder for loadHighestInterest, assuming it's part of runAnalytics or removed
    loadHighestInterest() {
        // This logic might be integrated into runAnalytics or removed if not needed separately
        // For now, it's left as an empty placeholder to avoid breaking existing calls if any
    }

    runAnalytics() {
        if (!this.allAccounts.length) return;

        const payoffAccounts = this.getPayoffAccounts(this.allAccounts);
        const highApr = this.analyticsService.getHighAprAccounts(payoffAccounts, 1);
        this.highestInterestAccount = highApr.length > 0 ? highApr[0] : null;
        this.interestBreakdown = this.analyticsService.calculateInterestBreakdown(payoffAccounts);
        this.payoffTimeline = this.analyticsService.calculatePayoffTimeline(payoffAccounts, this.extraPaymentAmount);
        this.nextMonthProjection = this.analyticsService.projectNextMonth(payoffAccounts);

        // Get ALL high APR accounts for the priority list
        this.highAprAccounts = this.analyticsService.getHighAprAccounts(payoffAccounts, -1);

        this.calculateExtraPaymentSavings();
    }

    togglePriorities() {
        this.showAllPriorities = !this.showAllPriorities;
    }

    getVisiblePriorities(): DebtAccount[] {
        const sorted = this.getPayoffPriorityList();
        if (this.showAllPriorities) {
            return sorted;
        }
        return sorted.slice(0, 3);
    }

    setPayoffStrategy(mode: 'APR' | 'INTEREST' | 'COMBINED') {
        this.payoffStrategyMode = mode;
    }

    getPayoffPriorityValue(account: DebtAccount): string {
        const aprValue = `${account.apr || 0}%`;
        const monthlyInterest = this.calculateMonthlyInterest(account.currentBalance || 0, account.apr || 0);
        const interestValue = `${this.formatCurrency(monthlyInterest)}/mo`;

        if (this.payoffStrategyMode === 'INTEREST') {
            return interestValue;
        }
        if (this.payoffStrategyMode === 'COMBINED') {
            return `${aprValue} · ${interestValue}`;
        }
        return aprValue;
    }

    private calculateMonthlyInterest(balance: number, apr: number): number {
        return (balance * apr) / 100 / 12;
    }

    private getPayoffPriorityList(): DebtAccount[] {
        const payoffAccounts = this.getPayoffAccounts(this.allAccounts);
        if (this.payoffStrategyMode === 'INTEREST') {
            return [...payoffAccounts].sort((a, b) => {
                const aInterest = this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0);
                const bInterest = this.calculateMonthlyInterest(b.currentBalance || 0, b.apr || 0);
                return bInterest - aInterest;
            });
        }
        if (this.payoffStrategyMode === 'COMBINED') {
            const maxApr = Math.max(...payoffAccounts.map(a => a.apr || 0), 1);
            const maxInterest = Math.max(...payoffAccounts.map(a => this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0)), 1);
            return [...payoffAccounts].sort((a, b) => {
                const aInterest = this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0);
                const bInterest = this.calculateMonthlyInterest(b.currentBalance || 0, b.apr || 0);
                const aScore = (a.apr || 0) / maxApr + aInterest / maxInterest;
                const bScore = (b.apr || 0) / maxApr + bInterest / maxInterest;
                return bScore - aScore;
            });
        }
        return [...payoffAccounts].sort((a, b) => (b.apr || 0) - (a.apr || 0));
    }

    calculateNetWorth() {
        if (this.summary) {
            this.netWorth = this.analyticsService.calculateNetWorth(this.totalAssets, this.summary.totalDebt);
        }
    }

    private getRetirementTotal(snapshot: any): number {
        if (!snapshot || !snapshot.accounts || !Array.isArray(snapshot.accounts)) {
            // Fallback to totalBalance only if accounts are missing
            if (snapshot && (snapshot.totalBalance !== undefined)) {
                return snapshot.totalBalance || 0;
            }
            return 0;
        }
        // Match logic in RetirementStateService: Filter for RETIREMENT goal type
        return snapshot.accounts
            .filter((acc: any) => !acc.goalType || acc.goalType === 'RETIREMENT')
            .reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
    }

    onAssetsChange() {
        localStorage.setItem('debt_tracker_assets', this.totalAssets.toString());
        this.calculateNetWorth();
    }

    calculateExtraPaymentSavings() {
        if (this.extraPaymentAmount > 0) {
            const payoffAccounts = this.getPayoffAccounts(this.allAccounts);
            const baseline = this.analyticsService.calculatePayoffTimeline(payoffAccounts, 0);
            const withExtra = this.analyticsService.calculatePayoffTimeline(payoffAccounts, this.extraPaymentAmount);

            this.projectedSavings = baseline.overall.totalInterestPaid - withExtra.overall.totalInterestPaid;
            this.projectedMonthsSaved = baseline.overall.months - withExtra.overall.months;
        } else {
            this.projectedSavings = 0;
            this.projectedMonthsSaved = 0;
        }
    }

    onExtraPaymentChange() {
        this.calculateExtraPaymentSavings();
        // Update timeline with new extra payment
        this.payoffTimeline = this.analyticsService.calculatePayoffTimeline(
            this.getPayoffAccounts(this.allAccounts),
            this.extraPaymentAmount
        );
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    }

    private getPayoffAccounts(accounts: DebtAccount[]): DebtAccount[] {
        return accounts.filter(acc =>
            acc.currentBalance != null
            && acc.currentBalance > 0
            && acc.status !== 'PAID_OFF'
            && acc.type !== 'UNKNOWN'
            && (acc.apr ?? 0) > 0
        );
    }

    getTotalMonthlyInterest(): number {
        return this.interestBreakdown ? this.interestBreakdown.total : 0;
    }

    getTotalMinPayment(): number {
        if (!this.allAccounts || this.allAccounts.length === 0) {
            return 0;
        }
        return this.allAccounts
            .filter(acc => (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getMinPaymentByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        if (!this.allAccounts || this.allAccounts.length === 0) {
            return 0;
        }
        return this.allAccounts
            .filter(acc => acc.type === type && (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getPreviousTotalMinPayment(): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        return this.previousAccounts
            .filter(acc => (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getPreviousMinPaymentByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        return this.previousAccounts
            .filter(acc => acc.type === type && (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getPreviousTotalMonthlyInterest(): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        const breakdown = this.analyticsService.calculateInterestBreakdown(this.previousAccounts);
        return breakdown.total || 0;
    }

    getMonthlyInterestByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        if (!this.allAccounts || this.allAccounts.length === 0) {
            return 0;
        }
        return this.allAccounts
            .filter(acc => acc.type === type && (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + this.calculateMonthlyInterest(account.currentBalance || 0, account.apr || 0), 0);
    }

    getPreviousMonthlyInterestByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        return this.previousAccounts
            .filter(acc => acc.type === type && (acc.currentBalance || 0) > 0)
            .reduce((total, account) => total + this.calculateMonthlyInterest(account.currentBalance || 0, account.apr || 0), 0);
    }

    getPrincipalByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        return this.getMinPaymentByType(type) - this.getMonthlyInterestByType(type);
    }

    getPreviousPrincipalByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        return this.getPreviousMinPaymentByType(type) - this.getPreviousMonthlyInterestByType(type);
    }

    getMinPaymentDeltaByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        return this.getMinPaymentByType(type) - this.getPreviousMinPaymentByType(type);
    }

    getMonthlyInterestDeltaByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        return this.getMonthlyInterestByType(type) - this.getPreviousMonthlyInterestByType(type);
    }

    getPrincipalDeltaByType(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN'): number {
        return this.getPrincipalByType(type) - this.getPreviousPrincipalByType(type);
    }

    private applyAccountDerivedSummary(accounts: DebtAccount[], resolvedDate: string) {
        this.summary = {
            ...this.summary,
            ...this.buildSummaryFromAccounts(accounts, resolvedDate)
        };
        this.calculateNetWorth();
    }

    private buildSummaryFromAccounts(accounts: DebtAccount[], snapshotDate: string): DebtSummary {
        const activeAccounts = accounts.filter(acc =>
            (acc.currentBalance || 0) > 0
            && acc.type !== 'UNKNOWN'
        );
        const totalDebt = activeAccounts
            .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const creditCardDebt = activeAccounts
            .filter(acc => acc.type === 'CREDIT_CARD')
            .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const autoLoanDebt = activeAccounts
            .filter(acc => acc.type === 'AUTO_LOAN')
            .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const personalLoanDebt = activeAccounts
            .filter(acc => acc.type === 'PERSONAL_LOAN')
            .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

        return {
            snapshotDate,
            totalDebt,
            creditCardDebt,
            personalLoanDebt,
            autoLoanDebt,
            totalAccounts: accounts.length
        };
    }

    getMinPaymentDelta(): number {
        return this.getTotalMinPayment() - this.getPreviousTotalMinPayment();
    }

    getInterestDelta(): number {
        return this.getTotalMonthlyInterest() - this.getPreviousTotalMonthlyInterest();
    }

    getPrincipalDelta(): number {
        const current = this.getTotalMinPayment() - this.getTotalMonthlyInterest();
        const previous = this.getPreviousTotalMinPayment() - this.getPreviousTotalMonthlyInterest();
        return current - previous;
    }

    getPerformanceScore(): number {
        // ... existing logic ...
        let score = 50;
        // Simplified for now, can be enhanced with analytics
        if (this.summary) {
            const debtReduction = 100974 - this.summary.totalDebt;
            if (debtReduction > 0) score += Math.min(50, (debtReduction / 5000) * 50);
            else if (debtReduction < 0) score -= Math.min(30, Math.abs(debtReduction / 5000) * 30);
        }
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    getScoreColor(): string {
        const score = this.getPerformanceScore();
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    }

    getScoreLabel(): string {
        const score = this.getPerformanceScore();
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Needs Action';
    }

    getMotivationCards() {
        const debtDelta = this.getDebtChange();
        const interestDelta = this.getInterestDelta();
        const retirementDelta = this.getRetirementChange();
        const principal = this.getTotalMinPayment() - this.getTotalMonthlyInterest();
        const focusTargets = this.getPayoffPriorityList().slice(0, 2);
        const focusLabel = focusTargets.length
            ? focusTargets
                .map(target => `${target.name} (${(target.apr || 0).toFixed(1)}% APR)`)
                .join(' • ')
            : 'No active high APR accounts';

        return [
            {
                title: 'Debt Momentum',
                value: `${debtDelta < 0 ? 'Down' : 'Up'} ${Math.abs(debtDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                tone: debtDelta < 0 ? 'good' : debtDelta > 0 ? 'warn' : 'neutral',
                detail: debtDelta < 0 ? 'You reduced total debt this month.' : 'Debt increased this month.'
            },
            {
                title: 'Interest Trend',
                value: `${interestDelta < 0 ? 'Down' : 'Up'} ${Math.abs(interestDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                tone: interestDelta < 0 ? 'good' : interestDelta > 0 ? 'warn' : 'neutral',
                detail: interestDelta < 0 ? 'Lower monthly interest than last month.' : 'Monthly interest is higher.'
            },
            {
                title: 'Retirement Progress',
                value: `${retirementDelta < 0 ? 'Down' : 'Up'} ${Math.abs(retirementDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                tone: retirementDelta > 0 ? 'good' : retirementDelta < 0 ? 'warn' : 'neutral',
                detail: retirementDelta > 0 ? 'Balances grew vs last month.' : 'Balances fell vs last month.'
            },
            {
                title: 'Principal This Month',
                value: principal > 0
                    ? `$${principal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    : '$0',
                tone: principal > 0 ? 'good' : 'neutral',
                detail: `Focus: ${focusLabel}`
            }
        ];
    }

    getAchievementInsights() {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return [
                { tone: 'neutral', text: 'Add a previous month snapshot to unlock momentum insights.' }
            ];
        }

        const currentByKey = new Map<string, DebtAccount>();
        const previousByKey = new Map<string, DebtAccount>();

        const getKey = (acc: DebtAccount) => acc.accountId || acc.name || '';

        this.allAccounts.forEach(acc => {
            const key = getKey(acc);
            if (key) currentByKey.set(key, acc);
        });
        this.previousAccounts.forEach(acc => {
            const key = getKey(acc);
            if (key) previousByKey.set(key, acc);
        });

        type BalanceDelta = { acc: DebtAccount; diff: number };
        let biggestIncrease: BalanceDelta | undefined;
        let biggestDecrease: BalanceDelta | undefined;
        let clearedHighApr: DebtAccount | undefined;
        let clearedTopFocus: DebtAccount | undefined;

        previousByKey.forEach((prev, key) => {
            const current = currentByKey.get(key);
            if (!current) return;
            const prevBal = prev.currentBalance || 0;
            const currBal = current.currentBalance || 0;
            const diff = currBal - prevBal;

            if (diff > 0 && (!biggestIncrease || diff > biggestIncrease.diff)) {
                biggestIncrease = { acc: current, diff };
            }
            if (diff < 0 && (!biggestDecrease || diff < biggestDecrease.diff)) {
                biggestDecrease = { acc: current, diff };
            }

            if (!clearedHighApr && prevBal > 0 && currBal === 0 && (prev.apr || 0) >= 15) {
                clearedHighApr = current;
            }
        });

        const insights: Array<{ tone: 'good' | 'warn' | 'neutral'; text: string }> = [];
        if (!clearedTopFocus) {
            const previousFocus = [...this.getPayoffAccounts(this.previousAccounts || [])]
                .sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
            if (previousFocus) {
                const current = currentByKey.get(getKey(previousFocus));
                if (current && (previousFocus.currentBalance || 0) > 0 && (current.currentBalance || 0) === 0) {
                    clearedTopFocus = current;
                }
            }
        }

        if (biggestIncrease !== undefined) {
            const increase = biggestIncrease;
            insights.push({
                tone: 'warn',
                text: `${increase.acc.name}: balance increased $${increase.diff.toLocaleString('en-US', { maximumFractionDigits: 0 })} (watch this card).`
            });
        }

        if (biggestDecrease !== undefined) {
            const decrease = biggestDecrease;
            insights.push({
                tone: 'good',
                text: `${decrease.acc.name}: balance reduced $${Math.abs(decrease.diff).toLocaleString('en-US', { maximumFractionDigits: 0 })} — nice progress.`
            });
        }

        const interestDelta = this.getTotalMonthlyInterest() - this.getPreviousTotalMonthlyInterest();
        if (interestDelta !== 0) {
            const saved = Math.abs(interestDelta);
            insights.push({
                tone: interestDelta < 0 ? 'good' : 'warn',
                text: interestDelta < 0
                    ? `Interest saved vs last month: ${this.formatCurrency(saved)}/mo — keep it going.`
                    : `Interest increased vs last month: ${this.formatCurrency(saved)}/mo — needs attention.`
            });
        }

        if (clearedHighApr !== undefined) {
            insights.push({
                tone: 'good',
                text: `Cleared high‑APR debt on ${clearedHighApr.name}. Strong win.`
            });
        }

        if (clearedTopFocus !== undefined) {
            insights.push({
                tone: 'good',
                text: `Completed focus target: ${clearedTopFocus.name}. Next target is now on deck.`
            });
        }

        if (insights.length === 0) {
            insights.push({ tone: 'neutral', text: 'No major month‑over‑month changes detected.' });
        }

        return insights;
    }

    loadSummary() {
        // This method might be redundant if loadData handles everything, 
        // but keeping it safe or refactoring it to use the selected snapshot
        if (this.selectedSnapshot) {
            this.debtService.getSnapshotSummary(this.selectedSnapshot).subscribe({
                next: (data) => {
                    this.summary = data;
                    this.calculateNetWorth();
                },
                error: (err) => {
                    console.error('Error loading summary', err);
                    this.error = 'Failed to load debt summary';
                }
            });
        }
    }

    getPercentage(amount: number): number {
        if (!this.summary || this.summary.totalDebt === 0) return 0;
        return (amount / this.summary.totalDebt) * 100;
    }

    getDebtCategoryTotal(): number {
        if (!this.summary) return 0;
        return (this.summary.creditCardDebt || 0)
            + (this.summary.personalLoanDebt || 0)
            + (this.summary.autoLoanDebt || 0);
    }

    getDebtChange(): number {
        const baseline = this.compareSummary || this.previousSummary;
        if (!baseline || !this.summary) return 0;
        return this.summary.totalDebt - baseline.totalDebt;
    }

    getDebtChangePercentage(): number {
        const baseline = this.compareSummary || this.previousSummary;
        if (!baseline || !this.summary || baseline.totalDebt === 0) return 0;
        return ((this.summary.totalDebt - baseline.totalDebt) / baseline.totalDebt) * 100;
    }

    getCategoryChange(category: 'creditCard' | 'personalLoan' | 'autoLoan'): number {
        const baseline = this.compareSummary || this.previousSummary;
        if (!baseline || !this.summary) return 0;
        const current = category === 'creditCard' ? this.summary.creditCardDebt :
            category === 'personalLoan' ? this.summary.personalLoanDebt :
                this.summary.autoLoanDebt;
        const previous = category === 'creditCard' ? baseline.creditCardDebt :
            category === 'personalLoan' ? baseline.personalLoanDebt :
                baseline.autoLoanDebt;
        return (current || 0) - (previous || 0);
    }

    getCategoryChangePercentage(category: 'creditCard' | 'personalLoan' | 'autoLoan'): number {
        const diff = this.getCategoryChange(category);
        const baseline = this.compareSummary || this.previousSummary;
        const previous = category === 'creditCard' ? baseline?.creditCardDebt :
            category === 'personalLoan' ? baseline?.personalLoanDebt :
                baseline?.autoLoanDebt;
        if (!previous || previous === 0) return 0;
        return (diff / previous) * 100;
    }

    getRetirementChange(): number {
        return this.retirementCurrent - this.retirementPrevious;
    }

    getRetirementChangePercentage(): number {
        if (this.retirementPrevious === 0) return 0;
        return (this.getRetirementChange() / this.retirementPrevious) * 100;
    }

    getTrendIcon(change: number): string {
        if (change > 0) return 'arrow_upward';
        if (change < 0) return 'arrow_downward';
        return 'remove';
    }

    getTrendClass(change: number, isAsset: boolean): string {
        if (change === 0) return 'text-slate-400';
        const good = isAsset ? change > 0 : change < 0;
        return good ? 'text-emerald-500' : 'text-rose-500';
    }

    isSnapshotChanged(): boolean {
        // Check if current snapshot is different from the default/latest
        // Assuming latest is the first one in availableSnapshots
        if (this.availableSnapshots.length > 0) {
            return this.selectedSnapshot !== this.availableSnapshots[0].snapshotDate;
        }
        return false;
    }

    openSnapshotManager() {
        console.log('openSnapshotManager called', this.snapshotManager);
        if (this.snapshotManager) {
            this.snapshotManager.open();
        } else {
            console.error('SnapshotManager component not found');
        }
    }

    onSnapshotCreated(newSnapshotDate?: string | null) {
        console.log('Snapshot created/deleted, reloading...', newSnapshotDate);
        // Reload snapshots
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            this.availableSnapshots = snapshots.map(s => {
                const normalizedDate = this.normalizeSnapshotDate(s.snapshotDate) || s.snapshotDate;
                return {
                    fileName: normalizedDate,
                    displayName: new Date(normalizedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    snapshotDate: normalizedDate,
                    updatedAt: s.updatedAt,
                    createdAt: s.createdAt
                };
            });

            this.availableSnapshots.sort((a, b) => {
                const dateA = new Date(a.snapshotDate).getTime();
                const dateB = new Date(b.snapshotDate).getTime();
                return dateA - dateB;
            });

            if (newSnapshotDate) {
                // If a specific new snapshot was created, switch to it
                const normalizedNew = this.normalizeSnapshotDate(newSnapshotDate) || newSnapshotDate;
                const newSnapshot = this.availableSnapshots.find(s => s.snapshotDate === normalizedNew);
                if (newSnapshot) {
                    this.selectedSnapshot = newSnapshot.snapshotDate;
                    this.snapshotStateService.setCurrentSnapshot(newSnapshot.snapshotDate);
                    this.loadData(newSnapshot.snapshotDate);
                }
            } else {
                // Fallback logic for deletion or generic update
                // Try to keep current selection if it still exists
                const currentStillExists = this.availableSnapshots.find(s => s.snapshotDate === this.selectedSnapshot);

                if (currentStillExists) {
                    // Just reload data for current
                    this.loadData(this.selectedSnapshot);
                } else {
                    // Default to latest
                    const latest = this.availableSnapshots[this.availableSnapshots.length - 1];
                    if (latest) {
                        this.selectedSnapshot = latest.snapshotDate;
                        this.snapshotStateService.setCurrentSnapshot(latest.snapshotDate);
                        this.loadData(latest.snapshotDate);
                    } else {
                        // No snapshots left
                        this.selectedSnapshot = '';
                        this.snapshotStateService.setCurrentSnapshot('');
                        this.summary = {
                            snapshotDate: '',
                            totalDebt: 0,
                            creditCardDebt: 0,
                            personalLoanDebt: 0,
                            autoLoanDebt: 0,
                            totalAccounts: 0
                        };
                        this.allAccounts = [];
                    }
                }
            }

            // Force change detection
            this.cdr.detectChanges();
        });
    }

    trackBySnapshot(index: number, item: any): string {
        return item.snapshotDate;
    }
}
