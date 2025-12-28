package com.example.expensetracker.dto.retirement;

public class AccountBalanceDTO {
    private String accountType; // "401k", "Roth IRA", "HSA", "Brokerage", "529"
    private String goalType; // "RETIREMENT", "EDUCATION"
    private Double balance;
    private Double contribution;

    public AccountBalanceDTO() {
    }

    public AccountBalanceDTO(String accountType, String goalType, Double balance, Double contribution) {
        this.accountType = accountType;
        this.goalType = goalType;
        this.balance = balance;
        this.contribution = contribution;
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
}
