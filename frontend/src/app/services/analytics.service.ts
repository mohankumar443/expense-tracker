import { Injectable } from '@angular/core';
import { DebtAccount } from './debt-account.service';

export interface InterestBreakdown {
    creditCards: number;
    personalLoans: number;
    autoLoans: number;
    total: number;
}

export interface PayoffProjection {
    months: number;
    years: number;
    payoffDate: Date;
    totalInterestPaid: number;
}

export interface CategoryPayoff {
    creditCards: PayoffProjection;
    personalLoans: PayoffProjection;
    autoLoans: PayoffProjection;
    overall: PayoffProjection;
}

export interface NextMonthProjection {
    projectedBalance: number;
    projectedInterest: number;
    principalPaid: number;
    balanceReduction: number;
}

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {

    constructor() { }

    calculateInterestBreakdown(accounts: DebtAccount[]): InterestBreakdown {
        const breakdown = {
            creditCards: 0,
            personalLoans: 0,
            autoLoans: 0,
            total: 0
        };

        accounts.forEach(acc => {
            const monthlyInterest = (acc.currentBalance * (acc.apr / 100)) / 12;

            if (acc.type === 'CREDIT_CARD') {
                breakdown.creditCards += monthlyInterest;
            } else if (acc.type === 'PERSONAL_LOAN') {
                breakdown.personalLoans += monthlyInterest;
            } else if (acc.type === 'AUTO_LOAN') {
                breakdown.autoLoans += monthlyInterest;
            }
            breakdown.total += monthlyInterest;
        });

        return breakdown;
    }

    calculatePayoffTimeline(accounts: DebtAccount[], extraPayment: number = 0): CategoryPayoff {
        // Group accounts
        const creditCards = accounts.filter(a => a.type === 'CREDIT_CARD');
        const personalLoans = accounts.filter(a => a.type === 'PERSONAL_LOAN');
        const autoLoans = accounts.filter(a => a.type === 'AUTO_LOAN');

        return {
            creditCards: this.calculateGroupPayoff(creditCards, extraPayment), // Apply extra payment to highest APR (Avalanche)
            personalLoans: this.calculateGroupPayoff(personalLoans, 0),
            autoLoans: this.calculateGroupPayoff(autoLoans, 0),
            overall: this.calculateGroupPayoff(accounts, extraPayment)
        };
    }

    compareStrategies(accounts: DebtAccount[], extraPayment: number): { snowball: PayoffProjection, avalanche: PayoffProjection } {
        return {
            snowball: this.calculateGroupPayoff(accounts, extraPayment, 'SNOWBALL'),
            avalanche: this.calculateGroupPayoff(accounts, extraPayment, 'AVALANCHE')
        };
    }

    private calculateGroupPayoff(accounts: DebtAccount[], extraPayment: number, strategy: 'AVALANCHE' | 'SNOWBALL' = 'AVALANCHE'): PayoffProjection & { timeline: { date: Date, balance: number }[] } {
        if (accounts.length === 0) {
            return { months: 0, years: 0, payoffDate: new Date(), totalInterestPaid: 0, timeline: [] };
        }

        // Deep copy to simulate without modifying original
        let simulatedAccounts = accounts.map(a => ({ ...a }));
        let totalInterestPaid = 0;
        let months = 0;
        const maxMonths = 360; // Cap at 30 years to prevent infinite loops

        const timeline: { date: Date, balance: number }[] = [];
        let currentTotalBalance = simulatedAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
        timeline.push({ date: new Date(), balance: currentTotalBalance });

        while (simulatedAccounts.some(a => a.currentBalance > 0) && months < maxMonths) {
            months++;
            let monthlyExtraAvailable = extraPayment;

            // Sort based on strategy, ensuring active accounts come first
            simulatedAccounts.sort((a, b) => {
                // Move paid off accounts to the bottom
                if (a.currentBalance <= 0 && b.currentBalance > 0) return 1;
                if (a.currentBalance > 0 && b.currentBalance <= 0) return -1;
                if (a.currentBalance <= 0 && b.currentBalance <= 0) return 0;

                // Then sort by strategy
                if (strategy === 'AVALANCHE') {
                    return b.apr - a.apr; // Highest APR first
                } else {
                    return a.currentBalance - b.currentBalance; // Lowest Balance first
                }
            });

            simulatedAccounts.forEach(acc => {
                if (acc.currentBalance <= 0) return;

                const interest = (acc.currentBalance * (acc.apr / 100)) / 12;
                totalInterestPaid += interest;

                let payment = acc.monthlyPayment || (acc.currentBalance * 0.02); // Fallback min payment
                if (payment < 25) payment = 25; // Min $25 rule

                // Add extra payment if available
                // Since we iterate in priority order (due to sort), the first active account gets the extra payment.
                // If it pays off, the remainder is returned to monthlyExtraAvailable for the next account.
                if (monthlyExtraAvailable > 0) {
                    payment += monthlyExtraAvailable;
                    monthlyExtraAvailable = 0; // Temporarily assume used
                }

                // Cap payment at balance + interest
                const maxNeeded = acc.currentBalance + interest;
                if (payment > maxNeeded) {
                    const unused = payment - maxNeeded;
                    payment = maxNeeded;

                    // If we overpaid, the remainder flows to the next account (Snowball/Avalanche effect)
                    // We add it back to the pool for the next iteration in this loop
                    monthlyExtraAvailable += unused;
                }

                const principal = payment - interest;
                acc.currentBalance -= principal;

                if (acc.currentBalance < 0.01) acc.currentBalance = 0;
            });

            currentTotalBalance = simulatedAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + months);
            timeline.push({ date: futureDate, balance: currentTotalBalance });
        }

        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + months);

        return {
            months,
            years: parseFloat((months / 12).toFixed(1)),
            payoffDate,
            totalInterestPaid,
            timeline
        };
    }

    projectNextMonth(accounts: DebtAccount[]): NextMonthProjection {
        let totalBalance = 0;
        let totalInterest = 0;
        let totalPayment = 0;

        accounts.forEach(acc => {
            if (acc.currentBalance <= 0) return;

            totalBalance += acc.currentBalance;
            const interest = (acc.currentBalance * (acc.apr / 100)) / 12;
            totalInterest += interest;

            let payment = acc.monthlyPayment || 0;
            totalPayment += payment;
        });

        const principalPaid = totalPayment - totalInterest;
        const projectedBalance = totalBalance - principalPaid;

        return {
            projectedBalance,
            projectedInterest: totalInterest,
            principalPaid,
            balanceReduction: principalPaid
        };
    }

    getHighAprAccounts(accounts: DebtAccount[], limit: number = 3): DebtAccount[] {
        const sorted = accounts
            .filter(a => a.currentBalance > 0)
            .sort((a, b) => b.apr - a.apr);

        if (limit === -1) {
            return sorted;
        }

        return sorted.slice(0, limit);
    }

    // --- Advanced Analytics ---

    calculateDangerScore(accounts: DebtAccount[], monthlyIncome: number = 5000): { score: number, category: string, details: any } {
        if (!accounts.length) return { score: 0, category: 'Excellent', details: {} };

        let totalDebt = 0;
        let totalLimit = 0;
        let weightedAprSum = 0;
        let totalMinPayment = 0;

        accounts.forEach(acc => {
            totalDebt += acc.currentBalance;
            // specific logic for credit cards to get limit if available, else assume 100% utilization for loans
            if (acc.type === 'CREDIT_CARD') {
                // Assuming we might have limit in the future, for now estimate or use balance
                // If we don't have limit, we can't calculate utilization accurately.
                // Let's use a proxy: High APR usually means high risk.
            }
            weightedAprSum += acc.apr * acc.currentBalance;
            totalMinPayment += acc.monthlyPayment || (acc.currentBalance * 0.02);
        });

        const avgApr = totalDebt > 0 ? weightedAprSum / totalDebt : 0;

        // 1. APR Score (0-100, where 100 is bad)
        // > 25% APR is critical (100), < 5% is excellent (0)
        let aprScore = (avgApr / 25) * 100;
        if (aprScore > 100) aprScore = 100;

        // 2. DTI Score (Debt-to-Income)
        // > 40% DTI is critical (100), < 10% is excellent (0)
        const dti = (totalMinPayment / monthlyIncome) * 100;
        let dtiScore = (dti / 40) * 100;
        if (dtiScore > 100) dtiScore = 100;

        // Weighted Average: 50% APR, 50% DTI (Simplified for now)
        const finalScore = Math.round((aprScore * 0.5) + (dtiScore * 0.5));

        let category = 'Excellent';
        if (finalScore > 80) category = 'Critical';
        else if (finalScore > 60) category = 'High Risk';
        else if (finalScore > 40) category = 'Moderate';
        else if (finalScore > 20) category = 'Low Risk';

        return {
            score: finalScore,
            category,
            details: { avgApr, dti, totalMinPayment }
        };
    }

    simulatePayoff(accounts: DebtAccount[], extraPayment: number): { months: number, interestSaved: number, timeline: any[], baselineTimeline: any[] } {
        // Baseline (no extra payment)
        const baseline = this.calculateGroupPayoff(accounts, 0);

        // With extra payment
        const simulated = this.calculateGroupPayoff(accounts, extraPayment);

        return {
            months: baseline.months - simulated.months,
            interestSaved: baseline.totalInterestPaid - simulated.totalInterestPaid,
            timeline: simulated.timeline,
            baselineTimeline: baseline.timeline
        };
    }

    calculateMinimumPaymentTrap(accounts: DebtAccount[]): { years: number, totalInterest: number } {
        // Simulate payoff with ONLY minimum payments
        const result = this.calculateGroupPayoff(accounts, 0);
        return {
            years: result.years,
            totalInterest: result.totalInterestPaid
        };
    }

    calculateNetWorth(totalAssets: number, totalDebt: number): number {
        return totalAssets - totalDebt;
    }
}
