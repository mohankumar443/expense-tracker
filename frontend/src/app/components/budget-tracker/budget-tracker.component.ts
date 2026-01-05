import { Component, OnInit, ViewChild } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { AutoCategorizationService } from '../../services/auto-categorization.service';
import { BudgetAnalyticsService, CategoryBreakdown, Insight, MonthlyStats, BudgetScore, Prediction } from '../../services/budget-analytics.service';
import { RecurringExpenseService, RecurringExpense } from '../../services/recurring-expense.service';
import { DebtAccountService, DebtAccount } from '../../services/debt-account.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

interface TransactionView extends Expense {
    runningTotal: number;
    categoryColor: string;
}

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
    targetDate: Date = new Date();
    monthlyBudget: number = 5000;
    totalSpent: number = 0;

    // New Recurring State
    recurringExpensesList: RecurringExpense[] = [];

    // Dashboard State
    activeView: 'dashboard' | 'transactions' | 'analytics' = 'dashboard';
    categoryBreakdown: CategoryBreakdown[] = [];
    monthlyStats: MonthlyStats[] = [];
    insights: Insight[] = [];
    budgetScore: BudgetScore | null = null;
    prediction: Prediction | null = null;
    selectedTimeRange: string = '1M';
    selectedCashFlowRange: string = '1M';
    timeRanges: string[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'All'];

    // Transaction Filters
    searchTerm: string = '';
    filterCategory: string = 'All';
    filterDateRange: { start: string | null, end: string | null } = { start: null, end: null };
    filterMinAmount: number | null = null;
    filterMaxAmount: number | null = null;
    filteredExpenses: TransactionView[] = [];
    showFilters: boolean = false;
    isEditing: boolean = false;
    editingExpenseId: string | undefined = undefined;
    showAddExpenseModal: boolean = false; // Added missing property
    showSubscriptionForm: boolean = false;
    newSubscription = { name: '', amount: 0 };
    showEMIForm: boolean = false;
    newEMI = { description: '', amount: 0, category: 'Loan EMI' };
    creditCardOptions: string[] = [];

    // Form
    newExpense: any = {
        description: '',
        amount: undefined,
        category: 'Grocery',
        date: new Date().toISOString().split('T')[0],
        cardName: ''
    };
    categories = [
        'Amazon',
        'Baby Supplies',
        'Car EMI',
        'Car Insurance',
        'Car Wash',
        'Costco',
        'Credit Card Payment',
        'Eating Out',
        'Gas',
        'Hair Cutting',
        'Hospital Bill',
        'India Loan Repayment',
        'Indian Grocery Stores',
        'Investments',
        'Loan EMI',
        'Mobile Payment',
        'Other',
        'Room Rent',
        'Shopping/Clothes/Online Shopping',
        'Subscriptions',
        'Walmart/Schnuks'
    ];

    // Category Colors Mapping
    categoryColors: { [key: string]: string } = {};

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

    public leftToSpendChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        plugins: {
            legend: { position: 'right' }
        }
    };
    public leftToSpendChartData: ChartData<'pie'> = {
        labels: ['Spent', 'Remaining'],
        datasets: [{ data: [], backgroundColor: ['#f43f5e', '#10b981'] }]
    };

    public cashFlowChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        plugins: {
            legend: { position: 'top' }
        }
    };
    public cashFlowChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [
            { data: [], label: 'Budget', backgroundColor: '#10b981' },
            { data: [], label: 'Spent', backgroundColor: '#6366f1' }
        ]
    };

    constructor(
        private expenseService: ExpenseService,
        private snapshotStateService: SnapshotStateService,
        private autoCategorizationService: AutoCategorizationService,
        private analyticsService: BudgetAnalyticsService,
        private recurringExpenseService: RecurringExpenseService,
        private debtAccountService: DebtAccountService
    ) { }

    ngOnInit(): void {
        this.snapshotStateService.currentSnapshot$.subscribe(date => {
            this.currentSnapshotDate = date;
            this.filterExpensesAndBudget();
        });
        this.loadExpenses();
        this.loadRecurringExpenses();
        this.loadCreditCardOptions();
    }

    loadRecurringExpenses() {
        this.recurringExpenseService.getAll().subscribe(data => {
            this.recurringExpensesList = data;
        });
    }

    loadCreditCardOptions() {
        this.debtAccountService.getAllDebts().subscribe(accounts => {
            const uniqueNames = new Set(
                accounts
                    .filter(account => account.type === 'CREDIT_CARD')
                    .map(account => account.name?.trim())
                    .filter((name): name is string => !!name)
            );
            this.creditCardOptions = Array.from(uniqueNames).sort((a, b) => a.localeCompare(b));
        });
    }

    getSubscriptions(): RecurringExpense[] {
        return this.recurringExpensesList.filter(e => !e.emi && e.active);
    }

    addSubscription(name: string, amount: number) {
        this.recurringExpenseService.create({
            description: name,
            amount: amount,
            category: 'Subscriptions',
            dayOfMonth: 1, // Defaulting to 1st
            emi: false,
            active: true
        } as RecurringExpense).subscribe(() => {
            this.loadRecurringExpenses();
            // Optional: Trigger processNow if user wants it immediately? 
            // For now just add definition.
        });
    }

    removeSubscription(name: string) {
        // Find ID by description (not ideal but works for unique descriptions)
        const item = this.recurringExpensesList.find(e => e.description === name);
        if (item && item.id) {
            this.recurringExpenseService.delete(item.id).subscribe(() => {
                this.loadRecurringExpenses();
            });
        }
    }

    removeFixedRecurring(name: string) {
        // Reusing same delete logic
        this.removeSubscription(name);
    }

    getTotalRecurring(): number {
        return this.getSubscriptions().reduce((sum, sub) => sum + sub.amount, 0);
    }

    getEMIPayments(): RecurringExpense[] {
        return this.recurringExpensesList.filter(e => e.emi && e.active);
    }

    addEMIPayment(description: string, amount: number, category: string) {
        this.recurringExpenseService.create({
            description: description,
            amount: amount,
            category: category,
            dayOfMonth: 1,
            emi: true,
            active: true
        } as RecurringExpense).subscribe(() => {
            this.loadRecurringExpenses();
        });
    }

    removeEMIPayment(description: string) {
        // Reuse delete logic
        this.removeSubscription(description);
    }

    getTotalEMIFromList(): number {
        return this.getEMIPayments().reduce((sum, emi) => sum + emi.amount, 0);
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
        // Target Date is Next Month
        this.targetDate = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth() + 1, 1);

        const targetMonth = this.targetDate.getMonth();
        const targetYear = this.targetDate.getFullYear();

        // Initialize recurring expenses for the target month
        // Removed as now handled by backend scheduler
        // this.initializeRecurringExpensesForMonth(targetYear, targetMonth);

        // 1. Filter target month expenses
        this.expenses = this.allExpenses.filter(expense => {
            const [y, m, d] = expense.date.split('-').map(Number);
            const expenseDate = new Date(y, m - 1, d);
            return expenseDate.getMonth() === targetMonth && expenseDate.getFullYear() === targetYear;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 2. Load Budget for Target Month
        const budgetKey = `monthlyBudget_${targetYear}-${targetMonth + 1}`;
        const savedBudget = localStorage.getItem(budgetKey);
        this.monthlyBudget = savedBudget ? parseFloat(savedBudget) : 5000;

        // 3. Calculate Totals
        this.calculateTotal();

        // 4. Analytics & Insights
        this.updateAnalytics(this.targetDate);

        // 5. Reset Form Date
        this.resetFormDate(this.targetDate);

        // 6. Apply Filters
        this.applyFilters();
    }

    // Sorting State
    sortColumn: string = 'date';
    sortDirection: 'asc' | 'desc' = 'desc';

    toggleSort(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc'; // Default to desc for new columns
        }
        this.applyFilters();
    }

    applyFilters() {
        // First, filter the expenses
        let filtered = this.expenses.filter(expense => {
            // 1. Search Term (Description or Amount)
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                const matchesDesc = expense.description.toLowerCase().includes(term);
                const matchesAmount = expense.amount.toString().includes(term);
                const matchesCard = (expense.cardName || '').toLowerCase().includes(term);
                if (!matchesDesc && !matchesAmount && !matchesCard) return false;
            }

            // 2. Category Filter
            if (this.filterCategory !== 'All' && expense.category !== this.filterCategory) {
                return false;
            }

            // 3. Amount Range
            if (this.filterMinAmount !== null && expense.amount < this.filterMinAmount) return false;
            if (this.filterMaxAmount !== null && expense.amount > this.filterMaxAmount) return false;

            return true;
        });

        // Calculate running totals (ALWAYS based on Date ASC first)
        let runningTotal = 0;
        const sortedForCalc = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const calculated = sortedForCalc.map(expense => {
            runningTotal += expense.amount;
            return {
                ...expense,
                runningTotal: runningTotal,
                categoryColor: this.getCategoryColor(expense.category)
            };
        });

        // Final Sort for Display
        this.filteredExpenses = calculated.sort((a, b) => {
            const direction = this.sortDirection === 'asc' ? 1 : -1;

            let valueA: any = a[this.sortColumn as keyof TransactionView];
            let valueB: any = b[this.sortColumn as keyof TransactionView];

            // Handle Date comparison specifically
            if (this.sortColumn === 'date') {
                valueA = new Date(a.date).getTime();
                valueB = new Date(b.date).getTime();
            }

            if (valueA < valueB) return -1 * direction;
            if (valueA > valueB) return 1 * direction;

            // Tie-breaker: ID
            const idA = a.id ? a.id.toString() : '';
            const idB = b.id ? b.id.toString() : '';
            return idB.localeCompare(idA) * direction; // Stable secondary sort
        });
    }

    getCategoryColor(category: string): string {
        // Try to find in existing breakdown
        const found = this.categoryBreakdown.find(c => c.category === category);
        if (found) return found.color;

        // Fallback or if not yet calculated
        if (this.categoryColors[category]) return this.categoryColors[category];

        // Generate and save
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'];
        const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = colors[hash % colors.length];
        this.categoryColors[category] = color;
        return color;
    }

    updateAnalytics(currentDate: Date) {
        // Category Breakdown
        this.categoryBreakdown = this.analyticsService.calculateCategoryBreakdown(this.expenses, this.totalSpent);
        this.updateDonutChart();

        // Monthly Trends
        this.updateTrendChart();

        // Amount Left to Spend
        const remaining = Math.max(0, this.monthlyBudget - this.totalSpent);
        this.leftToSpendChartData = {
            labels: ['Spent', 'Remaining'],
            datasets: [{
                data: [this.totalSpent, remaining],
                backgroundColor: ['#f43f5e', '#10b981'],
                hoverOffset: 4
            }]
        };

        // Cash Flow Summary
        this.updateCashFlowChart();

        // Insights (Compare with previous month)
        const prevDate = new Date(currentDate);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthExpenses = this.allExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
        });

        // Use new generateInsights with budget
        this.insights = this.analyticsService.generateInsights(this.expenses, prevMonthExpenses, this.monthlyBudget);

        // Calculate Score & Prediction
        this.budgetScore = this.analyticsService.calculateBudgetScore(this.totalSpent, this.monthlyBudget, this.expenses);
        this.prediction = this.analyticsService.predictMonthEnd(this.totalSpent, this.monthlyBudget, currentDate);
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

    setCashFlowRange(range: string) {
        this.selectedCashFlowRange = range;
        this.updateCashFlowChart();
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

    updateCashFlowChart() {
        const cashFlowStats = this.analyticsService.calculateTrendStats(this.allExpenses, this.selectedCashFlowRange);
        this.cashFlowChartData = {
            labels: cashFlowStats.map(s => s.month),
            datasets: [
                { data: cashFlowStats.map(s => s.budget), label: 'Budget', backgroundColor: '#10b981' },
                { data: cashFlowStats.map(s => s.totalSpent), label: 'Spent', backgroundColor: '#6366f1' }
            ]
        };
    }

    onDescriptionChange(description: string) {
        const category = this.autoCategorizationService.categorize(description);
        if (category) {
            this.newExpense.category = category;
        }
    }



    startEditing(expense: any) {
        this.editingExpenseId = expense.id;
        this.newExpense = { ...expense, date: expense.date.split('T')[0] }; // Format date for input
        this.showAddExpenseModal = true;
    }

    cancelEditing() {
        this.editingExpenseId = undefined;
        this.newExpense = {
            description: '',
            amount: 0,
            category: 'Food', // Default category
            date: new Date().toISOString().split('T')[0],
            cardName: ''
        };
        this.showAddExpenseModal = false;
    }

    saveExpense() {
        if (this.newExpense.description && this.newExpense.amount > 0) {
            const expenseToSave = {
                ...this.newExpense,
                // Ensure amount is number
                amount: parseFloat(this.newExpense.amount.toString())
            };

            if (this.editingExpenseId) {
                // Update
                const updatedExpense = { ...expenseToSave, id: this.editingExpenseId };
                this.expenseService.updateExpense(this.editingExpenseId, updatedExpense).subscribe(() => {
                    this.loadExpenses();
                    this.cancelEditing();
                });
            } else {
                // Create
                this.expenseService.createExpense(expenseToSave).subscribe(() => {
                    this.loadExpenses();
                    this.cancelEditing(); // Reset form
                });
            }
        }
    }

    deleteExpense(id: string | undefined) {
        if (id) {
            this.expenseService.deleteExpense(id).subscribe(() => {
                this.allExpenses = this.allExpenses.filter(e => e.id !== id);
                this.applyFilters();
                this.loadExpenses(); // Reload from server to be sure
            });
        }
    }

    calculateTotal() {
        this.totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    updateBudget() {
        if (!this.targetDate) return;
        const budgetKey = `monthlyBudget_${this.targetDate.getFullYear()}-${this.targetDate.getMonth() + 1}`;
        localStorage.setItem(budgetKey, this.monthlyBudget.toString());
        this.filterExpensesAndBudget(); // Recalculate stats
    }

    resetForm() {
        this.newExpense.description = '';
        this.newExpense.amount = undefined;
        this.newExpense.category = 'Grocery';
        this.newExpense.cardName = '';
        this.resetFormDate(this.targetDate);
    }

    resetFormDate(targetDate: Date) {
        const now = new Date();
        if (now.getMonth() === targetDate.getMonth() && now.getFullYear() === targetDate.getFullYear()) {
            this.newExpense.date = now.toISOString().split('T')[0];
        } else {
            // Set to 1st of target month to avoid timezone issues with simple ISO string conversion
            // Or better, format it as YYYY-MM-DD using local time
            const year = targetDate.getFullYear();
            const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
            const day = '01';
            this.newExpense.date = `${year}-${month}-${day}`;
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

    toggleFilters() {
        this.showFilters = !this.showFilters;
    }

    addExpense() {
        this.saveExpense();
    }

    addEMI() {
        if (this.newEMI.description && this.newEMI.amount > 0) {
            this.addEMIPayment(this.newEMI.description, this.newEMI.amount, this.newEMI.category);
            this.newEMI = { description: '', amount: 0, category: 'Loan EMI' };
            this.showEMIForm = false;
        }
    }

    getEMIAmount(category: string): number {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        const emiExpenses = this.expenses.filter(e =>
            e.category === category &&
            e.date.startsWith(monthKey)
        );

        return emiExpenses.reduce((sum, e) => sum + e.amount, 0);
    }

    getTotalEMI(): number {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        // Get all EMI-related expenses for current month
        const emiExpenses = this.expenses.filter(e =>
            (e.category === 'Car EMI' || e.category === 'Loan EMI') &&
            e.date.startsWith(monthKey)
        );

        return emiExpenses.reduce((sum, e) => sum + e.amount, 0);
    }

    getTotalLoanEMI(): number {
        return this.getEMIAmount('Loan EMI');
    }

    getFilteredTotal(): number {
        return this.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    }

    isFixedRecurringRemoved(name: string): boolean {
        // With new logic, if it's not in the list, it's removed.
        // We can check if it exists in current list
        return !this.recurringExpensesList.some(e => e.description === name);
    }
}
