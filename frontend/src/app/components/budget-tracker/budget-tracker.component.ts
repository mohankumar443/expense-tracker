import { Component, OnInit, ViewChild } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { AutoCategorizationService } from '../../services/auto-categorization.service';
import { BudgetAnalyticsService, CategoryBreakdown, Insight, MonthlyStats } from '../../services/budget-analytics.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
    selector: 'app-budget-tracker',
    templateUrl: './budget-tracker.component.html',
    styleUrls: ['./budget-tracker.component.css']
})
export class BudgetTrackerComponent implements OnInit {
    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

    // Data
    allExpenses: Expense[] = [];
    expenses: Expense[] = [];
    currentSnapshotDate: string = '';
    monthlyBudget: number = 2000;
    totalSpent: number = 0;

    // Dashboard State
    activeView: 'dashboard' | 'transactions' | 'analytics' = 'dashboard';
    categoryBreakdown: CategoryBreakdown[] = [];
    monthlyStats: MonthlyStats[] = [];
    insights: Insight[] = [];
    selectedTimeRange: string = '6M';
    timeRanges: string[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'All'];

    // Form
    newExpense: Expense = {
        description: '',
        amount: 0,
        category: 'Grocery',
        date: new Date().toISOString().split('T')[0]
    };
    categories = ['Room rent', 'Grocery', 'Phone bill', 'Insurance', 'Car EMI', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];

    // Charts
    public donutChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        plugins: {
            legend: { position: 'right' }
        }
    };
    public donutChartData: ChartData<'doughnut'> = {
        labels: [],
        datasets: [{ data: [], backgroundColor: [] }]
    };

    public trendChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        elements: {
            line: { tension: 0.4 }
        }
    };
    public trendChartData: ChartData<'line'> = {
        labels: [],
        datasets: [
            { data: [], label: 'Spending', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', fill: true },
            { data: [], label: 'Budget', borderColor: '#10b981', borderDash: [5, 5], fill: false }
        ]
    };

    constructor(
        private expenseService: ExpenseService,
        private snapshotStateService: SnapshotStateService,
        private autoCategorizationService: AutoCategorizationService,
        private analyticsService: BudgetAnalyticsService
    ) { }

    ngOnInit(): void {
        this.snapshotStateService.currentSnapshot$.subscribe(date => {
            this.currentSnapshotDate = date;
            this.filterExpensesAndBudget();
        });
        this.loadExpenses();
    }

    loadExpenses() {
        this.expenseService.getAllExpenses().subscribe(data => {
            this.allExpenses = data;
            this.filterExpensesAndBudget();
        });
    }

    filterExpensesAndBudget() {
        if (!this.currentSnapshotDate) return;

        const snapshotDate = new Date(this.currentSnapshotDate);
        const snapshotMonth = snapshotDate.getMonth();
        const snapshotYear = snapshotDate.getFullYear();

        // 1. Filter current month expenses
        this.expenses = this.allExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === snapshotMonth && expenseDate.getFullYear() === snapshotYear;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 2. Load Budget
        const budgetKey = `monthlyBudget_${snapshotYear}-${snapshotMonth + 1}`;
        const savedBudget = localStorage.getItem(budgetKey);
        this.monthlyBudget = savedBudget ? parseFloat(savedBudget) : 2000;

        // 3. Calculate Totals
        this.calculateTotal();

        // 4. Analytics & Insights
        this.updateAnalytics(snapshotDate);

        // 5. Reset Form Date
        this.resetFormDate(snapshotDate);
    }

    updateAnalytics(currentDate: Date) {
        // Category Breakdown
        this.categoryBreakdown = this.analyticsService.calculateCategoryBreakdown(this.expenses, this.totalSpent);
        this.updateDonutChart();

        // Monthly Trends
        this.updateTrendChart();

        // Insights (Compare with previous month)
        const prevDate = new Date(currentDate);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthExpenses = this.allExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
        });
        this.insights = this.analyticsService.generateInsights(this.expenses, prevMonthExpenses);
    }

    updateDonutChart() {
        this.donutChartData = {
            labels: this.categoryBreakdown.map(c => c.category),
            datasets: [{
                data: this.categoryBreakdown.map(c => c.amount),
                backgroundColor: this.categoryBreakdown.map(c => c.color),
                hoverOffset: 4
            }]
        };
    }

    setTimeRange(range: string) {
        this.selectedTimeRange = range;
        this.updateTrendChart();
    }

    updateTrendChart() {
        this.monthlyStats = this.analyticsService.calculateTrendStats(this.allExpenses, this.selectedTimeRange);
        this.trendChartData = {
            labels: this.monthlyStats.map(s => s.month),
            datasets: [
                { data: this.monthlyStats.map(s => s.totalSpent), label: 'Spending', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', fill: true },
                { data: this.monthlyStats.map(s => s.budget), label: 'Budget', borderColor: '#10b981', borderDash: [5, 5], fill: false }
            ]
        };
    }

    onDescriptionChange(description: string) {
        const category = this.autoCategorizationService.categorize(description);
        if (category) {
            this.newExpense.category = category;
        }
    }

    addExpense() {
        if (this.newExpense.description && this.newExpense.amount > 0) {
            this.expenseService.createExpense(this.newExpense).subscribe(expense => {
                this.allExpenses.unshift(expense);
                this.filterExpensesAndBudget();
                this.resetForm();
            });
        }
    }

    deleteExpense(id: number | undefined) {
        if (id) {
            this.expenseService.deleteExpense(id).subscribe(() => {
                this.allExpenses = this.allExpenses.filter(e => e.id !== id);
                this.filterExpensesAndBudget();
            });
        }
    }

    calculateTotal() {
        this.totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    updateBudget() {
        if (!this.currentSnapshotDate) return;
        const snapshotDate = new Date(this.currentSnapshotDate);
        const budgetKey = `monthlyBudget_${snapshotDate.getFullYear()}-${snapshotDate.getMonth() + 1}`;
        localStorage.setItem(budgetKey, this.monthlyBudget.toString());
        this.filterExpensesAndBudget(); // Recalculate stats
    }

    resetForm() {
        this.newExpense.description = '';
        this.newExpense.amount = 0;
        this.newExpense.category = 'Grocery';
        this.resetFormDate(new Date(this.currentSnapshotDate));
    }

    resetFormDate(snapshotDate: Date) {
        const now = new Date();
        if (now.getMonth() === snapshotDate.getMonth() && now.getFullYear() === snapshotDate.getFullYear()) {
            this.newExpense.date = now.toISOString().split('T')[0];
        } else {
            this.newExpense.date = this.currentSnapshotDate;
        }
    }

    setView(view: 'dashboard' | 'transactions' | 'analytics') {
        this.activeView = view;
    }

    getProgressPercentage(): number {
        if (this.monthlyBudget <= 0) return 0;
        return Math.min((this.totalSpent / this.monthlyBudget) * 100, 100);
    }

    getProgressColor(): string {
        const percentage = this.getProgressPercentage();
        if (percentage < 50) return 'bg-emerald-500';
        if (percentage < 80) return 'bg-yellow-500';
        return 'bg-rose-500';
    }
}
