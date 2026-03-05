import { Component, OnInit } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';
import { Chart, registerables, ChartConfiguration, ChartOptions } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    private readonly CATEGORY_DONUT_KEY = 'dashboard_category_donut_view';
    totalExpenses: number = 0;
    transactionCount: number = 0;
    categoryBreakdown: { category: string, amount: number, percentage: number, color: string }[] = [];
    monthlyLabels: string[] = [];
    monthlyData: number[] = [];
    showCategoryDonut: boolean = true;
    hoveredCategoryIndex: number | null = null;

    lineChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
    lineChartOptions: ChartOptions<'line'> = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                intersect: false,
                mode: 'index'
            }
        },
        scales: {
            x: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            }
        }
    };

    doughnutData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
    doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        cutout: '70%',
        plugins: {
            legend: { position: 'bottom', labels: { color: '#9CA3AF' } }
        }
    };
    categoryDonutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    };

    barData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
    barOptions: ChartOptions<'bar'> = {
        responsive: true,
        indexAxis: 'y',
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: { color: '#9CA3AF' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            }
        }
    };

    // Map categories to colors for visualization
    private categoryColors: { [key: string]: string } = {
        'Room rent': 'bg-purple-500',
        'Grocery': 'bg-yellow-500',
        'Phone bill': 'bg-cyan-500',
        'Insurance': 'bg-indigo-500',
        'Car EMI': 'bg-pink-500',
        'Food': 'bg-blue-500',
        'Transport': 'bg-green-500',
        'Utilities': 'bg-emerald-500',
        'Entertainment': 'bg-red-500',
        'Shopping': 'bg-orange-500',
        'Amazon': 'bg-amber-500',
        'Health': 'bg-teal-500',
        'Other': 'bg-gray-500'
    };

    constructor(private expenseService: ExpenseService) { }

    ngOnInit() {
        this.restoreCategoryDonutPreference();
        this.expenseService.getAllExpenses().subscribe(expenses => {
            this.calculateStats(expenses);
        });
    }

    calculateStats(expenses: Expense[]) {
        this.totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        this.transactionCount = expenses.length;

        const breakdown: { [key: string]: number } = {};
        expenses.forEach(expense => {
            breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
        });

        this.categoryBreakdown = Object.keys(breakdown).map(category => ({
            category,
            amount: breakdown[category],
            percentage: this.totalExpenses > 0 ? (breakdown[category] / this.totalExpenses) * 100 : 0,
            color: this.categoryColors[category] || 'bg-indigo-500'
        })).sort((a, b) => b.amount - a.amount);

        this.buildMonthlySeries(expenses);
        this.buildCharts();
    }

    private buildMonthlySeries(expenses: Expense[]) {
        const now = new Date();
        const months: { label: string, value: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = date.toLocaleString('default', { month: 'short' });
            months.push({ label, value: 0 });
        }
        expenses.forEach(exp => {
            const d = new Date(exp.date);
            const label = d.toLocaleString('default', { month: 'short' });
            const monthEntry = months.find(m => m.label === label);
            if (monthEntry) {
                monthEntry.value += exp.amount;
            }
        });
        this.monthlyLabels = months.map(m => m.label);
        this.monthlyData = months.map(m => m.value);
    }

    private buildCharts() {
        // Line: monthly spend
        this.lineChartData = {
            labels: this.monthlyLabels,
            datasets: [
                {
                    data: this.monthlyData,
                    label: 'Monthly Spending',
                    fill: true,
                    tension: 0.35,
                    borderColor: '#22d3ee',
                    backgroundColor: 'rgba(34,211,238,0.15)',
                    pointRadius: 3,
                    pointBackgroundColor: '#22d3ee'
                }
            ]
        };

        // Doughnut: top categories share
        const topCats = this.categoryBreakdown.slice(0, 5);
        this.doughnutData = {
            labels: topCats.map(c => c.category),
            datasets: [
                {
                    data: topCats.map(c => c.amount),
                    backgroundColor: ['#22d3ee', '#a855f7', '#f97316', '#10b981', '#eab308'],
                    borderWidth: 0
                }
            ]
        };

        // Bar: top categories amounts
        this.barData = {
            labels: topCats.map(c => c.category),
            datasets: [
                {
                    data: topCats.map(c => c.amount),
                    backgroundColor: '#60a5fa',
                    borderRadius: 6,
                    barThickness: 18
                }
            ]
        };
    }

    toggleCategoryDonut(): void {
        this.showCategoryDonut = !this.showCategoryDonut;
        this.persistCategoryDonutPreference();
    }

    onCategoryDonutHover(event: { active?: unknown[] } | null): void {
        const active = event?.active ?? [];
        const index = (active[0] as { index?: number } | undefined)?.index;
        this.hoveredCategoryIndex = typeof index === 'number' ? index : null;
    }

    getCategoryDonutCenterLabel(): string {
        if (this.hoveredCategoryIndex !== null && this.doughnutData.labels) {
            return this.doughnutData.labels[this.hoveredCategoryIndex] as string;
        }
        return 'Total Spend';
    }

    getCategoryDonutCenterValue(): number {
        const data = (this.doughnutData.datasets[0]?.data || []) as number[];
        if (this.hoveredCategoryIndex !== null && data[this.hoveredCategoryIndex]) {
            return data[this.hoveredCategoryIndex] as number;
        }
        return this.totalExpenses;
    }

    getCategoryDonutCenterPercent(): string {
        if (this.hoveredCategoryIndex === null) return '';
        const data = (this.doughnutData.datasets[0]?.data || []) as number[];
        const value = data[this.hoveredCategoryIndex] || 0;
        const total = data.reduce((sum, item) => sum + item, 0);
        if (!total) return '';
        return `${((value / total) * 100).toFixed(1)}%`;
    }

    private getCategoryDonutPreferenceKey(): string {
        const profileId = localStorage.getItem('activeProfileId') || 'default';
        return `${this.CATEGORY_DONUT_KEY}_${profileId}`;
    }

    private restoreCategoryDonutPreference(): void {
        const stored = localStorage.getItem(this.getCategoryDonutPreferenceKey());
        if (stored === null) {
            this.showCategoryDonut = true;
            return;
        }
        this.showCategoryDonut = stored === 'donut';
    }

    private persistCategoryDonutPreference(): void {
        localStorage.setItem(this.getCategoryDonutPreferenceKey(), this.showCategoryDonut ? 'donut' : 'list');
    }
}
