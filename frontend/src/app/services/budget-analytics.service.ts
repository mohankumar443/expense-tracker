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

export interface BudgetScore {
    score: number;
    status: 'Excellent' | 'Good' | 'Fair' | 'Critical';
    factors: {
        spendingControl: number; // 0-40
        categoryBalance: number; // 0-30
        timing: number; // 0-30
    };
}

export interface Prediction {
    predictedTotal: number;
    dailyAverage: number;
    daysRemaining: number;
    status: 'On Track' | 'At Risk' | 'Over Budget';
    deviation: number; // Amount over/under budget
}

@Injectable({
    providedIn: 'root'
})
export class BudgetAnalyticsService {

    private categoryColors: { [key: string]: string } = {
        'Room Rent': '#a855f7', // purple-500
        'Costco': '#f97316', // orange-500
        'Indian Grocery Stores': '#eab308', // yellow-500
        'Eating Out': '#ef4444', // red-500
        'Walmart/Schnuks': '#3b82f6', // blue-500
        'Hair Cutting': '#ec4899', // pink-500
        'Baby Supplies': '#14b8a6', // teal-500
        'Car Insurance': '#6366f1', // indigo-500
        'Mobile Payment': '#06b6d4', // cyan-500
        'Car EMI': '#8b5cf6', // violet-500
        'Loan EMI': '#d946ef', // fuchsia-500
        'Gas': '#f59e0b', // amber-500
        'Shopping/Clothes/Online Shopping': '#f97316', // orange-500
        'Investments': '#22c55e', // green-500
        'Hospital Bill': '#ef4444', // red-500
        'Car Wash': '#0ea5e9', // sky-500
        'Subscriptions': '#db2777', // pink-600
        'Credit Card Payment': '#f43f5e', // rose-500
        'India Loan Repayment': '#10b981', // emerald-500
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
                    const dates = allExpenses.map(e => {
                        const [y, m, d] = e.date.split('-').map(Number);
                        return new Date(y, m - 1, d).getTime();
                    });
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
                    const [y, m, d] = e.date.split('-').map(Number);
                    const eDate = new Date(y, m - 1, d);
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

    calculateBudgetScore(totalSpent: number, budget: number, expenses: Expense[]): BudgetScore {
        let score = 100;
        const spendingRatio = totalSpent / budget;

        // 1. Spending Control (40 points)
        let spendingControl = 40;
        if (spendingRatio > 1.0) spendingControl = 0;
        else if (spendingRatio > 0.9) spendingControl = 10;
        else if (spendingRatio > 0.75) spendingControl = 25;

        // 2. Category Balance (30 points)
        // Penalize if one category takes up > 50% of budget (excluding Rent/EMI)
        let categoryBalance = 30;
        const breakdown = this.calculateCategoryBreakdown(expenses, totalSpent);
        const dominantCategory = breakdown.find(c => c.percentage > 50 && !['Room Rent', 'Car EMI', 'Loan EMI'].includes(c.category));
        if (dominantCategory) categoryBalance = 10;

        // 3. Timing (30 points) - Simple heuristic: penalties for very late large expenses? 
        // For now, let's base it on transaction count vs total. High frequency small txns vs low frequency big ones.
        // Actually, let's use "Uncategorized" or "Other" as a penalty for data quality.
        let timing = 30;
        const otherSpend = breakdown.find(c => c.category === 'Other')?.amount || 0;
        if (otherSpend > (totalSpent * 0.1)) timing = 15; // Penalty if "Other" is > 10%

        score = spendingControl + categoryBalance + timing;

        let status: 'Excellent' | 'Good' | 'Fair' | 'Critical' = 'Good';
        if (score >= 90) status = 'Excellent';
        else if (score >= 75) status = 'Good';
        else if (score >= 50) status = 'Fair';
        else status = 'Critical';

        return {
            score,
            status,
            factors: { spendingControl, categoryBalance, timing }
        };
    }

    predictMonthEnd(totalSpent: number, budget: number, currentDate: Date): Prediction {
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

        // If viewing a past month, prediction is just the actual
        if (currentDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
            return {
                predictedTotal: totalSpent,
                dailyAverage: totalSpent / 30, // Approx
                daysRemaining: 0,
                status: totalSpent > budget ? 'Over Budget' : 'On Track',
                deviation: totalSpent - budget
            };
        }

        const dayOfMonth = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth;

        // Simple linear projection
        const dailyAverage = totalSpent / dayOfMonth;
        const predictedTotal = isCurrentMonth ? totalSpent + (dailyAverage * daysRemaining) : totalSpent; // Only project if current month

        let status: 'On Track' | 'At Risk' | 'Over Budget' = 'On Track';
        if (predictedTotal > budget) status = 'Over Budget';
        else if (predictedTotal > budget * 0.9) status = 'At Risk';

        return {
            predictedTotal,
            dailyAverage,
            daysRemaining: isCurrentMonth ? daysRemaining : 0,
            status,
            deviation: predictedTotal - budget
        };
    }

    generateInsights(currentMonthExpenses: Expense[], previousMonthExpenses: Expense[], budget: number): Insight[] {
        const insights: Insight[] = [];
        const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // 1. Overspending Alert (Critical)
        if (currentTotal > budget) {
            const over = currentTotal - budget;
            insights.push({
                type: 'warning',
                message: `Over Budget by $${over.toFixed(0)}`,
                details: `You have exceeded your monthly limit of $${budget}.`
            });
        }

        // 2. Month-over-Month Spike
        if (currentTotal > previousTotal * 1.2 && previousTotal > 0) {
            const diff = currentTotal - previousTotal;
            insights.push({
                type: 'warning',
                message: `Spending Spike Detected`,
                details: `Spending is $${diff.toFixed(0)} higher than last month.`
            });
        }

        // 3. Category Insights
        const currentBreakdown = this.calculateCategoryBreakdown(currentMonthExpenses, currentTotal);
        const previousBreakdown = this.calculateCategoryBreakdown(previousMonthExpenses, previousTotal);

        currentBreakdown.forEach(cat => {
            const prevCat = previousBreakdown.find(p => p.category === cat.category);
            if (prevCat && cat.amount > prevCat.amount * 1.5 && cat.amount > 100) {
                insights.push({
                    type: 'info',
                    message: `Unusual ${cat.category} Activity`,
                    details: `You spent 50% more on ${cat.category} than usual.`
                });
            }
        });

        // 4. Prediction Insight
        const prediction = this.predictMonthEnd(currentTotal, budget, new Date()); // Assuming current context
        if (prediction.status === 'Over Budget' && currentTotal < budget) {
            insights.push({
                type: 'info',
                message: 'Projected to Overspend',
                details: `At this pace, you will exceed budget by $${prediction.deviation.toFixed(0)}.`
            });
        }

        return insights;
    }
}
