package com.example.expensetracker.model.retirement;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "retirement_snapshots")
public class RetirementSnapshot {

    @Id
    private String id;

    private LocalDate snapshotDate;
    private Double currentAge;
    private List<AccountBalance> accounts;
    private Double oneTimeAdditions;
    private Double totalBalance;
    private Double targetPortfolioValue; // Added field
    private Double totalContributions;
    private LocalDateTime createdAt;

    public RetirementSnapshot() {
        this.createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public Double getCurrentAge() {
        return currentAge;
    }

    public void setCurrentAge(Double currentAge) {
        this.currentAge = currentAge;
    }

    public List<AccountBalance> getAccounts() {
        return accounts;
    }

    public void setAccounts(List<AccountBalance> accounts) {
        this.accounts = accounts;
    }

    public Double getOneTimeAdditions() {
        return oneTimeAdditions;
    }

    public void setOneTimeAdditions(Double oneTimeAdditions) {
        this.oneTimeAdditions = oneTimeAdditions;
    }

    public Double getTotalBalance() {
        return totalBalance;
    }

    public void setTotalBalance(Double totalBalance) {
        this.totalBalance = totalBalance;
    }

    public Double getTotalContributions() {
        return totalContributions;
    }

    public void setTotalContributions(Double totalContributions) {
        this.totalContributions = totalContributions;
    }

    public Double getTargetPortfolioValue() {
        return targetPortfolioValue;
    }

    public void setTargetPortfolioValue(Double targetPortfolioValue) {
        this.targetPortfolioValue = targetPortfolioValue;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
