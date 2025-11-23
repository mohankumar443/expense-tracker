
import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { DebtAccountService, DebtSummary } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';

@Component({
    selector: 'app-progress-tracker',
    templateUrl: './progress-tracker.component.html',
    styleUrls: ['./progress-tracker.component.css']
})
export class ProgressTrackerComponent implements OnInit {
    septemberSummary: DebtSummary | null = null;
    octoberSummary: DebtSummary | null = null;
    showComparison = false;
    Math = Math;

    // Analytics
    projectedDebtFreeDate: Date | null = null;
    totalMonthlyInterest: number = 0;

    // Animation states
    animatedDebtChange: number = 0;
    animatedPercentChange: number = 0;
    animatedInterest: number = 0;

    @Input() septemberSummaryInput: any; // Renamed to avoid conflict with existing property
    @Input() octoberSummaryInput: any; // Renamed to avoid conflict with existing property

    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

    // Chart Data
    public lineChartData: ChartConfiguration['data'] = {
        datasets: [
            {
                data: [65, 59, 80, 81, 56, 55, 40],
                label: 'Interest Projection',
                backgroundColor: 'rgba(148,159,177,0.2)',
                borderColor: 'rgba(148,159,177,1)',
                pointBackgroundColor: 'rgba(148,159,177,1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(148,159,177,0.8)',
                fill: 'origin',
            }
        ],
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July']
    };

    public lineChartOptions: ChartConfiguration['options'] = {
        elements: {
            line: {
                tension: 0.5
            }
        },
        scales: {
            // We use this empty structure as a placeholder for dynamic theming.
            y: {
                position: 'left',
            },
            y1: {
                position: 'right',
                grid: {
                    color: 'rgba(255,0,0,0.3)',
                },
                ticks: {
                    color: 'red'
                }
            }
        },
        plugins: {
            legend: { display: true },
        }
    };

    public lineChartType: ChartType = 'line';

    // Doughnut Chart
    public doughnutChartLabels: string[] = ['Credit Cards', 'Personal Loans', 'Auto Loans'];
    public doughnutChartData: ChartData<'doughnut'> = {
        labels: this.doughnutChartLabels,
        datasets: [
            { data: [350, 450, 100] }
        ]
    };
    public doughnutChartType: ChartType = 'doughnut';

    // Risk Heatmap Data
    highAprAccounts: any[] = [];

    // Payoff Timeline Data
    payoffTimeline: any[] = [];

    constructor(
        private debtService: DebtAccountService,
        private snapshotState: SnapshotStateService
    ) { }

    ngOnInit() {
        this.loadComparison();

        // Reload when snapshot changes
        this.snapshotState.currentSnapshot$.subscribe(() => {
            this.loadComparison();
        });
    }

    loadComparison() {
        // Load summaries
        this.debtService.getSnapshotSummary('2025-09-30').subscribe(data => {
            this.septemberSummary = data;
            this.checkIfBothLoaded();
        });

        this.debtService.getSnapshotSummary('2025-10-31').subscribe(data => {
            this.octoberSummary = data;
            this.checkIfBothLoaded();
        });

        // Load full accounts for October to calculate detailed analytics
        this.debtService.getSnapshotAccounts('2025-10-31').subscribe(accounts => {
            this.calculateAnalytics(accounts);
        });
    }

    calculateAnalytics(accounts: any[]) {
        // 1. Projected Debt Free Date (furthest payoff date)
        let maxDate = 0;
        let totalInterest = 0;

        accounts.forEach(account => {
            // Payoff Date
            if (account.payoffDate) {
                const date = new Date(account.payoffDate).getTime();
                if (date > maxDate) {
                    maxDate = date;
                }
            }

            // Monthly Interest
            if (account.currentBalance && account.apr) {
                totalInterest += (account.currentBalance * account.apr) / 100 / 12;
            }
        });

        this.projectedDebtFreeDate = maxDate > 0 ? new Date(maxDate) : null;
        this.totalMonthlyInterest = totalInterest;

        // Update Charts
        this.updateCharts(accounts);

        // Trigger animations
        this.animateValues();
    }

    updateCharts(accounts: any[]) {
        // 1. Update Doughnut Chart (Category Breakdown)
        let creditCardDebt = 0;
        let personalLoanDebt = 0;
        let autoLoanDebt = 0;

        accounts.forEach(acc => {
            if (acc.accountType === 'Credit Card') creditCardDebt += acc.currentBalance;
            else if (acc.accountType === 'Personal Loan') personalLoanDebt += acc.currentBalance;
            else if (acc.accountType === 'Auto Loan') autoLoanDebt += acc.currentBalance;
        });

        this.doughnutChartData = {
            labels: ['Credit Cards', 'Personal Loans', 'Auto Loans'],
            datasets: [{
                data: [creditCardDebt, personalLoanDebt, autoLoanDebt],
                backgroundColor: ['#3b82f6', '#a855f7', '#10b981'],
                hoverBackgroundColor: ['#2563eb', '#9333ea', '#059669'],
                hoverBorderColor: ['#1e40af', '#7e22ce', '#047857']
            }]
        };

        // 2. Update Risk Heatmap (High APR)
        this.highAprAccounts = accounts
            .filter(acc => acc.apr > 15)
            .sort((a, b) => b.apr - a.apr)
            .slice(0, 4); // Top 4 highest APR

        // 3. Update Payoff Timeline (Mock data for now based on payoff dates)
        this.payoffTimeline = accounts
            .filter(acc => acc.payoffDate)
            .map(acc => ({
                name: acc.name,
                date: new Date(acc.payoffDate),
                amount: acc.currentBalance
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 4);
    }

    animateValues() {
        // Animate Interest
        this.animateValue(0, this.totalMonthlyInterest, 1500, (val) => this.animatedInterest = val);

        // Animate Debt Change (after summaries loaded)
        if (this.septemberSummary && this.octoberSummary) {
            const change = Math.abs(this.getDebtChange());
            this.animateValue(0, change, 1500, (val) => this.animatedDebtChange = val);

            const percent = Math.abs(this.getPercentageChange());
            this.animateValue(0, percent, 1500, (val) => this.animatedPercentChange = val);
        }
    }

    animateValue(start: number, end: number, duration: number, callback: (val: number) => void) {
        const startTime = performance.now();

        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            const current = start + (end - start) * ease;
            callback(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    checkIfBothLoaded() {
        this.showComparison = this.septemberSummary !== null && this.octoberSummary !== null;
        if (this.showComparison) {
            this.animateValues();
        }
    }

    getDebtChange(): number {
        if (!this.septemberSummary || !this.octoberSummary) return 0;
        return this.octoberSummary.totalDebt - this.septemberSummary.totalDebt;
    }

    getPercentageChange(): number {
        if (!this.septemberSummary || !this.octoberSummary || this.septemberSummary.totalDebt === 0) return 0;
        return ((this.octoberSummary.totalDebt - this.septemberSummary.totalDebt) / this.septemberSummary.totalDebt) * 100;
    }

    isImprovement(): boolean {
        return this.getDebtChange() < 0;
    }
}
