import { Component, OnInit } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
        'Health': 'bg-teal-500',
        'Other': 'bg-gray-500'
    };

    constructor(private expenseService: ExpenseService) { }

    ngOnInit() {
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
    }
}
