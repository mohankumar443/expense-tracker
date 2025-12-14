package com.example.expensetracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "debt_accounts")
public class DebtAccount {

    @Id
    private String id;

    private String name;

    @com.fasterxml.jackson.annotation.JsonProperty("type")
    private AccountType accountType;

    private Double currentBalance;
    private Double creditLimit;
    private Double apr; // Annual Percentage Rate
    private Double monthlyPayment;

    @com.fasterxml.jackson.annotation.JsonProperty("promoExpires")
    private LocalDate promoExpirationDate;

    private String notes;

    private LocalDate createdDate = LocalDate.now();

    private LocalDate lastUpdated = LocalDate.now();

    public DebtAccount() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AccountType getAccountType() {
        return accountType;
    }

    public void setAccountType(AccountType accountType) {
        this.accountType = accountType;
    }

    public Double getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(Double currentBalance) {
        this.currentBalance = currentBalance;
    }

    public Double getCreditLimit() {
        return creditLimit;
    }

    public void setCreditLimit(Double creditLimit) {
        this.creditLimit = creditLimit;
    }

    public Double getApr() {
        return apr;
    }

    public void setApr(Double apr) {
        this.apr = apr;
    }

    public Double getMonthlyPayment() {
        return monthlyPayment;
    }

    public void setMonthlyPayment(Double monthlyPayment) {
        this.monthlyPayment = monthlyPayment;
    }

    public LocalDate getPromoExpirationDate() {
        return promoExpirationDate;
    }

    public void setPromoExpirationDate(LocalDate promoExpirationDate) {
        this.promoExpirationDate = promoExpirationDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDate getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDate createdDate) {
        this.createdDate = createdDate;
    }

    public LocalDate getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDate lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
