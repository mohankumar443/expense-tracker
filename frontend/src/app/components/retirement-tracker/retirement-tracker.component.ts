import { Component, OnInit } from '@angular/core';
import { RetirementService, RetirementPlanRequest, RetirementPlanResponse, AccountBalanceDTO } from '../../services/retirement.service';
import { ChartConfiguration } from 'chart.js';

@Component({
    selector: 'app-retirement-tracker',
    templateUrl: './retirement-tracker.component.html',
    styleUrls: ['./retirement-tracker.component.css']
})
export class RetirementTrackerComponent implements OnInit {
    // Fixed profile parameters
    currentAge = 33;
    targetRetirementAge = 50;
    startingBalance = 94000;
    baseMonthlyContribution = 2600;
    targetPortfolioValue = 1270000;
    annualReturn = 7;

    // Form inputs
    monthYear: string = '';
    oneTimeAdditions: number = 0;

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

    constructor(private retirementService: RetirementService) { }

    ngOnInit(): void {
        // Set current month/year
        const now = new Date();
        this.monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Load previous month's data to auto-calculate balances
        this.loadPreviousMonthData();
    }

    loadPreviousMonthData(): void {
        this.retirementService.getLatestSnapshot().subscribe({
            next: (snapshot) => {
                if (snapshot) {
                    if (snapshot.accounts) {
                        // Auto-populate balances from previous month
                        snapshot.accounts.forEach((prevAccount: any) => {
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
                }
            },
            error: (err) => {
                console.log('No previous snapshot found, starting fresh');
            }
        });
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

        this.retirementService.getLatestSnapshot().subscribe({
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

                // Restore target portfolio value if it exists in snapshot
                // REMOVED to prevent overwriting user input during session
                // if (snapshot && snapshot.targetPortfolioValue) {
                //     this.targetPortfolioValue = snapshot.targetPortfolioValue;
                // }
            },
            error: (err) => {
                console.log('Could not auto-calculate balance');
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

    calculate(): void {
        this.loading = true;
        this.error = null;

        const request: RetirementPlanRequest = {
            currentAge: this.currentAge,
            monthYear: this.monthYear,
            currentTotalInvestedBalance: this.getTotalRetirementBalance(), // Only retirement for target calc
            targetPortfolioValue: this.targetPortfolioValue, // Send user defined target
            actualMonthlyContribution: this.getTotalContributions(),
            oneTimeAdditions: this.oneTimeAdditions || undefined,
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
                this.generateChartData();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error calculating retirement plan:', err);
                this.error = 'Failed to calculate retirement plan. Please try again.';
                this.loading = false;
            }
        });
    }

    generateChartData(): void {
        if (!this.response) return;

        const monthsToRetirement = this.response.remainingMonths || 0;
        const labels: string[] = [];
        const targetData: number[] = [];
        const actualData: number[] = [];

        // Generate projection for next 12 months
        for (let i = 0; i <= Math.min(12, monthsToRetirement); i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            // Simple linear projection (can be enhanced)
            const monthlyGrowth = (this.response.currentTargetBalance || 0) / monthsToRetirement;
            targetData.push((this.response.currentTargetBalance || 0) + (monthlyGrowth * i));
            actualData.push((this.response.actualBalance || 0) + (monthlyGrowth * i));
        }

        this.lineChartData = {
            labels,
            datasets: [
                {
                    label: 'Target Path',
                    data: targetData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Actual Path',
                    data: actualData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }
            ]
        };
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
    // Uses PMT formula to account for 7% annual compound growth
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
        // Here FV is the remaining amount needed
        const totalMonthlyContributionNeeded = (remainingNeeded * monthlyRate) / (Math.pow(1 + monthlyRate, monthsToRetirement) - 1);

        // Allocation percentages
        const allocations: { [key: string]: number } = {
            '401k': 0.50,      // 50% to 401k
            'Roth IRA': 0.20,  // 20% to Roth IRA
            'HSA': 0.15,       // 15% to HSA
            'Brokerage': 0.15  // 15% to Brokerage
        };

        return Math.round((totalMonthlyContributionNeeded * (allocations[accountType] || 0)) * 100) / 100;
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
