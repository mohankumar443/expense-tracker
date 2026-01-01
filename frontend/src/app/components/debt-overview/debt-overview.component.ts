import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { fadeIn, slideInUp, staggerFadeIn } from '../../animations';
import { DebtAccountService, DebtSummary, DebtAccount } from '../../services/debt-account.service';
import { RetirementService } from '../../services/retirement.service';
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
        private compareStateService: CompareStateService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        // Initial data loading is handled after snapshots are loaded.
        // Removed premature loadSummary call to avoid empty snapshot requests.
        this.loadHighestInterest();
        this.compareSnapshotDate = localStorage.getItem(this.COMPARE_STORAGE_KEY) || '';
        this.compareSelectionPrimary = localStorage.getItem(this.COMPARE_PRIMARY_KEY) || '';
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
                    this.previousSummary = data;
                },
                error: (err) => console.error('Error loading previous summary', err)
            });
            this.debtService.getSnapshotAccounts(previousDate).subscribe({
                next: (accounts) => {
                    this.previousAccounts = accounts;
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
        this.retirementService.getSnapshotByDate(resolvedDate).subscribe({
            next: (snapshot) => {
                if (snapshot) {
                    this.retirementCurrent = this.getRetirementTotal(snapshot);
                    this.calculateNetWorth();
                    return;
                }
                this.retirementService.getSnapshotByMonth(currentMonthYear).subscribe({
                    next: (fallback) => {
                        this.retirementCurrent = this.getRetirementTotal(fallback);
                        this.calculateNetWorth();
                    },
                    error: () => {
                        this.retirementCurrent = 0;
                        this.calculateNetWorth();
                    }
                });
            },
            error: () => {
                this.retirementService.getSnapshotByMonth(currentMonthYear).subscribe({
                    next: (fallback) => {
                        this.retirementCurrent = this.getRetirementTotal(fallback);
                        this.calculateNetWorth();
                    },
                    error: () => {
                        this.retirementCurrent = 0;
                        this.calculateNetWorth();
                    }
                });
            }
        });

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
        } else {
            this.compareSnapshotDate = '';
            this.compareSelectionBaseline = '';
            this.compareSummary = null;
            this.compareLabel = '';
            localStorage.removeItem(this.COMPARE_STORAGE_KEY);
            localStorage.removeItem(this.COMPARE_PRIMARY_KEY);
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
        this.showCompareModal = false;
    }

    clearCompare() {
        this.compareSnapshotDate = '';
        this.compareSelectionBaseline = '';
        this.compareSummary = null;
        this.compareLabel = '';
        localStorage.removeItem(this.COMPARE_STORAGE_KEY);
        localStorage.removeItem(this.COMPARE_PRIMARY_KEY);
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

        const highApr = this.analyticsService.getHighAprAccounts(this.allAccounts, 1);
        this.highestInterestAccount = highApr.length > 0 ? highApr[0] : null;
        this.interestBreakdown = this.analyticsService.calculateInterestBreakdown(this.allAccounts);
        this.payoffTimeline = this.analyticsService.calculatePayoffTimeline(this.allAccounts, this.extraPaymentAmount);
        this.nextMonthProjection = this.analyticsService.projectNextMonth(this.allAccounts);

        // Get ALL high APR accounts for the priority list
        this.highAprAccounts = this.analyticsService.getHighAprAccounts(this.allAccounts, -1);

        this.calculateExtraPaymentSavings();
    }

    togglePriorities() {
        this.showAllPriorities = !this.showAllPriorities;
    }

    getVisiblePriorities(): DebtAccount[] {
        if (this.showAllPriorities) {
            return this.highAprAccounts;
        }
        return this.highAprAccounts.slice(0, 3);
    }

    calculateNetWorth() {
        if (this.summary) {
            this.netWorth = this.analyticsService.calculateNetWorth(this.totalAssets, this.summary.totalDebt);
        }
    }

    private getRetirementTotal(snapshot: any): number {
        if (!snapshot) return 0;
        if (snapshot.totalBalance !== undefined && snapshot.totalBalance !== null) {
            return snapshot.totalBalance || 0;
        }
        if (snapshot.accounts && Array.isArray(snapshot.accounts)) {
            return snapshot.accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
        }
        return 0;
    }

    onAssetsChange() {
        localStorage.setItem('debt_tracker_assets', this.totalAssets.toString());
        this.calculateNetWorth();
    }

    calculateExtraPaymentSavings() {
        if (this.extraPaymentAmount > 0) {
            const baseline = this.analyticsService.calculatePayoffTimeline(this.allAccounts, 0);
            const withExtra = this.analyticsService.calculatePayoffTimeline(this.allAccounts, this.extraPaymentAmount);

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
        this.payoffTimeline = this.analyticsService.calculatePayoffTimeline(this.allAccounts, this.extraPaymentAmount);
    }

    getTotalMonthlyInterest(): number {
        return this.interestBreakdown ? this.interestBreakdown.total : 0;
    }

    getTotalMinPayment(): number {
        if (!this.allAccounts || this.allAccounts.length === 0) {
            return 0;
        }
        return this.allAccounts.reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getPreviousTotalMinPayment(): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        return this.previousAccounts.reduce((total, account) => total + (account.monthlyPayment || 0), 0);
    }

    getPreviousTotalMonthlyInterest(): number {
        if (!this.previousAccounts || this.previousAccounts.length === 0) {
            return 0;
        }
        const breakdown = this.analyticsService.calculateInterestBreakdown(this.previousAccounts);
        return breakdown.total || 0;
    }

    getMinPaymentDelta(): number {
        return this.getTotalMinPayment() - this.getPreviousTotalMinPayment();
    }

    getInterestDelta(): number {
        return this.getTotalMonthlyInterest() - this.getPreviousTotalMonthlyInterest();
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
