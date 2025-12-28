package com.example.expensetracker.dto.retirement;

public class AccountScorecard {
    private String accountType;
    private String goalType; // "RETIREMENT", "EDUCATION"
    private Double balance;
    private Double ytdContributions;
    private Double ytdGrowthDollars;
    private Double ytdGrowthPercent;
    private String status; // "On Plan", "Behind", "Leading"

    public AccountScorecard() {
    }

    public AccountScorecard(String accountType, String goalType, Double balance, Double ytdContributions,
            Double ytdGrowthDollars, Double ytdGrowthPercent, String status) {
        this.accountType = accountType;
        this.goalType = goalType;
        this.balance = balance;
        this.ytdContributions = ytdContributions;
        this.ytdGrowthDollars = ytdGrowthDollars;
        this.ytdGrowthPercent = ytdGrowthPercent;
        this.status = status;
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

    public Double getYtdContributions() {
        return ytdContributions;
    }

    public void setYtdContributions(Double ytdContributions) {
        this.ytdContributions = ytdContributions;
    }

    public Double getYtdGrowthDollars() {
        return ytdGrowthDollars;
    }

    public void setYtdGrowthDollars(Double ytdGrowthDollars) {
        this.ytdGrowthDollars = ytdGrowthDollars;
    }

    public Double getYtdGrowthPercent() {
        return ytdGrowthPercent;
    }

    public void setYtdGrowthPercent(Double ytdGrowthPercent) {
        this.ytdGrowthPercent = ytdGrowthPercent;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
