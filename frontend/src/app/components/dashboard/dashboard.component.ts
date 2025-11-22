import { Component, OnInit } from '@angular/core';
import { ExpenseService, Expense } from '../../services/expense.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    totalExpenses: number = 0;
    transactionCount: number = 0;
    categoryBreakdown: { category: string, amount: number, percentage: number, color: string }[] = [];

    // Map categories to colors for visualization
    private categoryColors: { [key: string]: string } = {
        'Minimum Payment': 'bg-blue-500',
        'Extra Payment': 'bg-green-500',
        'Full Balance': 'bg-emerald-500',
        'Interest Charge': 'bg-red-500',
        'Fee': 'bg-orange-500',
        'Other': 'bg-gray-500'
    };

    constructor(private expenseService: ExpenseService) { }

    ngOnInit() {
        this.expenseService.getExpenses().subscribe(expenses => {
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
    }
}
