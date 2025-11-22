package com.example.expensetracker.dto;

import lombok.Data;

@Data
public class DebtSummary {
    private String snapshotDate;
    private Double totalDebt;
    private Double creditCardDebt;
    private Double personalLoanDebt;
    private Double autoLoanDebt;
    private Integer totalAccounts;
}
