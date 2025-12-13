package com.example.expensetracker.dto;

public class DebtSummary {
    private String snapshotDate;
    private Double totalDebt;
    private Double creditCardDebt;
    private Double personalLoanDebt;
    private Double autoLoanDebt;
    private Integer totalAccounts;

    public DebtSummary() {
    }

    public String getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(String snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public Double getTotalDebt() {
        return totalDebt;
    }

    public void setTotalDebt(Double totalDebt) {
        this.totalDebt = totalDebt;
    }

    public Double getCreditCardDebt() {
        return creditCardDebt;
    }

    public void setCreditCardDebt(Double creditCardDebt) {
        this.creditCardDebt = creditCardDebt;
    }

    public Double getPersonalLoanDebt() {
        return personalLoanDebt;
    }

    public void setPersonalLoanDebt(Double personalLoanDebt) {
        this.personalLoanDebt = personalLoanDebt;
    }

    public Double getAutoLoanDebt() {
        return autoLoanDebt;
    }

    public void setAutoLoanDebt(Double autoLoanDebt) {
        this.autoLoanDebt = autoLoanDebt;
    }

    public Integer getTotalAccounts() {
        return totalAccounts;
    }

    public void setTotalAccounts(Integer totalAccounts) {
        this.totalAccounts = totalAccounts;
    }
}
