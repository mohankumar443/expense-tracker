import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { RetirementService, RetirementPlanRequest, RetirementPlanResponse, AccountBalanceDTO } from '../../services/retirement.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { ToastService } from '../../services/toast.service';
import { ChartConfiguration } from 'chart.js';

@Component({
    selector: 'app-retirement-tracker',
    templateUrl: './retirement-tracker.component.html',
    styleUrls: ['./retirement-tracker.component.css']
})
export class RetirementTrackerComponent implements OnInit, OnChanges {
    @Input() profileAge: number | null = null;
    @Input() profileRetirementAge: number | null = null;
    private hasLoadedSnapshot = false;
    lastSnapshotDate: string | null = null;
    // Fixed profile parameters
    currentAge = 33;
    targetRetirementAge = 50;
    startingBalance = 94000;
    baseMonthlyContribution = 2600;
    targetPortfolioValue = 1270000;
    annualReturn = 7;
    previousTotalBalance = 0;
    previousAccountsMap: Map<string, any> = new Map();

    healthScoreDetails: any = { score: 50, reasons: [], action: '' };

    // Form inputs
    monthYear: string = '';
    oneTimeAdditions: number = 0;
    afterTaxMode: 'flat' | 'bucketed' | 'custom' = 'bucketed';
    flatTaxRate = 20;
    customTaxRates = {
        taxFree: 0,
        taxDeferred: 22,
        taxable: 15
    };
    projectionScenario: 'base' | 'actual' = 'actual';

    // Account balances and contributions
    accounts: any[] = [
        { accountType: '401k', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
        { accountType: 'Roth IRA', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
        { accountType: 'HSA', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
        { accountType: 'Brokerage', goalType: 'RETIREMENT', balance: 0, contribution: 0 }
    ];

    // Track if balance was manually edited to prevent auto-overwrite
    isManualBalance: boolean[] = [false, false, false, false];

    // Response data
    response: RetirementPlanResponse | null = null;
    loading = false;
    error: string | null = null;

    // Chart data
    lineChartData: ChartConfiguration<'line'>['data'] = {
        labels: [],
        datasets: []
    };

    lineChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: false, ticks: { callback: (value) => `$${(+value).toLocaleString()}` } }
        }
    };
    Math = Math;

    constructor(
        private retirementService: RetirementService,
        private snapshotStateService: SnapshotStateService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.snapshotStateService.currentSnapshot$.subscribe(date => {
            if (date) {
                this.monthYear = date.substring(0, 7);
                if (date.length >= 10) {
                    this.loadSnapshotForDate(date);
                } else {
                    this.loadSnapshotForMonth(this.monthYear);
                }
            } else {
                const now = new Date();
                this.monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                this.loadPreviousMonthData();
            }
        });
    }

    loadSnapshotForDate(date: string): void {
        this.loading = true;
        this.retirementService.getSnapshotByDate(date).subscribe({
            next: (snapshot) => {
                if (snapshot && this.hasRetirementData(snapshot)) {
                    this.populateFromSnapshot(snapshot);
                } else if (this.monthYear) {
                    this.loadSnapshotForMonth(this.monthYear);
                } else {
                    this.loadPreviousMonthData();
                }
                this.loading = false;
            },
            error: () => {
                if (this.monthYear) {
                    this.loadSnapshotForMonth(this.monthYear);
                } else {
                    this.loadPreviousMonthData();
                }
                this.loading = false;
            }
        });
    }

    loadSnapshotForMonth(monthYear: string): void {
        this.loading = true;
        this.retirementService.getSnapshotByMonth(monthYear).subscribe({
            next: (snapshot) => {
                if (snapshot && this.hasRetirementData(snapshot)) {
                    this.populateFromSnapshot(snapshot);
                } else {
                    // If no snapshot for this month, carry over from latest to avoid starting at $0
                    this.loadPreviousMonthData();
                }
                this.loading = false;
            },
            error: (err) => {
                this.loadPreviousMonthData();
                this.loading = false;
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        const nextAge = this.profileAge ?? this.currentAge;
        const nextRetireAge = this.profileRetirementAge ?? this.targetRetirementAge;
        this.currentAge = nextAge;
        this.targetRetirementAge = nextRetireAge;
        if (changes['profileAge'] || changes['profileRetirementAge']) {
            const hasData = this.getTotalBalance() > 0 || this.getTotalContributions() > 0 || !!this.response;
            if (this.hasLoadedSnapshot && hasData) {
                this.calculate(false);
            }
        }
    }

    loadPreviousMonthData(): void {
        this.retirementService.getAllSnapshots().subscribe({
            next: (snapshots) => {
                if (snapshots && snapshots.length > 0) {
                    // Find the latest snapshot that is BEFORE the current monthYear
                    const currentMonthDate = new Date(`${this.monthYear}-01`);
                    const previousSnapshots = snapshots
                        .filter(s => new Date(s.snapshotDate) < currentMonthDate)
                        .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());

                    if (previousSnapshots.length > 0) {
                        this.populateFromSnapshot(previousSnapshots[0]);
                    } else {
                        this.hasLoadedSnapshot = true;
                    }
                } else {
                    this.hasLoadedSnapshot = true;
                }
            },
            error: (err) => {
                console.log('No previous snapshot found, starting fresh');
                this.hasLoadedSnapshot = true;
            }
        });
    }

    private populateFromSnapshot(snapshot: any): void {
        if (!snapshot) return;

        if (snapshot.accounts) {
            this.previousTotalBalance = snapshot.totalBalance || 0;
            // Auto-populate balances from previous month
            snapshot.accounts.forEach((prevAccount: any) => {
                this.previousAccountsMap.set(prevAccount.accountType, prevAccount);
                const currentAccount = this.accounts.find(acc => acc.accountType === prevAccount.accountType);
                if (currentAccount) {
                    // Set balance to previous balance (will be updated when user enters contribution)
                    currentAccount.balance = prevAccount.balance || 0;
                }
            });
        }

        // Restore persisted target value
        if (snapshot.targetPortfolioValue) {
            this.targetPortfolioValue = snapshot.targetPortfolioValue;
        }

        if (snapshot.totalContributions !== undefined) {
            this.accounts.forEach(account => {
                const prevAccount = snapshot.accounts?.find((acc: any) => acc.accountType === account.accountType);
                if (prevAccount && prevAccount.contribution !== undefined) {
                    account.contribution = prevAccount.contribution || 0;
                }
            });
        }

        if (snapshot.oneTimeAdditions !== undefined && snapshot.oneTimeAdditions !== null) {
            this.oneTimeAdditions = snapshot.oneTimeAdditions;
        }

        if (snapshot.afterTaxMode) {
            this.afterTaxMode = snapshot.afterTaxMode;
        }
        if (snapshot.flatTaxRate !== undefined && snapshot.flatTaxRate !== null) {
            this.flatTaxRate = snapshot.flatTaxRate;
        }
        if (snapshot.taxFreeRate !== undefined && snapshot.taxDeferredRate !== undefined && snapshot.taxableRate !== undefined) {
            this.customTaxRates = {
                taxFree: snapshot.taxFreeRate,
                taxDeferred: snapshot.taxDeferredRate,
                taxable: snapshot.taxableRate
            };
        }

        if (snapshot.snapshotDate) {
            this.lastSnapshotDate = snapshot.snapshotDate;
        }

        // Trigger calculation to update Score, Chart, and Strategy immediately
        this.hasLoadedSnapshot = true;
        this.calculate(false);
    }

    private hasRetirementData(snapshot: any): boolean {
        if (!snapshot) return false;
        if ((snapshot.totalBalance || 0) > 0) return true;
        if ((snapshot.totalContributions || 0) > 0) return true;
        if (!snapshot.accounts) return false;
        return snapshot.accounts.some((acc: any) => (acc.balance || 0) > 0 || (acc.contribution || 0) > 0);
    }

    // Called when user manually edits a balance
    onManualBalanceChange(index: number): void {
        this.isManualBalance[index] = true;
    }

    // Auto-calculate balance when contribution changes
    updateBalance(accountIndex: number): void {
        // If user has manually edited this balance, do not overwrite it
        if (this.isManualBalance[accountIndex]) {
            return;
        }

        if (!this.monthYear) return;

        // Calculate previous month
        const [year, month] = this.monthYear.split('-').map(Number);
        const prevDate = new Date(year, month - 2, 1); // month is 1-indexed in split, but 0-indexed in Date constructor. month-2 gives previous month.
        const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        this.retirementService.getSnapshotByMonth(prevMonthYear).subscribe({
            next: (snapshot) => {
                if (snapshot && snapshot.accounts) {
                    const prevAccount = snapshot.accounts.find((acc: any) =>
                        acc.accountType === this.accounts[accountIndex].accountType
                    );
                    if (prevAccount) {
                        // Auto-calculate: Previous Balance + New Contribution
                        this.accounts[accountIndex].balance =
                            (prevAccount.balance || 0) + (this.accounts[accountIndex].contribution || 0);
                    }
                }
            },
            error: (err) => {
                console.log('Could not auto-calculate balance - no previous month found');
            }
        });
    }

    getTotalBalance(): number {
        return this.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    }

    getTotalRetirementBalance(): number {
        return this.accounts
            .filter(acc => acc.goalType === 'RETIREMENT')
            .reduce((sum, acc) => sum + (acc.balance || 0), 0);
    }

    getTotalContributions(): number {
        return this.accounts.reduce((sum, acc) => sum + (acc.contribution || 0), 0);
    }

    getLastUpdatedDisplay(): string {
        if (this.lastSnapshotDate) {
            const parsed = new Date(this.lastSnapshotDate);
            if (!isNaN(parsed.getTime())) {
                return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
        if (this.monthYear) {
            const parsed = new Date(`${this.monthYear}-01`);
            if (!isNaN(parsed.getTime())) {
                return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
        }
        return '—';
    }

    getScorecard(accountType: string) {
        return this.response?.accountScorecard?.find((s: any) => s.accountType === accountType);
    }

    getAccountMoMChange(accountType: string): number {
        const current = this.accounts.find(a => a.accountType === accountType)?.balance || 0;
        const previous = this.previousAccountsMap.get(accountType)?.balance || 0;
        return current - previous;
    }

    getAccountMoMChangePercent(accountType: string): number {
        const diff = this.getAccountMoMChange(accountType);
        const previous = this.previousAccountsMap.get(accountType)?.balance || 0;
        if (previous === 0) return 0;
        return (diff / previous) * 100;
    }

    getTotalMoMChange(): number {
        return this.getTotalBalance() - this.previousTotalBalance;
    }

    getTotalMoMChangePercent(): number {
        const diff = this.getTotalMoMChange();
        if (this.previousTotalBalance === 0) return 0;
        return (diff / this.previousTotalBalance) * 100;
    }

    calculate(persistSnapshot: boolean = true): void {
        this.loading = true;
        this.error = null;

        const request: RetirementPlanRequest = {
            currentAge: this.currentAge,
            monthYear: this.monthYear,
            currentTotalInvestedBalance: this.getTotalRetirementBalance(), // Only retirement for target calc
            targetPortfolioValue: this.targetPortfolioValue, // Send user defined target
            actualMonthlyContribution: this.getTotalContributions(),
            oneTimeAdditions: this.oneTimeAdditions || undefined,
            afterTaxMode: this.afterTaxMode,
            flatTaxRate: this.flatTaxRate,
            taxFreeRate: this.customTaxRates.taxFree,
            taxDeferredRate: this.customTaxRates.taxDeferred,
            taxableRate: this.customTaxRates.taxable,
            persistSnapshot: persistSnapshot,
            accounts: this.accounts.map(acc => ({
                accountType: acc.accountType,
                goalType: acc.goalType,
                balance: acc.balance || 0,
                contribution: acc.contribution || 0
            }))
        };

        this.retirementService.evaluatePlan(request).subscribe({
            next: (data) => {
                this.response = data;
                this.updateFinancialHealthScore();
                this.generateChartData();
                this.loading = false;
                if (persistSnapshot) {
                    this.toastService.show('Balances saved.', 'success');
                }
            },
            error: (err) => {
                console.error('Error calculating retirement plan:', err);
                this.error = 'Failed to calculate retirement plan. Please try again.';
                this.loading = false;
                this.toastService.show('Failed to save balances.', 'error');
            }
        });
    }

    generateChartData(): void {
        if (!this.response) return;

        const monthsToRetirement = this.response.remainingMonths || 0;
        const labels: string[] = [];
        const targetData: number[] = [];
        const projectedData: number[] = []; // Changed from 'actualData' to 'projectedData' for clarity

        const currentBalance = this.response.actualBalance || 0;
        const targetValue = this.targetPortfolioValue;
        const monthlyContribution = this.projectionScenario === 'base'
            ? this.baseMonthlyContribution
            : this.getTotalContributions();

        // 7% Annual Return -> Monthly Rate
        const monthlyRate = 0.07 / 12;

        // Plot points: Every 12 months (1 Year) to avoid clutter, or every month if short duration
        const step = monthsToRetirement > 24 ? 12 : 1;

        for (let i = 0; i <= monthsToRetirement; i += step) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            // 1. Projected Path (Compound Interest)
            // FV = PV * (1+r)^n + PMT * [ ((1+r)^n - 1) / r ]
            const growthFactor = Math.pow(1 + monthlyRate, i);
            let futureValue = currentBalance * growthFactor;
            if (monthlyRate > 0) {
                futureValue += monthlyContribution * ((growthFactor - 1) / monthlyRate);
            }
            projectedData.push(Math.round(futureValue));

            // 2. Target Path (Geometric Interpolation)
            // Shows the ideal "Glide Path" from status quo to target
            // Formula: Start * (Goal/Start)^(t/T)
            if (currentBalance > 0 && targetValue > 0) {
                const progressResult = currentBalance * Math.pow((targetValue / currentBalance), (i / monthsToRetirement));
                targetData.push(Math.round(progressResult));
            } else {
                // Fallback linear if start is 0
                targetData.push((targetValue / monthsToRetirement) * i);
            }
        }

        this.lineChartData = {
            labels,
            datasets: [
                {
                    label: 'Flight Path (Forecast)',
                    data: projectedData,
                    borderColor: '#10b981', // Emerald Green
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Target Trajectory',
                    data: targetData,
                    borderColor: '#6366f1', // Indigo
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }
            ]
        };
    }

    getStrategyRecommendation(): string {
        // Simple logic to guide the user's next dollar
        // Limits (2025 estimates): Roth ~7000, HSA ~4150

        const roth = this.accounts.find(a => a.accountType === 'Roth IRA');
        const hsa = this.accounts.find(a => a.accountType === 'HSA');

        // Monthly run-rate approximation
        const rothMonthly = roth?.contribution || 0;
        const hsaMonthly = hsa?.contribution || 0;

        if (rothMonthly < 583) { // ~7000 / 12
            return "💡 <strong>Tip:</strong> Prioritize maxing out your <strong>Roth IRA</strong> first (Limit: ~$583/mo). Tax-free growth is powerful!";
        }
        if (hsaMonthly < 345) { // ~4150 / 12
            return "💡 <strong>Tip:</strong> Your Roth is strong! Next, max out your <strong>HSA</strong> (~$345/mo) for triple-tax benefits.";
        }
        return "🚀 <strong>Superb!</strong> You are maxing key buckets. Any extra funds should go to your <strong>401k</strong> or <strong>Brokerage</strong>.";
    }

    // --- NEW: Withdrawal & Scoring Logic ---

    getSafeWithdrawalAmount(): number {
        // 4% Rule: Annual Withdrawal = 4% of Portfolio
        // Monthly = Annual / 12
        // We use the TARGET value to show the goal state
        return (this.targetPortfolioValue * 0.04) / 12;
    }

    getAfterTaxWithdrawalMonthly(): number {
        const grossMonthly = this.getSafeWithdrawalAmount();
        const taxRate = this.getEffectiveTaxRate();
        return grossMonthly * (1 - taxRate);
    }

    getAfterTaxWithdrawalAnnual(): number {
        return this.getAfterTaxWithdrawalMonthly() * 12;
    }

    private getEffectiveTaxRate(): number {
        if (this.afterTaxMode === 'flat') {
            return Math.min(1, Math.max(0, this.flatTaxRate / 100));
        }

        const projected = this.getTaxDiversificationProjected();
        const total = projected.taxFree.balance + projected.taxDeferred.balance + projected.taxable.balance;
        if (total <= 0) return 0;

        const rates = this.afterTaxMode === 'custom'
            ? this.customTaxRates
            : { taxFree: 0, taxDeferred: 22, taxable: 15 };

        const taxFreeShare = projected.taxFree.balance / total;
        const taxDeferredShare = projected.taxDeferred.balance / total;
        const taxableShare = projected.taxable.balance / total;

        const effectiveRate =
            (taxFreeShare * (rates.taxFree / 100)) +
            (taxDeferredShare * (rates.taxDeferred / 100)) +
            (taxableShare * (rates.taxable / 100));

        return Math.min(1, Math.max(0, effectiveRate));
    }

    getFinancialHealthScore(): number {
        return this.healthScoreDetails.score;
    }


    getTaxDiversification(): {
        taxFree: { balance: number, percent: number },
        taxDeferred: { balance: number, percent: number },
        taxable: { balance: number, percent: number }
    } {
        const roth = this.accounts.find(a => a.accountType === 'Roth IRA')?.balance || 0;
        const hsa = this.accounts.find(a => a.accountType === 'HSA')?.balance || 0;
        // 401k is typically Pre-Tax (Tax-Deferred)
        const traditional = this.accounts.find(a => a.accountType === '401k')?.balance || 0;
        // Brokerage is Taxable (Capital Gains)
        const taxable = this.accounts.find(a => a.accountType === 'Brokerage')?.balance || 0;

        const total = roth + hsa + traditional + taxable;

        // Helper to safe calc percent
        const calc = (val: number) => total === 0 ? 0 : (val / total) * 100;

        return {
            taxFree: { balance: roth + hsa, percent: calc(roth + hsa) },
            taxDeferred: { balance: traditional, percent: calc(traditional) },
            taxable: { balance: taxable, percent: calc(taxable) }
        };
    }

    getTaxDiversificationProjected(): {
        taxFree: { balance: number, percent: number },
        taxDeferred: { balance: number, percent: number },
        taxable: { balance: number, percent: number }
    } {
        const project = (balance: number, contribution: number) => this.projectBalance(balance, contribution);

        const roth = this.accounts.find(a => a.accountType === 'Roth IRA');
        const hsa = this.accounts.find(a => a.accountType === 'HSA');
        const traditional = this.accounts.find(a => a.accountType === '401k');
        const taxableAccount = this.accounts.find(a => a.accountType === 'Brokerage');

        const taxFreeProjected = project(roth?.balance || 0, roth?.contribution || 0)
            + project(hsa?.balance || 0, hsa?.contribution || 0);
        const taxDeferredProjected = project(traditional?.balance || 0, traditional?.contribution || 0);
        const taxableProjected = project(taxableAccount?.balance || 0, taxableAccount?.contribution || 0);

        const total = taxFreeProjected + taxDeferredProjected + taxableProjected;
        const calc = (val: number) => total === 0 ? 0 : (val / total) * 100;

        return {
            taxFree: { balance: taxFreeProjected, percent: calc(taxFreeProjected) },
            taxDeferred: { balance: taxDeferredProjected, percent: calc(taxDeferredProjected) },
            taxable: { balance: taxableProjected, percent: calc(taxableProjected) }
        };
    }

    getProjectedAccountBalance(accountType: string): number {
        const account = this.accounts.find(acc => acc.accountType === accountType);
        return this.projectBalance(account?.balance || 0, account?.contribution || 0);
    }

    getProjectedDiversificationSummary(): { total: number; taxFreePercent: number } {
        const projected = this.getTaxDiversificationProjected();
        const total = projected.taxFree.balance + projected.taxDeferred.balance + projected.taxable.balance;
        return { total, taxFreePercent: projected.taxFree.percent };
    }

    getGapMonthlyDelta(): number | null {
        if (!this.response) return null;
        if (this.response.status !== 'Slightly Behind' && this.response.status !== 'Behind') return null;
        if (!this.response.requiredMonthlyContribution) return null;
        const delta = this.response.requiredMonthlyContribution - this.getTotalContributions();
        return delta > 0 ? delta : 0;
    }

    private projectBalance(balance: number, contribution: number): number {
        const monthsToRetirement = Math.max(0, Math.round((this.targetRetirementAge - this.currentAge) * 12));
        const monthlyRate = (this.annualReturn / 100) / 12;
        if (monthsToRetirement <= 0) return balance;
        if (monthlyRate === 0) return balance + (contribution * monthsToRetirement);
        const growthFactor = Math.pow(1 + monthlyRate, monthsToRetirement);
        return (balance * growthFactor) + (contribution * ((growthFactor - 1) / monthlyRate));
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'Ahead': return 'text-green-600 dark:text-green-400';
            case 'On Track': return 'text-cyan-600 dark:text-cyan-400';
            case 'Slightly Behind': return 'text-orange-600 dark:text-orange-400';
            case 'Behind': return 'text-red-600 dark:text-red-400';
            case 'Leading': return 'text-green-600 dark:text-green-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    }

    getStatusBadgeColor(status: string): string {
        switch (status) {
            case 'Ahead': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            case 'On Track': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';
            case 'On Plan': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';
            case 'Slightly Behind': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
            case 'Behind': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
            case 'Leading': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Ahead': return '🚀';
            case 'On Track': return '✅';
            case 'On Plan': return '✅';
            case 'Slightly Behind': return '⚠️';
            case 'Behind': return '🔴';
            case 'Leading': return '⭐';
            default: return '📊';
        }
    }

    formatCurrency(value: number | null | undefined): string {
        if (value === null || value === undefined) return '$0';
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatPercent(value: number | null | undefined): string {
        if (value === null || value === undefined) return '0%';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }

    get retirementScorecards(): any[] {
        return this.response?.accountScorecard?.filter((s: any) => s.goalType === 'RETIREMENT') || [];
    }

    // Calculate monthly contribution target for each account based on target portfolio value
    // Uses 2025 IRS Limits + Waterfall Strategy (Roth -> HSA -> 401k -> Brokerage)
    getContributionTarget(accountType: string): number {
        const monthsToRetirement = (this.targetRetirementAge - this.currentAge) * 12;
        if (monthsToRetirement <= 0) return 0;

        const annualRate = this.annualReturn / 100; // 7% from class property
        const monthlyRate = annualRate / 12;

        const currentBalance = this.getTotalBalance();

        // Future Value of Current Balance: PV * (1+r)^n
        const futureValueOfCurrent = currentBalance * Math.pow(1 + monthlyRate, monthsToRetirement);

        // Remaining amount needed from new contributions
        const remainingNeeded = this.targetPortfolioValue - futureValueOfCurrent;

        if (remainingNeeded <= 0) return 0; // Already on track with just growth

        // PMT Formula: P = (FV * r) / ((1 + r)^n - 1)
        const totalMonthlyNeeded = (remainingNeeded * monthlyRate) / (Math.pow(1 + monthlyRate, monthsToRetirement) - 1);

        // --- IRS LIMITS (2025) ---
        // 401k: $23,500
        // Roth IRA: $7,000
        // HSA: $4,150 (Individual)
        const LIMIT_401K = 23500 / 12;
        const LIMIT_ROTH = 7000 / 12;
        const LIMIT_HSA = 4150 / 12;

        // --- Waterfall Distribution Strategy ---
        // Priority: Roth (Tax Free) -> HSA (Triple Tax) -> 401k (Pre-Tax) -> Brokerage (Overflow)

        let remainingToAllocate = totalMonthlyNeeded;

        // 1. Fill Roth IRA
        const rothAlloc = Math.min(remainingToAllocate, LIMIT_ROTH);
        if (accountType === 'Roth IRA') return rothAlloc;
        remainingToAllocate -= rothAlloc;

        // 2. Fill HSA
        const hsaAlloc = Math.min(remainingToAllocate, LIMIT_HSA);
        if (accountType === 'HSA') return hsaAlloc;
        remainingToAllocate -= hsaAlloc;

        // 3. Fill 401k
        const k401Alloc = Math.min(remainingToAllocate, LIMIT_401K);
        if (accountType === '401k') return k401Alloc;
        remainingToAllocate -= k401Alloc;

        // 4. Fill Brokerage (Unlimited overflow)
        if (accountType === 'Brokerage') return Math.max(0, remainingToAllocate);

        return 0;
    }

    getContributionStatus(contribution: number, target: number): string {
        if (contribution >= target) return 'reached';
        if (contribution >= target * 0.8) return 'close';
        return 'behind';
    }

    getContributionStatusColor(status: string): string {
        switch (status) {
            case 'reached': return 'text-green-600 dark:text-green-400';
            case 'close': return 'text-orange-600 dark:text-orange-400';
            case 'behind': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    }

    getContributionStatusIcon(status: string): string {
        switch (status) {
            case 'reached': return '✅';
            case 'close': return '⚠️';
            case 'behind': return '🔴';
            default: return '📊';
        }
    }

    updateFinancialHealthScore(): void {
        if (!this.response) return;

        let score = 75; // Baseline
        const reasons: string[] = ['Baseline Score: 75/100'];
        let action = '';

        // 1. Plan Adherence (Are you on track?)
        const diffPercent = this.response.differencePercent || 0;
        if (diffPercent >= 0) {
            const boost = Math.min(20, diffPercent * 2);
            score += boost;
            reasons.push(`✅ On Track / Ahead of Plan (+${Math.round(boost)})`);
        } else {
            const penalty = Math.min(20, Math.abs(diffPercent) * 2);
            score -= penalty;
            reasons.push(`❌ Behind Target Savings (-${Math.round(penalty)})`);
            action = "Increase your portfolio balance or reduce target age.";
        }

        // 2. Monthly Contribution (Are you saving enough?)
        const currentContrib = this.getTotalContributions();
        const required = this.response.requiredMonthlyContribution || 0;
        const totalIRSMax = (23500 + 7000 + 4150) / 12; // ~2887

        if (currentContrib >= required) {
            score += 5;
            reasons.push(`✅ Meeting Monthly Requirements (+5)`);
        } else {
            reasons.push(`⚠️ Below Monthly Target (+0)`);
            if (!action) action = `Increase monthly contributions by ${this.formatCurrency(required - currentContrib)} to stay on track.`;
        }

        // 3. Tax Efficiency Bonus
        const taxDiv = this.getTaxDiversification();
        if (taxDiv.taxFree.percent > 10) {
            score += 5;
            reasons.push(`✅ Good Tax Diversification (>10% Tax-Free) (+5)`);
        }

        // 4. "Path to 100" Action Check
        if (score < 100 && !action) {
            if (currentContrib < totalIRSMax) {
                action = "Maximize your tax-advantaged accounts (Roth/HSA/401k) to reach 100.";
            } else {
                action = "You are doing great! Maintain consistency.";
            }
        }

        this.healthScoreDetails = {
            score: Math.round(Math.max(0, Math.min(100, score))),
            reasons: reasons,
            action: action || "Keep up the good work!"
        };
    }

    resetForm(): void {
        // Only reset contributions and one-time additions
        // Keep balances since they're carried from previous month
        this.accounts.forEach(account => {
            account.contribution = 0;
        });
        this.oneTimeAdditions = 0;
        this.response = null;
        this.error = null;
    }
}
