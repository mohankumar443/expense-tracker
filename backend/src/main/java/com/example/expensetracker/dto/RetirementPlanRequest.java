package com.example.expensetracker.dto;

import com.example.expensetracker.dto.retirement.AccountBalanceDTO;
import java.util.List;

public class RetirementPlanRequest {
    private Double currentAge;
    private String monthYear;
    private Double currentTotalInvestedBalance;
    private Double targetPortfolioValue; // Added for persistence
    private Double actualMonthlyContribution;
    private Double oneTimeAdditions;
    private String afterTaxMode;
    private Double flatTaxRate;
    private Double taxFreeRate;
    private Double taxDeferredRate;
    private Double taxableRate;
    private Boolean persistSnapshot;

    // New account-level fields
    private List<AccountBalanceDTO> accounts;

    public RetirementPlanRequest() {
    }

    public Double getCurrentAge() {
        return currentAge;
    }

    public void setCurrentAge(Double currentAge) {
        this.currentAge = currentAge;
    }

    public String getMonthYear() {
        return monthYear;
    }

    public void setMonthYear(String monthYear) {
        this.monthYear = monthYear;
    }

    public Double getCurrentTotalInvestedBalance() {
        return currentTotalInvestedBalance;
    }

    public void setCurrentTotalInvestedBalance(Double currentTotalInvestedBalance) {
        this.currentTotalInvestedBalance = currentTotalInvestedBalance;
    }

    public Double getTargetPortfolioValue() {
        return targetPortfolioValue;
    }

    public void setTargetPortfolioValue(Double targetPortfolioValue) {
        this.targetPortfolioValue = targetPortfolioValue;
    }

    public Double getActualMonthlyContribution() {
        return actualMonthlyContribution;
    }

    public void setActualMonthlyContribution(Double actualMonthlyContribution) {
        this.actualMonthlyContribution = actualMonthlyContribution;
    }

    public Double getOneTimeAdditions() {
        return oneTimeAdditions;
    }

    public void setOneTimeAdditions(Double oneTimeAdditions) {
        this.oneTimeAdditions = oneTimeAdditions;
    }

    public String getAfterTaxMode() {
        return afterTaxMode;
    }

    public void setAfterTaxMode(String afterTaxMode) {
        this.afterTaxMode = afterTaxMode;
    }

    public Double getFlatTaxRate() {
        return flatTaxRate;
    }

    public void setFlatTaxRate(Double flatTaxRate) {
        this.flatTaxRate = flatTaxRate;
    }

    public Double getTaxFreeRate() {
        return taxFreeRate;
    }

    public void setTaxFreeRate(Double taxFreeRate) {
        this.taxFreeRate = taxFreeRate;
    }

    public Double getTaxDeferredRate() {
        return taxDeferredRate;
    }

    public void setTaxDeferredRate(Double taxDeferredRate) {
        this.taxDeferredRate = taxDeferredRate;
    }

    public Double getTaxableRate() {
        return taxableRate;
    }

    public void setTaxableRate(Double taxableRate) {
        this.taxableRate = taxableRate;
    }

    public Boolean getPersistSnapshot() {
        return persistSnapshot;
    }

    public void setPersistSnapshot(Boolean persistSnapshot) {
        this.persistSnapshot = persistSnapshot;
    }

    public List<AccountBalanceDTO> getAccounts() {
        return accounts;
    }

    public void setAccounts(List<AccountBalanceDTO> accounts) {
        this.accounts = accounts;
    }
}
