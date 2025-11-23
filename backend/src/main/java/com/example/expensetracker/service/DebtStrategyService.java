package com.example.expensetracker.service;

import com.example.expensetracker.model.debt.Account;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class DebtStrategyService {

    public void calculateAndEnrich(Account account) {
        if (account.getCurrentBalance() == null || account.getCurrentBalance() <= 0) {
            resetCalculatedFields(account);
            return;
        }

        double balance = account.getCurrentBalance();
        double apr = account.getApr() != null ? account.getApr() : 0.0;
        double payment = account.getMonthlyPayment() != null ? account.getMonthlyPayment() : 0.0;

        // 1. Calculate Interest and Principal per month (for the current month)
        double monthlyInterestRate = apr / 100.0 / 12.0;
        double interestForMonth = balance * monthlyInterestRate;
        double principalForMonth = payment - interestForMonth;

        // If payment is less than interest, principal payment is negative (debt grows)
        // But for display, we might just show what "would" go to principal if it were positive, or 0.
        account.setPrincipalPerMonth(principalForMonth);

        // 2. Calculate Months Left and Payoff Date
        if (payment <= interestForMonth) {
            // Never pays off with this payment
            account.setMonthsLeft(null); // Infinite
            account.setPayoffDate(null);
        } else {
            // N = -log(1 - (r * P) / A) / log(1 + r)
            // r = monthly rate, P = principal (balance), A = monthly payment
            try {
                double r = monthlyInterestRate;
                if (r == 0) {
                    // Simple division if 0% APR
                    double months = balance / payment;
                    int monthsInt = (int) Math.ceil(months);
                    account.setMonthsLeft(monthsInt);
                    account.setPayoffDate(LocalDate.now().plusMonths(monthsInt));
                } else {
                    double numerator = Math.log(1 - (r * balance) / payment);
                    double denominator = Math.log(1 + r);
                    double months = -(numerator / denominator);
                    int monthsInt = (int) Math.ceil(months);
                    account.setMonthsLeft(monthsInt);
                    account.setPayoffDate(LocalDate.now().plusMonths(monthsInt));
                }
            } catch (Exception e) {
                // Math error (e.g. log of negative number), fallback
                account.setMonthsLeft(null);
                account.setPayoffDate(null);
            }
        }
    }

    public void calculatePriorities(List<Account> accounts) {
        // Avalanche Method: Sort by APR Descending
        accounts.sort(Comparator.comparingDouble((Account a) -> a.getApr() != null ? a.getApr() : 0.0).reversed());

        int priority = 1;
        for (Account account : accounts) {
            if (account.getCurrentBalance() > 0) {
                account.setPriority(priority++);
            } else {
                account.setPriority(null); // Paid off accounts don't need priority
            }
        }
    }

    private void resetCalculatedFields(Account account) {
        account.setPrincipalPerMonth(0.0);
        account.setMonthsLeft(0);
        account.setPayoffDate(LocalDate.now());
        account.setPriority(null);
    }
}
