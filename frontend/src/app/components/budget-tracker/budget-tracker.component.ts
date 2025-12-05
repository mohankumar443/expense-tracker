import { Component, OnInit, ViewChild } from '@angular/core';
import { Expense } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { AutoCategorizationService } from '../../services/auto-categorization.service';
import { BudgetAnalyticsService, CategoryBreakdown, Insight, MonthlyStats, BudgetScore, Prediction } from '../../services/budget-analytics.service';
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
    editingExpenseId: number | undefined = undefined;
    showSubscriptionForm: boolean = false;
    newSubscription = { name: '', amount: 0 };
    showEMIForm: boolean = false;
    newEMI = { description: '', amount: 0, category: 'Loan EMI' };

    // Form
    newExpense: any = {
        description: '',
        amount: undefined,
        category: 'Grocery',
        date: new Date().toISOString().split('T')[0]
    };
    categories = [
        'Room Rent',
        'Costco',
        'Indian Grocery Stores',
        'Eating Out',
        'Walmart/Schnuks',
        'Hair Cutting',
        'Baby Supplies',
        'Car Insurance',
        'Mobile Payment',
        'Car EMI',
        'Loan EMI',
        'Gas',
        'Shopping/Clothes/Online Shopping',
        'Investments',
        'Hospital Bill',
        'Car Wash',
        'Subscriptions',
        'Credit Card Payment',
        'India Loan Repayment',
        'Other'
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
        private analyticsService: BudgetAnalyticsService
    ) { }

    ngOnInit(): void {
        this.snapshotStateService.currentSnapshot$.subscribe(date => {
            this.currentSnapshotDate = date;
            this.filterExpensesAndBudget();
        });
        this.loadExpenses();
        this.initializeRecurringExpenses();
    }

    initializeRecurringExpenses() {
        // Check if we've already initialized for this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const lastInitialized = localStorage.getItem('lastRecurringInit');

        if (lastInitialized === monthKey) {
            return; // Already initialized for this month
        }

        // Check which fixed recurring items have been removed
        const removedItems = JSON.parse(localStorage.getItem('removedFixedRecurring') || '[]');

        const recurringExpenses: Array<{ description: string, amount: number, category: string, isRecurring: boolean }> = [];
        // Only add if not removed
        if (!removedItems.includes('Room Rent')) {
            recurringExpenses.push({ description: 'Room Rent', amount: 1168, category: 'Room Rent', isRecurring: true });
        }
        if (!removedItems.includes('Roth IRA Investment')) {
            recurringExpenses.push({ description: 'Roth IRA Investment', amount: 583, category: 'Investments', isRecurring: true });
        }

        // Get subscriptions from localStorage
        const subscriptions = this.getSubscriptions();
        subscriptions.forEach(sub => {
            recurringExpenses.push({
                description: sub.name,
                amount: sub.amount,
                category: 'Subscriptions',
                isRecurring: true
            });
        });

        // Get EMI payments from localStorage
        const emiPayments = this.getEMIPayments();
        emiPayments.forEach(emi => {
            recurringExpenses.push({
                description: emi.description,
                amount: emi.amount,
                category: emi.category,
                isRecurring: true
            });
        });

        const firstDayOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

        // Check if recurring expenses already exist for this month
        this.expenseService.getAllExpenses().subscribe(expenses => {
            let needsInit = false;

            recurringExpenses.forEach(recurring => {
                const exists = expenses.some(e =>
                    e.description === recurring.description &&
                    e.date.startsWith(monthKey) &&
                    e.isRecurring === true
                );

                if (!exists) {
                    needsInit = true;
                    const newExpense = {
                        ...recurring,
                        date: firstDayOfMonth
                    };
                    this.expenseService.createExpense(newExpense).subscribe(() => {
                        this.loadExpenses();
                    });
                }
            });

            // Mark as initialized only if we actually added expenses
            if (needsInit) {
                localStorage.setItem('lastRecurringInit', monthKey);
            }
        });
    }

    getSubscriptions(): Array<{ name: string, amount: number }> {
        const subs = localStorage.getItem('subscriptions');
        return subs ? JSON.parse(subs) : [];
    }

    addSubscription(name: string, amount: number) {
        const subscriptions = this.getSubscriptions();
        subscriptions.push({ name, amount });
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));

        // Add to current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const firstDayOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

        const newExpense = {
            description: name,
            amount: amount,
            category: 'Subscriptions',
            date: firstDayOfMonth,
            isRecurring: true
        };

        this.expenseService.createExpense(newExpense).subscribe(() => {
            this.loadExpenses();
        });
    }

    removeSubscription(name: string) {
        let subscriptions = this.getSubscriptions();
        subscriptions = subscriptions.filter(s => s.name !== name);
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    }

    removeFixedRecurring(name: string) {
        // Delete all expenses with this description that are marked as recurring
        this.expenseService.getAllExpenses().subscribe(expenses => {
            const toDelete = expenses.filter(e =>
                e.description === name && e.isRecurring === true
            );

            toDelete.forEach(expense => {
                if (expense.id) {
                    this.expenseService.deleteExpense(expense.id).subscribe(() => {
                        this.loadExpenses();
                    });
                }
            });
        });

        // Store in localStorage which fixed recurring items have been removed
        const removedItems = JSON.parse(localStorage.getItem('removedFixedRecurring') || '[]');
        if (!removedItems.includes(name)) {
            removedItems.push(name);
            localStorage.setItem('removedFixedRecurring', JSON.stringify(removedItems));
        }
    }

    getTotalRecurring(): number {
        const subscriptions = this.getSubscriptions();
        const subsTotal = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

        // Check which fixed recurring items have been removed
        const removedItems = JSON.parse(localStorage.getItem('removedFixedRecurring') || '[]');
        let roomRent = removedItems.includes('Room Rent') ? 0 : 1168;
        let rothIRA = removedItems.includes('Roth IRA Investment') ? 0 : 583;

        return roomRent + rothIRA + subsTotal; // Room Rent + Roth IRA + Subscriptions
    }

    getEMIPayments(): Array<{ description: string, amount: number, category: string }> {
        const emis = localStorage.getItem('emiPayments');
        return emis ? JSON.parse(emis) : [];
    }

    addEMIPayment(description: string, amount: number, category: string) {
        const emiPayments = this.getEMIPayments();
        emiPayments.push({ description, amount, category });
        localStorage.setItem('emiPayments', JSON.stringify(emiPayments));

        // Add to current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const firstDayOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

        const newExpense = {
            description: description,
            amount: amount,
            category: category,
            date: firstDayOfMonth,
            isRecurring: true
        };

        this.expenseService.createExpense(newExpense).subscribe(() => {
            this.loadExpenses();
        });
    }

    removeEMIPayment(description: string) {
        let emiPayments = this.getEMIPayments();
        emiPayments = emiPayments.filter(e => e.description !== description);
        localStorage.setItem('emiPayments', JSON.stringify(emiPayments));
    }

    getTotalEMIFromList(): number {
        const emiPayments = this.getEMIPayments();
        return emiPayments.reduce((sum, emi) => sum + emi.amount, 0);
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

    applyFilters() {
        // First, filter the expenses
        let filtered = this.expenses.filter(expense => {
            // 1. Search Term (Description or Amount)
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                const matchesDesc = expense.description.toLowerCase().includes(term);
                const matchesAmount = expense.amount.toString().includes(term);
                if (!matchesDesc && !matchesAmount) return false;
            }

            // 2. Category Filter
            if (this.filterCategory !== 'All' && expense.category !== this.filterCategory) {
                return false;
            }

            // 3. Amount Range
            if (this.filterMinAmount !== null && expense.amount < this.filterMinAmount) return false;
            if (this.filterMaxAmount !== null && expense.amount > this.filterMaxAmount) return false;

            // 4. Date Range (Optional - currently we are already filtered by month, but this could be within the month)
            // Keeping it simple for now as we are viewing monthly snapshots.

            return true;
        });

        // Then, calculate running totals (from oldest to newest) and assign colors
        // Since 'filtered' is sorted Newest -> Oldest, we need to reverse it to calc running total, then reverse back
        // Or just iterate backwards
        let runningTotal = 0;
        const result: TransactionView[] = [];

        // We want the running total to reflect the accumulation over time.
        // So for the oldest transaction, runningTotal = its amount.
        // For the next oldest, runningTotal = previous + its amount.

        // Create a copy and sort by date ascending for calculation
        const sortedAsc = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const calculated = sortedAsc.map(expense => {
            runningTotal += expense.amount;
            // Get color from breakdown or generate one
            const color = this.getCategoryColor(expense.category);
            return {
                ...expense,
                runningTotal: runningTotal,
                categoryColor: color
            };
        });

        // Now sort back to Descending for display
        this.filteredExpenses = calculated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

    addExpense() {
        if (this.newExpense.description && this.newExpense.amount > 0) {
            if (this.isEditing && this.editingExpenseId) {
                // Update existing expense
                const updatedExpense = {
                    ...this.newExpense,
                    id: this.editingExpenseId
                };
                this.expenseService.updateExpense(this.editingExpenseId, updatedExpense).subscribe(expense => {
                    const index = this.allExpenses.findIndex(e => e.id === this.editingExpenseId);
                    if (index !== -1) {
                        this.allExpenses[index] = expense;
                    }
                    this.filterExpensesAndBudget();
                    this.cancelEdit();
                });
            } else {
                // Create new expense
                this.expenseService.createExpense(this.newExpense).subscribe(expense => {
                    this.allExpenses.unshift(expense);
                    this.filterExpensesAndBudget();
                    this.resetForm();
                });
            }
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
        if (!this.targetDate) return;
        const budgetKey = `monthlyBudget_${this.targetDate.getFullYear()}-${this.targetDate.getMonth() + 1}`;
        localStorage.setItem(budgetKey, this.monthlyBudget.toString());
        this.filterExpensesAndBudget(); // Recalculate stats
    }

    resetForm() {
        this.newExpense.description = '';
        this.newExpense.amount = undefined;
        this.newExpense.category = 'Grocery';
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

    editExpense(expense: Expense) {
        this.isEditing = true;
        this.editingExpenseId = expense.id;
        this.newExpense = {
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date
        };
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingExpenseId = undefined;
        this.resetForm();
    }

    toggleFilters() {
        this.showFilters = !this.showFilters;
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

    isFixedRecurringRemoved(name: string): boolean {
        const removedItems = JSON.parse(localStorage.getItem('removedFixedRecurring') || '[]');
        return removedItems.includes(name);
    }
}
