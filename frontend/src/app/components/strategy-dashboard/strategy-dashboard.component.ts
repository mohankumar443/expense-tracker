import { Component, OnInit } from '@angular/core';
import { DebtAccountService, DebtAccount } from '../../services/debt-account.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-strategy-dashboard',
    templateUrl: './strategy-dashboard.component.html',
    styleUrls: ['./strategy-dashboard.component.css']
})
export class StrategyDashboardComponent implements OnInit {

    accounts: DebtAccount[] = [];
    loading = true;
    currentSnapshotDate: string | null = null;

    // Metrics
    dangerScore: { score: number, category: string, details: any } = { score: 0, category: 'Excellent', details: {} };
    payoffTrap: { years: number, totalInterest: number } = { years: 0, totalInterest: 0 };

    // What-If Simulator
    extraPayment = 0;
    simulatedSavings: { months: number, interestSaved: number } = { months: 0, interestSaved: 0 };

    constructor(
        private debtService: DebtAccountService,
        private analyticsService: AnalyticsService,
        private snapshotState: SnapshotStateService
    ) { }

    ngOnInit(): void {
        this.snapshotState.currentSnapshot$.subscribe(snapshotDate => {
            if (snapshotDate) {
                this.loadData(snapshotDate);
            } else {
                // Fallback to latest if no snapshot selected (or handle appropriately)
                this.debtService.getAllDebts().subscribe(accounts => {
                    this.currentSnapshotDate = null;
                    this.processData(accounts);
                });
            }
        });
    }

    loadData(date: string) {
        this.loading = true;
        this.currentSnapshotDate = date;
        this.debtService.getSnapshotAccounts(date).subscribe(accounts => {
            this.processData(accounts);
            this.loading = false;
        });
    }

    processData(accounts: DebtAccount[]) {
        this.accounts = accounts;

        // Calculate Danger Score
        this.dangerScore = this.analyticsService.calculateDangerScore(accounts);

        // Calculate Minimum Payment Trap
        this.payoffTrap = this.analyticsService.calculateMinimumPaymentTrap(accounts);

        // Populate Interest Burning Chart
        const sortedByInterest = [...accounts].sort((a, b) => {
            const interestA = (a.currentBalance * (a.apr / 100)) / 12;
            const interestB = (b.currentBalance * (b.apr / 100)) / 12;
            return interestB - interestA;
        });

        this.topMoneyLeaks = sortedByInterest.slice(0, 3);
        this.highInterestRiskAccounts = accounts
            .filter(a => a.currentBalance > 0)
            .sort((a, b) => (b.apr || 0) - (a.apr || 0))
            .slice(0, 3);

        this.interestBurningChartData = {
            labels: sortedByInterest.map(a => a.name),
            datasets: [{
                data: sortedByInterest.map(a => Math.round((a.currentBalance * (a.apr / 100)) / 12)),
                backgroundColor: sortedByInterest.map(a => {
                    // Gradient-like coloring based on APR intensity
                    if (a.apr > 25) return '#f43f5e'; // Rose-500
                    if (a.apr > 20) return '#f97316'; // Orange-500
                    if (a.apr > 15) return '#eab308'; // Yellow-500
                    return '#10b981'; // Emerald-500
                }),
                borderRadius: 6,
                barThickness: 20
            }]
        };

        // Calculate Milestones
        const currentTotalDebt = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
        // In a real app, fetch initial debt from the first snapshot. 
        // For now, assume initial was 10% higher if current is the only data point, or use a fixed value.
        // Better: Use the max debt seen in history if available, or just current + paid off amount.
        // Let's estimate initial debt as current debt / 0.9 for demo purposes if we don't have history.
        if (this.initialTotalDebt < currentTotalDebt) this.initialTotalDebt = currentTotalDebt * 1.1;

        const paidOff = this.initialTotalDebt - currentTotalDebt;
        const progressPercent = (paidOff / this.initialTotalDebt) * 100;

        this.milestones = {
            current: Math.floor(progressPercent),
            next: Math.ceil(progressPercent / 25) * 25, // Next 25% milestone
            progress: progressPercent
        };
        if (this.milestones.next === 0) this.milestones.next = 25;

        // Initial Simulation (+$0)
        this.simulate();
    }

    // Interest Burning Chart
    public interestBurningChartData: any = {
        labels: [],
        datasets: []
    };
    public interestBurningChartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
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
                backgroundColor: '#1e293b',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1,
                callbacks: {
                    label: (context: any) => `Monthly Interest: $${context.raw}`
                }
            }
        }
    };
    public interestBurningChartType: any = 'bar';

    // Money Leaks
    topMoneyLeaks: DebtAccount[] = [];
    highInterestRiskAccounts: DebtAccount[] = [];

    // Milestones
    milestones: { current: number, next: number, progress: number } = { current: 0, next: 0, progress: 0 };
    initialTotalDebt = 150000; // Example initial debt, should be fetched from history

    // Strategy Comparison
    strategyComparison: { snowball: any, avalanche: any } = { snowball: {}, avalanche: {} };

    // Future Debt Projection Chart
    public projectionChartData: any = { datasets: [] };
    public projectionChartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point: { radius: 0, hitRadius: 10, hoverRadius: 5 },
            line: { tension: 0.4 }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', callback: (val: any) => '$' + val / 1000 + 'k' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', maxTicksLimit: 6 }
            }
        },
        plugins: {
            legend: { display: true, labels: { color: '#cbd5e1' } },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1,
                callbacks: {
                    label: (context: any) => `${context.dataset.label}: $${Math.round(context.raw).toLocaleString()}`
                }
            }
        }
    };
    public projectionChartType: any = 'line';

    simulate() {
        // Safety check: if no accounts, set default values
        if (!this.accounts || this.accounts.length === 0) {
            this.simulatedSavings = { months: 0, interestSaved: 0 };
            this.strategyComparison = {
                snowball: { months: 0, years: 0, payoffDate: new Date(), totalInterestPaid: 0 },
                avalanche: { months: 0, years: 0, payoffDate: new Date(), totalInterestPaid: 0 }
            };
            return;
        }

        const result: any = this.analyticsService.simulatePayoff(this.accounts, this.extraPayment);
        this.simulatedSavings = {
            months: result.months,
            interestSaved: result.interestSaved
        };

        // Calculate Strategy Comparison
        this.strategyComparison = this.analyticsService.compareStrategies(this.accounts, this.extraPayment);

        // Populate Projection Chart
        const labels = result.baselineTimeline.map((p: any) => {
            const d = new Date(p.date);
            return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        this.projectionChartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Current Path',
                    data: result.baselineTimeline.map((p: any) => p.balance),
                    borderColor: '#94a3b8', // Slate-400
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    borderDash: [5, 5],
                    fill: true
                },
                {
                    label: 'New Path',
                    data: result.timeline.map((p: any) => p.balance),
                    borderColor: '#10b981', // Emerald-500
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                }
            ]
        };
    }

    onSliderChange(event: any) {
        this.extraPayment = Number(event.target.value);
        this.simulate();
    }
}
