import { Injectable } from '@angular/core';
import { Expense } from '../models/expense.model';

export interface CategoryBreakdown {
    category: string;
    amount: number;
    percentage: number;
    color: string;
}

export interface MonthlyStats {
    month: string;
    totalSpent: number;
    budget: number;
    isOverBudget: boolean;
}

export interface Insight {
    type: 'warning' | 'success' | 'info';
    message: string;
    details?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BudgetAnalyticsService {

    private categoryColors: { [key: string]: string } = {
        'Room rent': '#a855f7', // purple-500
        'Grocery': '#eab308', // yellow-500
        'Phone bill': '#06b6d4', // cyan-500
        'Insurance': '#6366f1', // indigo-500
        'Car EMI': '#ec4899', // pink-500
        'Food': '#3b82f6', // blue-500
        'Transport': '#22c55e', // green-500
        'Utilities': '#10b981', // emerald-500
        'Entertainment': '#ef4444', // red-500
        'Shopping': '#f97316', // orange-500
        'Health': '#14b8a6', // teal-500
        'Other': '#6b7280' // gray-500
    };

    constructor() { }

    calculateCategoryBreakdown(expenses: Expense[], totalSpent: number): CategoryBreakdown[] {
        const breakdown: { [key: string]: number } = {};
        expenses.forEach(expense => {
            breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
        });

        return Object.keys(breakdown).map(category => ({
            category,
            amount: breakdown[category],
            percentage: totalSpent > 0 ? (breakdown[category] / totalSpent) * 100 : 0,
            color: this.categoryColors[category] || '#6366f1'
        })).sort((a, b) => b.amount - a.amount);
    }

    calculateTrendStats(allExpenses: Expense[], range: string = '6M'): MonthlyStats[] {
        const stats: MonthlyStats[] = [];
        const today = new Date();
        let monthsToCheck = 6;
        let isDaily = false;

        switch (range) {
            case '1M':
                isDaily = true;
                break;
            case '3M':
                monthsToCheck = 3;
                break;
            case '6M':
                monthsToCheck = 6;
                break;
            case 'YTD':
                monthsToCheck = today.getMonth() + 1;
                break;
            case '1Y':
                monthsToCheck = 12;
                break;
            case '3Y':
                monthsToCheck = 36;
                break;
            case '5Y':
                monthsToCheck = 60;
                break;
            case 'All':
                // Find the earliest expense date
                if (allExpenses.length > 0) {
                    const dates = allExpenses.map(e => new Date(e.date).getTime());
                    const minDate = new Date(Math.min(...dates));
                    const diffMonths = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth());
                    monthsToCheck = diffMonths + 1;
                } else {
                    monthsToCheck = 6;
                }
                break;
        }

        if (isDaily) {
            // Daily logic for 1M (Last 30 days)
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayLabel = date.toLocaleDateString('default', { day: 'numeric', month: 'short' });

                const dailyExpenses = allExpenses.filter(e => e.date === dateStr);
                const totalSpent = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

                // For daily, we can estimate daily budget as monthly / 30
                const budgetKey = `monthlyBudget_${date.getFullYear()}-${date.getMonth() + 1}`;
                const savedBudget = localStorage.getItem(budgetKey);
                const monthlyBudget = savedBudget ? parseFloat(savedBudget) : 2000;
                const dailyBudget = monthlyBudget / 30;

                stats.push({
                    month: dayLabel,
                    totalSpent,
                    budget: dailyBudget,
                    isOverBudget: totalSpent > dailyBudget
                });
            }
        } else {
            // Monthly logic for other ranges
            for (let i = 0; i < monthsToCheck; i++) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthName = date.toLocaleString('default', { month: 'short' });
                const year = date.getFullYear();
                const monthIndex = date.getMonth();

                const monthlyExpenses = allExpenses.filter(e => {
                    const eDate = new Date(e.date);
                    return eDate.getMonth() === monthIndex && eDate.getFullYear() === year;
                });

                const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

                // Get budget for that specific month
                const budgetKey = `monthlyBudget_${year}-${monthIndex + 1}`;
                const savedBudget = localStorage.getItem(budgetKey);
                const budget = savedBudget ? parseFloat(savedBudget) : 2000;

                stats.push({
                    month: `${monthName} ${year}`,
                    totalSpent,
                    budget,
                    isOverBudget: totalSpent > budget
                });
            }
            stats.reverse(); // Return chronological order
        }

        return stats;
    }

    generateInsights(currentMonthExpenses: Expense[], previousMonthExpenses: Expense[]): Insight[] {
        const insights: Insight[] = [];
        const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // 1. Overspending Alert
        if (currentTotal > previousTotal && previousTotal > 0) {
            const increase = ((currentTotal - previousTotal) / previousTotal) * 100;
            if (increase > 10) {
                insights.push({
                    type: 'warning',
                    message: `Spending increased by ${increase.toFixed(1)}%`,
                    details: `You spent $${(currentTotal - previousTotal).toFixed(2)} more than last month.`
                });
            }
        } else if (currentTotal < previousTotal && previousTotal > 0) {
            const decrease = ((previousTotal - currentTotal) / previousTotal) * 100;
            if (decrease > 10) {
                insights.push({
                    type: 'success',
                    message: `Great job! Spending down ${decrease.toFixed(1)}%`,
                    details: `You saved $${(previousTotal - currentTotal).toFixed(2)} compared to last month.`
                });
            }
        }

        // 2. Category Spikes
        const currentBreakdown = this.calculateCategoryBreakdown(currentMonthExpenses, currentTotal);
        const previousBreakdown = this.calculateCategoryBreakdown(previousMonthExpenses, previousTotal);

        currentBreakdown.forEach(cat => {
            const prevCat = previousBreakdown.find(p => p.category === cat.category);
            if (prevCat) {
                const diff = cat.amount - prevCat.amount;
                if (diff > 100) { // Threshold: $100 increase
                    insights.push({
                        type: 'warning',
                        message: `${cat.category} spending spiked`,
                        details: `You spent $${diff.toFixed(0)} more on ${cat.category} this month.`
                    });
                }
            }
        });

        // 3. Eating Out Check (Food Category)
        const foodSpend = currentBreakdown.find(c => c.category === 'Food')?.amount || 0;
        if (foodSpend > 500) {
            insights.push({
                type: 'info',
                message: 'Consider cooking more at home',
                details: `Food & Dining expenses are high ($${foodSpend.toFixed(0)}) this month.`
            });
        }

        return insights;
    }
}
