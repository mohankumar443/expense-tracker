package com.example.expensetracker.model.retirement;

public class AccountBalance {
    private String accountType; // "401k", "Roth IRA", "HSA", "Brokerage", "529"
    private String goalType; // "RETIREMENT", "EDUCATION"
    private Double balance;
    private Double contribution;
    private Double previousBalance; // For growth calculation

    public AccountBalance() {
    }

    public AccountBalance(String accountType, String goalType, Double balance, Double contribution,
            Double previousBalance) {
        this.accountType = accountType;
        this.goalType = goalType;
        this.balance = balance;
        this.contribution = contribution;
        this.previousBalance = previousBalance;
    }

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public String getGoalType() {
        return goalType;
    }

    public void setGoalType(String goalType) {
        this.goalType = goalType;
    }

    public Double getBalance() {
        return balance;
    }

    public void setBalance(Double balance) {
        this.balance = balance;
    }

    public Double getContribution() {
        return contribution;
    }

    public void setContribution(Double contribution) {
        this.contribution = contribution;
    }

    public Double getPreviousBalance() {
        return previousBalance;
    }

    public void setPreviousBalance(Double previousBalance) {
        this.previousBalance = previousBalance;
    }
}
