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

            if (acc.accountType === 'CREDIT_CARD') {
                breakdown.creditCards += monthlyInterest;
            } else if (acc.accountType === 'PERSONAL_LOAN') {
                breakdown.personalLoans += monthlyInterest;
            } else if (acc.accountType === 'AUTO_LOAN') {
                breakdown.autoLoans += monthlyInterest;
            }
            breakdown.total += monthlyInterest;
        });

        return breakdown;
    }

    calculatePayoffTimeline(accounts: DebtAccount[], extraPayment: number = 0): CategoryPayoff {
        // Group accounts
        const creditCards = accounts.filter(a => a.accountType === 'CREDIT_CARD');
        const personalLoans = accounts.filter(a => a.accountType === 'PERSONAL_LOAN');
        const autoLoans = accounts.filter(a => a.accountType === 'AUTO_LOAN');

        return {
            creditCards: this.calculateGroupPayoff(creditCards, extraPayment), // Apply extra payment to highest APR (Avalanche)
            personalLoans: this.calculateGroupPayoff(personalLoans, 0),
            autoLoans: this.calculateGroupPayoff(autoLoans, 0),
            overall: this.calculateGroupPayoff(accounts, extraPayment)
        };
    }

    private calculateGroupPayoff(accounts: DebtAccount[], extraPayment: number): PayoffProjection {
        if (accounts.length === 0) {
            return { months: 0, years: 0, payoffDate: new Date(), totalInterestPaid: 0 };
        }

        // Deep copy to simulate without modifying original
        let simulatedAccounts = accounts.map(a => ({ ...a }));
        let totalInterestPaid = 0;
        let months = 0;
        const maxMonths = 360; // Cap at 30 years to prevent infinite loops

        while (simulatedAccounts.some(a => a.currentBalance > 0) && months < maxMonths) {
            months++;
            let monthlyExtraAvailable = extraPayment;

            // Sort by APR desc for Avalanche method
            simulatedAccounts.sort((a, b) => b.apr - a.apr);

            simulatedAccounts.forEach(acc => {
                if (acc.currentBalance <= 0) return;

                const interest = (acc.currentBalance * (acc.apr / 100)) / 12;
                totalInterestPaid += interest;

                let payment = acc.monthlyPayment || (acc.currentBalance * 0.02); // Fallback min payment
                if (payment < 25) payment = 25; // Min $25 rule

                // Add extra payment to the highest APR account
                if (monthlyExtraAvailable > 0 && acc === simulatedAccounts[0]) {
                    payment += monthlyExtraAvailable;
                    monthlyExtraAvailable = 0; // Used up
                }

                // Cap payment at balance + interest
                if (payment > acc.currentBalance + interest) {
                    payment = acc.currentBalance + interest;
                    // If we overpaid, the remainder flows to the next account (Snowball/Avalanche effect)
                    // Simplified here: just assume it's paid off
                }

                const principal = payment - interest;
                acc.currentBalance -= principal;

                if (acc.currentBalance < 0.01) acc.currentBalance = 0;
            });
        }

        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + months);

        return {
            months,
            years: parseFloat((months / 12).toFixed(1)),
            payoffDate,
            totalInterestPaid
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
        return accounts
            .filter(a => a.currentBalance > 0)
            .sort((a, b) => b.apr - a.apr)
            .slice(0, limit);
    }

    calculateNetWorth(totalAssets: number, totalDebt: number): number {
        return totalAssets - totalDebt;
    }
}
