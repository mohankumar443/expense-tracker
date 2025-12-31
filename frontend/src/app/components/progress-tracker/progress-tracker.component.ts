
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
    previousMonthSummary: DebtSummary | null = null;
    currentMonthSummary: DebtSummary | null = null;
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

    // Bar Chart (Monthly Change)
    public barChartData: ChartConfiguration['data'] = {
        labels: [],
        datasets: []
    };
    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#94a3b8'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#94a3b8'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.raw as number;
                        return value > 0 ? `Increased by $${value}` : `Decreased by $${Math.abs(value)}`;
                    }
                }
            }
        }
    };
    public barChartType: ChartType = 'bar';

    // Interest Chart (Gradient Bar)
    public interestChartData: ChartConfiguration['data'] = {
        labels: [],
        datasets: []
    };
    public interestChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Interest: $${context.raw}`
                }
            }
        }
    };

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

    // Interest Heatmap Data
    interestHeatmapData: Array<{ month: string, interest: number, color: string }> = [];
    interestRanges: Array<{ label: string, color: string }> = [];
    minInterest: number = 0;
    maxInterest: number = 0;

    // Category Trend Data
    categoryTrendData: Array<{
        name: string,
        color: string,
        currentBalance: number,
        initialBalance: number,
        change: number,
        percentChange: number,
        isImproving: boolean
    }> = [];

    constructor(
        private debtService: DebtAccountService,
        private snapshotState: SnapshotStateService
    ) { }

    ngOnInit() {
        // Subscribe to snapshot changes and load comparison dynamically
        this.snapshotState.currentSnapshot$.subscribe(currentSnapshot => {
            if (currentSnapshot) {
                this.loadComparison(currentSnapshot);
                this.loadInterestHeatmap();
                this.loadCategoryTrends(currentSnapshot);
                this.loadHistoricalCharts();
            }
        });
    }

    loadHistoricalCharts() {
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            if (!snapshots || snapshots.length === 0) return;

            // Sort by date (oldest first)
            const sorted = snapshots.sort((a, b) =>
                new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
            );

            // Filter for last 12 months if needed, for now take all
            const historicalData = sorted;

            // Prepare data arrays
            const labels: string[] = [];
            const totalDebtData: number[] = [];
            const monthlyChangeData: number[] = [];
            const changeColors: string[] = [];

            // Fetch summaries for all snapshots
            const summaryPromises = historicalData.map(s =>
                new Promise<{ date: string, summary: DebtSummary }>((resolve) => {
                    this.debtService.getSnapshotSummary(s.snapshotDate).subscribe(summary => {
                        resolve({ date: s.snapshotDate, summary });
                    });
                })
            );

            Promise.all(summaryPromises).then(results => {
                // Sort results again as Promise.all might not preserve order if requests vary
                results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                results.forEach((item, index) => {
                    // Format date: "Nov '25"
                    const date = new Date(item.date + 'T12:00:00');
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

                    totalDebtData.push(item.summary.totalDebt);

                    // Calculate change from previous month
                    if (index > 0) {
                        const previousDebt = results[index - 1].summary.totalDebt;
                        const change = item.summary.totalDebt - previousDebt;
                        monthlyChangeData.push(change);
                        // Green for decrease (negative change), Red for increase
                        changeColors.push(change <= 0 ? '#10b981' : '#ef4444');
                    } else {
                        monthlyChangeData.push(0); // No change for first month
                        changeColors.push('#94a3b8'); // Gray
                    }
                });

                // Update Total Debt Trend Chart
                this.lineChartData = {
                    labels: labels,
                    datasets: [
                        {
                            data: totalDebtData,
                            label: 'Total Debt',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue fill
                            borderColor: '#3b82f6', // Blue line
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#3b82f6',
                            fill: 'origin',
                            tension: 0.4
                        }
                    ]
                };

                // Update Monthly Change Bar Chart
                this.barChartData = {
                    labels: labels,
                    datasets: [
                        {
                            data: monthlyChangeData,
                            label: 'Monthly Change',
                            backgroundColor: changeColors,
                            hoverBackgroundColor: changeColors,
                            borderRadius: 4
                        }
                    ]
                };
            });
        });
    }

    loadInterestHeatmap() {
        // Load all snapshots and calculate interest for each
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            if (!snapshots || snapshots.length === 0) return;

            // Sort by date (oldest first)
            const sorted = snapshots.sort((a, b) =>
                new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
            );

            // Load accounts for each snapshot and calculate interest
            const heatmapPromises = sorted.map(snapshot => {
                return new Promise<{ month: string, interest: number }>((resolve) => {
                    this.debtService.getSnapshotAccounts(snapshot.snapshotDate).subscribe(accounts => {
                        let totalInterest = 0;
                        accounts.forEach(account => {
                            if (account.currentBalance && account.apr) {
                                totalInterest += (account.currentBalance * account.apr) / 100 / 12;
                            }
                        });
                        resolve({
                            month: new Date(snapshot.snapshotDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                            interest: totalInterest
                        });
                    });
                });
            });

            Promise.all(heatmapPromises).then(data => {
                // Find min and max for color scaling
                const interests = data.map(d => d.interest);
                const minInterest = Math.min(...interests);
                const maxInterest = Math.max(...interests);

                this.minInterest = minInterest;
                this.maxInterest = maxInterest;

                const range = maxInterest - minInterest;

                // Calculate quartiles for legend
                const q1 = minInterest + (range * 0.25);
                const q2 = minInterest + (range * 0.5);
                const q3 = minInterest + (range * 0.75);

                this.interestRanges = [
                    { label: `$${Math.floor(minInterest)} - $${Math.floor(q1)}`, color: '#10b981' },
                    { label: `$${Math.floor(q1)} - $${Math.floor(q2)}`, color: '#84cc16' },
                    { label: `$${Math.floor(q2)} - $${Math.floor(q3)}`, color: '#f59e0b' },
                    { label: `$${Math.floor(q3)} - $${Math.floor(maxInterest)}`, color: '#ef4444' }
                ];

                // Assign colors based on interest amount
                this.interestHeatmapData = data.map(item => ({
                    ...item,
                    color: this.getHeatmapColor(item.interest, minInterest, maxInterest)
                }));

                // Update Interest Chart Data
                this.interestChartData = {
                    labels: data.map(d => d.month),
                    datasets: [{
                        data: data.map(d => d.interest),
                        backgroundColor: this.interestHeatmapData.map(d => d.color),
                        hoverBackgroundColor: this.interestHeatmapData.map(d => d.color),
                        borderRadius: 4,
                        label: 'Monthly Interest'
                    }]
                };
            });
        });
    }

    loadCategoryTrends(currentSnapshotDate: string) {
        // Load all snapshots and calculate category trends
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            if (!snapshots || snapshots.length < 2) return;

            // Sort by date (oldest first)
            const sorted = snapshots.sort((a, b) =>
                new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
            );

            const firstSnapshot = sorted[0];
            const currentSnapshot = sorted.find(s => s.snapshotDate === currentSnapshotDate) || sorted[sorted.length - 1];

            Promise.all([
                new Promise<DebtSummary>((resolve) => {
                    this.debtService.getSnapshotSummary(firstSnapshot.snapshotDate).subscribe(resolve);
                }),
                new Promise<DebtSummary>((resolve) => {
                    this.debtService.getSnapshotSummary(currentSnapshot.snapshotDate).subscribe(resolve);
                })
            ]).then(([initialSummary, currentSummary]) => {
                const categories = [
                    { name: 'Credit Cards', key: 'creditCardDebt', color: '#3b82f6' },
                    { name: 'Personal Loans', key: 'personalLoanDebt', color: '#a855f7' },
                    { name: 'Auto Loans', key: 'autoLoanDebt', color: '#10b981' }
                ] as const;

                this.categoryTrendData = categories.map(category => {
                    const initialBalance = initialSummary[category.key] || 0;
                    const currentBalance = currentSummary[category.key] || 0;
                    const change = currentBalance - initialBalance;
                    const percentChange = initialBalance > 0 ? (change / initialBalance) * 100 : 0;

                    return {
                        name: category.name,
                        color: category.color,
                        currentBalance,
                        initialBalance,
                        change,
                        percentChange,
                        isImproving: change < 0 // Negative change means debt decreased
                    };
                });
            });
        });
    }

    getHeatmapColor(value: number, min: number, max: number): string {
        // Normalize value between 0 and 1
        const normalized = (value - min) / (max - min);

        // Color scale: green (low) -> yellow -> orange -> red (high)
        if (normalized < 0.25) {
            return '#10b981'; // Green
        } else if (normalized < 0.5) {
            return '#84cc16'; // Light green
        } else if (normalized < 0.75) {
            return '#f59e0b'; // Orange
        } else {
            return '#ef4444'; // Red
        }
    }

    loadComparison(currentSnapshotDate?: string) {
        // If no current snapshot provided, try to get all snapshots and use latest
        if (!currentSnapshotDate) {
            this.debtService.getAvailableSnapshots().subscribe(snapshots => {
                if (snapshots && snapshots.length > 0) {
                    // Sort by date to get latest
                    const sorted = snapshots.sort((a, b) =>
                        new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
                    );
                    this.loadComparison(sorted[0].snapshotDate);
                }
            });
            return;
        }

        // Get all available snapshots to find previous month
        this.debtService.getAvailableSnapshots().subscribe(snapshots => {
            if (!snapshots || snapshots.length < 2) {
                this.showComparison = false;
                return;
            }

            // Sort snapshots by date (newest first)
            const sortedSnapshots = snapshots.sort((a, b) =>
                new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
            );

            // Find current snapshot index
            const currentIndex = sortedSnapshots.findIndex(s => s.snapshotDate === currentSnapshotDate);

            if (currentIndex === -1 || currentIndex === sortedSnapshots.length - 1) {
                // Current snapshot not found or it's the oldest one (no previous month)
                this.showComparison = false;
                return;
            }

            // Get current and previous snapshot dates
            const currentDate = sortedSnapshots[currentIndex].snapshotDate;
            const previousDate = sortedSnapshots[currentIndex + 1].snapshotDate;

            // Load current month summary
            this.debtService.getSnapshotSummary(currentDate).subscribe(data => {
                this.currentMonthSummary = data;
                this.checkIfBothLoaded();
            });

            // Load previous month summary
            this.debtService.getSnapshotSummary(previousDate).subscribe(data => {
                this.previousMonthSummary = data;
                this.checkIfBothLoaded();
            });

            // Load full accounts for current month to calculate detailed analytics
            this.debtService.getSnapshotAccounts(currentDate).subscribe(accounts => {
                this.calculateAnalytics(accounts);
            });
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
            .filter(acc => acc.apr > 15 && acc.currentBalance > 0)
            .sort((a, b) => b.apr - a.apr)
            .slice(0, 4); // Top 4 highest APR

        // 3. Update Payoff Timeline (Mock data for now based on payoff dates)
        this.payoffTimeline = accounts
            .filter(acc => acc.payoffDate && acc.currentBalance > 0)
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
        if (this.previousMonthSummary && this.currentMonthSummary) {
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
        this.showComparison = this.previousMonthSummary !== null && this.currentMonthSummary !== null;
        if (this.showComparison) {
            this.animateValues();
        }
    }

    getDebtChange(): number {
        if (!this.previousMonthSummary || !this.currentMonthSummary) return 0;
        return this.currentMonthSummary.totalDebt - this.previousMonthSummary.totalDebt;
    }

    getPercentageChange(): number {
        if (!this.previousMonthSummary || !this.currentMonthSummary || this.previousMonthSummary.totalDebt === 0) return 0;
        return ((this.currentMonthSummary.totalDebt - this.previousMonthSummary.totalDebt) / this.previousMonthSummary.totalDebt) * 100;
    }

    isImprovement(): boolean {
        return this.getDebtChange() < 0;
    }
}
