import { Component, OnInit, OnDestroy } from '@angular/core';
import { DebtAccountService, DebtSummary, DebtAccount } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-debt-overview',
    templateUrl: './debt-overview.component.html',
    styleUrls: ['./debt-overview.component.css']
})
export class DebtOverviewComponent implements OnInit {
    Math = Math; // Expose Math to template

    summary: DebtSummary = {
        snapshotDate: '',
        totalDebt: 0,
        creditCardDebt: 0,
        personalLoanDebt: 0,
        autoLoanDebt: 0,
        totalAccounts: 0
    };

    highestInterestAccount: DebtAccount | null = null;
    availableSnapshots: any[] = [];
    selectedSnapshot: string = '';
    allAccounts: DebtAccount[] = [];

    // UI State
    loading = false;
    error = '';
    snapshotSubscription: any;

    // Analytics Data
    interestBreakdown: any;
    payoffTimeline: any;
    nextMonthProjection: any;
    highAprAccounts: DebtAccount[] = [];

    // Extra Payment Calculator
    extraPaymentAmount = 0;
    projectedSavings = 0;
    projectedMonthsSaved = 0;

    // Net Worth
    totalAssets = 0;
    netWorth = 0;

    constructor(
        private debtService: DebtAccountService,
        private snapshotStateService: SnapshotStateService,
        private analyticsService: AnalyticsService
    ) { }

    ngOnInit() {
        this.loadSummary();
        this.loadHighestInterest();
        this.loadSnapshots();

        // Subscribe to snapshot changes
        this.snapshotSubscription = this.snapshotStateService.currentSnapshot$.subscribe(fileName => {
            this.selectedSnapshot = fileName;
            // this.loadSnapshotData(fileName); // Removed redundant call
            // this.loadSnapshotAccounts(fileName); // Removed redundant call
            this.loadData(fileName);
        });
    }

    loadSnapshots() {
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            this.availableSnapshots = snapshots;
            const active = snapshots.find(s => s.isActive);
            if (active) {
                this.selectedSnapshot = active.fileName;
                // Set the initial snapshot in the state service if an active one is found
                this.snapshotStateService.setCurrentSnapshot(active.fileName);
            }
        });
    }

    onSnapshotChange() {
        if (this.selectedSnapshot) {
            this.snapshotStateService.setCurrentSnapshot(this.selectedSnapshot);
        }
    }

    // Removed loadSnapshotData as it was redundant and caused re-subscriptions

    ngOnDestroy() {
        if (this.snapshotSubscription) {
            this.snapshotSubscription.unsubscribe();
        }
    }

    loadData(fileName: string) {
        this.loading = true;
        this.error = '';

        // Load Summary
        this.debtService.getSnapshotSummary(fileName).subscribe({
            next: (data) => {
                this.summary = data;
                this.calculateNetWorth(); // Call calculateNetWorth after summary is loaded
            },
            error: (err) => {
                console.error('Error loading summary', err);
                this.error = 'Failed to load debt summary';
                this.loading = false;
            }
        });

        // Load Accounts & Run Analytics
        this.debtService.getSnapshotAccounts(fileName).subscribe({
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
        this.highAprAccounts = this.analyticsService.getHighAprAccounts(this.allAccounts);

        this.calculateExtraPaymentSavings();
    }

    calculateNetWorth() {
        if (this.summary) {
            this.netWorth = this.analyticsService.calculateNetWorth(this.totalAssets, this.summary.totalDebt);
        }
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
        this.debtService.getDebtSummary().subscribe({
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

    getPercentage(amount: number): number {
        if (!this.summary || this.summary.totalDebt === 0) return 0;
        return (amount / this.summary.totalDebt) * 100;
    }

    isSnapshotChanged(): boolean {
        // Check if current snapshot is different from the default/latest
        return this.selectedSnapshot !== 'debt-snapshot-2025-10.json';
    }
}
