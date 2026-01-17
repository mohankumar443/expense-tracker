import { Component, OnInit, computed, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { RetirementStateService, RetirementAccount } from '../../services/retirement-state.service';
import { RetirementPlanResponse } from '../../services/retirement.service';
import { CountUpDirective } from '../../directives/count-up.directive';
import { SliderControlComponent } from '../ui/slider-control/slider-control.component';

@Component({
    selector: 'app-retirement-tracker',
    standalone: true,
    imports: [CommonModule, FormsModule, NgChartsModule, CountUpDirective, SliderControlComponent],
    templateUrl: './retirement-tracker.component.html',
    styleUrls: ['./retirement-tracker.component.scss']
})
export class RetirementTrackerComponent implements OnInit {
    // Inputs from Parent (AppComponent)
    @Input() set profileAge(val: number | null | undefined) {
        if (val) this.service.currentAge.set(val);
    }

    @Input() set profileRetirementAge(val: number | null | undefined) {
        if (val) this.service.targetRetirementAge.set(val);
    }

    // Chart Configuration
    public lineChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
    public lineChartOptions: ChartConfiguration['options'] = {
        elements: { line: { tension: 0.4 } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(100,100,100,0.1)' } },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: true } }
    };

    // Local UI State
    projectionScenario: 'actual' | 'base' = 'actual';
    baseMonthlyContribution = 2600; // Legacy default

    // Early Retirement Calculator State (Networthify)
    earlyRetirementInputs = {
        annualIncome: 120000,
        annualExpenses: 80000,
        currentPortfolio: 0,
        annualReturnPct: 5,
        withdrawalRatePct: 4
    };
    earlyRetirementResult = {
        yearsToRetire: 0,
        savingsRate: 0,
        annualSavings: 0,
        monthlyExpenses: 0,
        monthlySavings: 0,
        targetPortfolio: 0
    };
    earlyRetirementChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
    earlyRetirementChartOptions: ChartConfiguration['options'] = { responsive: true };
    earlyRetirementTableExpanded = false;
    earlyRetirementRows: any[] = [];
    earlyRetirementRowsToShow = 10;
    isGapCardDetailed = false; // Collapsed by default

    // Signals Proxies
    get accounts(): RetirementAccount[] { return this.service.accounts(); }
    get targetRetirementAge(): number { return this.service.targetRetirementAge(); }
    set targetRetirementAge(val: number) { this.service.setTargetAge(val); }
    get targetPortfolioValue(): number { return this.service.targetPortfolioValue(); }
    set targetPortfolioValue(val: number) { this.service.setTargetValue(val); }
    get monthYear(): string { return this.service.monthYear(); }
    set monthYear(val: string) { this.service.setMonthYear(val); }
    get oneTimeAdditions(): number { return this.service.oneTimeAdditions(); }
    set oneTimeAdditions(val: number) { this.service.oneTimeAdditions.set(val); }
    get afterTaxMode(): 'flat' | 'bucketed' | 'custom' { return this.service.afterTaxMode(); }
    set afterTaxMode(val: 'flat' | 'bucketed' | 'custom') { this.service.afterTaxMode.set(val); }
    get flatTaxRate(): number { return this.service.flatTaxRate(); }
    set flatTaxRate(val: number) { this.service.flatTaxRate.set(val); }
    get customTaxRates() { return this.service.customTaxRates(); }
    get response(): RetirementPlanResponse | null { return this.service.response(); }
    get loading(): boolean { return this.service.loading(); }
    get error(): string | null { return this.service.error(); }
    get recommendations() { return this.service.recommendations(); }

    get monteCarloResults() { return this.service.monteCarloResults(); }
    get probabilitySuccess(): number { return this.monteCarloResults?.probabilitySuccess ?? 0; }
    get isSimulationEnabled(): boolean { return this.service.simulationEnabled(); }
    set isSimulationEnabled(val: boolean) { this.service.simulationEnabled.set(val); }

    get previousTotalBalance(): number {
        return this.service.previousSnapshot() ? this.service.previousSnapshot().totalBalance || 0 : 0;
    }

    constructor(public service: RetirementStateService) {
        // Effect to update Chart when data changes
        effect(() => {
            this.generateChartData();
        });

        // Initialize Early Retirement calculator
        effect(() => {
            const total = this.service.totalRetirementBalance();
            if (total > 0 && this.earlyRetirementInputs.currentPortfolio === 0) {
                this.earlyRetirementInputs.currentPortfolio = total;
                this.calculateEarlyRetirement();
            }
        });

        // Effect to trigger Monte Carlo Simulation
        effect(() => {
            // Trigger when response (base data), playground, or enabled changes
            const resp = this.service.response();
            const enabled = this.service.simulationEnabled();
            if (resp && enabled) {
                // We use untracked values inside runSimulation or just let it read signals
                this.service.runSimulation();
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit(): void {
        if (!this.monthYear) {
            const now = new Date();
            this.monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        this.service.loadState(this.monthYear);
    }

    // --- Actions ---

    calculate(force: boolean = false): void {
        if (force) {
            this.service.triggerManualSave();
        }
    }

    resetForm(): void {
        // Stub
    }

    onManualBalanceChange(index: number): void {
        const val = this.accounts[index].balance;
        this.service.updateAccount(index, { balance: val });
    }

    onManualContributionChange(index: number): void {
        const val = this.accounts[index].contribution;
        this.service.updateAccount(index, { contribution: val });
    }

    generateChartData(): void {
        const contribOverride = this.projectionScenario === 'base' ? this.baseMonthlyContribution : undefined;
        const data = this.service.getChartDataPoints(contribOverride);

        // Add Monte Carlo bands if available
        const monteData = this.monteCarloResults;
        const chartDataWithBands = {
            ...data,
            p10: monteData?.p10,
            p90: monteData?.p90
        };

        this.updateChart(chartDataWithBands);
    }

    // --- Playground State ---

    get isPlaygroundActive(): boolean { return this.service.isPlaygroundActive(); }
    get playgroundContribution(): number {
        return this.service.playgroundContribution() ?? this.service.totalContributions();
    }
    get playgroundRetirementAge(): number {
        return this.service.playgroundRetirementAge() ?? this.service.targetRetirementAge();
    }

    onPlaygroundContributionChange(val: number) {
        this.service.playgroundContribution.set(val);
    }

    onPlaygroundAgeChange(val: number) {
        this.service.playgroundRetirementAge.set(val);
    }

    resetPlayground() {
        this.service.playgroundContribution.set(null);
        this.service.playgroundRetirementAge.set(null);
    }

    savePlaygroundToActual() {
        // Implement persistence logic if desired, or just notify user
        alert('Coming soon: Save Scenario functionality');
    }

    // --- View Helpers ---

    formatCurrency(value: number | undefined | null): string {
        if (value === undefined || value === null) return '$0';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }

    formatPercent(value: number | undefined): string {
        if (value === undefined) return '—';
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    getLastUpdatedDisplay(): string {
        const date = this.service.lastSnapshotDate();
        return date ? new Date(date).toLocaleString() : 'Never';
    }

    getFinancialHealthScore(): number {
        return this.service.financialHealthScore();
    }

    get healthScoreDetails() {
        const score = this.getFinancialHealthScore();
        return {
            score,
            action: score < 70 ? 'Needs Attention' : 'Doing Great',
            reasons: ['Savings rate is healthy', 'Portfolio diversification is good']
        };
    }

    getTotalBalance(): number { return this.service.totalBalance(); }
    getTotalContributions(): number { return this.service.totalContributions(); }
    getTotalProjectedBalance(): number { return this.service.totalProjectedBalance(); }

    getAccountMoMChange(type: string): number { return this.service.getAccountMoMChange(type); }
    getAccountMoMChangePercent(type: string): number { return this.service.getAccountMoMChangePercent(type); }
    getTotalMoMChange(): number { return this.service.getTotalMoMChange(); }
    getTotalMoMChangePercent(): number { return this.service.getTotalMoMChangePercent(); }

    getScorecard(type: string): any { return this.service.getScorecard(type); }

    getScorecardNote(scorecard: any): string {
        return scorecard ? (scorecard.note || '') : '';
    }

    getProjectedAccountBalance(type: string): number {
        return this.service.getProjectedAccountBalance(type);
    }

    getRecoveryPlan(type: string): any {
        return this.service.getRecoveryPlan(type);
    }

    getGapMonthlyDelta(): number {
        const required = this.service.consolidatedStatus().requiredMonthly || 0;
        const current = this.service.totalContributions();
        return Math.max(0, required - current);
    }

    getStatusColor(status: string): string { return this.getStatusBadgeColor(status); }

    getStatusBadgeColor(status: string): string {
        switch (status) {
            case 'Ahead': return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400';
            case 'On Track': return 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-400';
            case 'At Risk': return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400';
            case 'Behind': return 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400';
            case 'Slightly Behind': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400';
            default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Ahead': return '🚀';
            case 'On Track': return '✅';
            case 'At Risk': return '⚠️';
            case 'Behind': return '📉';
            case 'Slightly Behind': return '⏱️';
            default: return '❓';
        }
    }

    getGapCardClass(): string {
        const s = this.service.response()?.status || '';
        if (s === 'Ahead') return 'ahead';
        if (s === 'Behind') return 'behind';
        if (s === 'At Risk') return 'at-risk';
        if (s === 'On Track') return 'on-track';
        if (s === 'Slightly Behind') return 'behind';
        return '';
    }

    // --- Legacy Financial Logic ---

    getSafeWithdrawalAmount(): number {
        const total = this.service.totalProjectedBalance() || 0;
        return Math.round((total * 0.04) / 12);
    }

    getAfterTaxWithdrawalMonthly(): number {
        return Math.round(this.getSafeWithdrawalAmount() * 0.85);
    }

    getAfterTaxWithdrawalAnnual(): number {
        return this.getAfterTaxWithdrawalMonthly() * 12;
    }

    getProjectedDiversificationSummary() {
        const total = this.service.totalProjectedBalance();
        return { total, taxFreePercent: 10 };
    }

    getTaxDiversification() {
        return {
            taxFree: { balance: 0, percent: 0 },
            taxDeferred: { balance: 0, percent: 0 },
            taxable: { balance: 0, percent: 0 }
        };
    }

    getTaxDiversificationProjected() { return this.getTaxDiversification(); }

    // --- Early Retirement Calculator ---

    calculateEarlyRetirement(): void {
        const { annualIncome, annualExpenses, currentPortfolio, annualReturnPct, withdrawalRatePct } = this.earlyRetirementInputs;

        const annualSavings = annualIncome - annualExpenses;
        const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;
        const targetPortfolio = annualExpenses / (withdrawalRatePct / 100);

        this.earlyRetirementResult = {
            yearsToRetire: 0,
            savingsRate,
            annualSavings,
            monthlyExpenses: annualExpenses / 12,
            monthlySavings: annualSavings / 12,
            targetPortfolio
        };

        let balance = currentPortfolio;
        let year = 0;
        const rows = [];
        while (balance < targetPortfolio && year < 60) {
            year++;
            const investmentReturn = balance * (annualReturnPct / 100);
            balance += investmentReturn + annualSavings;
            rows.push({
                year,
                income: annualIncome,
                expenses: annualExpenses,
                roi: investmentReturn,
                percentExpensesCovered: (investmentReturn / annualExpenses) * 100,
                netWorthChange: investmentReturn + annualSavings,
                netWorth: balance
            });
        }
        this.earlyRetirementResult.yearsToRetire = year;
        this.earlyRetirementRows = rows;
        this.updateEarlyRetirementChart(rows);
    }

    updateEarlyRetirementChart(rows: any[]): void {
        this.earlyRetirementChartData = {
            labels: rows.map(r => `Year ${r.year}`),
            datasets: [{
                label: 'Net Worth',
                data: rows.map(r => r.netWorth),
                borderColor: '#6366f1',
                tension: 0.4,
                fill: true
            }]
        };
    }

    getEarlyRetirementDisplayedRows(): any[] {
        if (this.earlyRetirementRowsToShow === 0) return this.earlyRetirementRows;
        return this.earlyRetirementRows.slice(0, this.earlyRetirementRowsToShow);
    }

    // --- Internal ---

    private updateChart(data: {
        labels: string[],
        projected: number[],
        target: number[],
        comparison?: number[],
        p10?: number[],
        p90?: number[]
    }) {
        const datasets: any[] = [];

        // Monte Carlo P90 (Top of Band)
        if (data.p90 && data.p90.length > 0) {
            datasets.push({
                label: 'Market High (90th)',
                data: data.p90,
                borderColor: 'rgba(16, 185, 129, 0.1)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                fill: false,
                pointRadius: 0,
                borderWidth: 1,
                order: 10
            });
        }

        // Monte Carlo P10 (Bottom of Band)
        if (data.p10 && data.p10.length > 0) {
            datasets.push({
                label: 'Market Low (10th)',
                data: data.p10,
                borderColor: 'rgba(244, 63, 94, 0.1)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)', // Fill color for between
                fill: '-1', // Fill to previous dataset (p90)
                pointRadius: 0,
                borderWidth: 1,
                order: 11
            });
        }

        datasets.push(
            {
                label: 'Projected Balance',
                data: data.projected,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                order: 1,
                borderWidth: 3
            },
            {
                label: 'Target Path',
                data: data.target,
                borderColor: '#6366f1',
                borderDash: [5, 5],
                fill: false,
                order: 2,
                borderWidth: 2
            }
        );

        // Add Comparison Line (Current Path) if distinct
        if (data.comparison && data.comparison.length > 0) {
            datasets.push({
                label: 'Current Path',
                data: data.comparison,
                borderColor: '#9ca3af', // Gray
                borderDash: [2, 2],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                order: 3
            });
        }

        this.lineChartData = {
            labels: data.labels,
            datasets: datasets
        };
    }

    trackByAccountType(index: number, item: RetirementAccount): string {
        return item.accountType;
    }

    protected Math = Math;
    public previousAccountsMap = {
        has: (type: string) => {
            const prev = this.service.previousSnapshot();
            const prevAcc = prev?.accounts?.find((a: any) => a.accountType === type);
            // Show variance ONLY if there was a non-zero previous balance to compare with
            return (prevAcc?.balance || 0) > 0;
        }
    };
}
