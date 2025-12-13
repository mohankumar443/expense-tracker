package com.example.expensetracker.model.debt;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "accounts")
public class Account {

    @Id
    private String id;

    private String accountId; // Unique identifier like "boa-cc-001"
    private String name;
    private AccountType type;
    private Double currentBalance;
    private Double creditLimit; // For credit cards
    private Double apr;
    private Double monthlyPayment;
    private LocalDate promoExpires; // Optional promo expiration
    private AccountStatus status;
    private LocalDate openedDate;
    private String notes;

    // Calculated Fields
    private Double principalPerMonth;
    private LocalDate payoffDate;
    private Integer monthsLeft;
    private Integer priority;

    private LocalDate snapshotDate;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum AccountType {
        CREDIT_CARD,
        PERSONAL_LOAN,
        AUTO_LOAN,
        MORTGAGE,
        STUDENT_LOAN
    }

    public enum AccountStatus {
        ACTIVE,
        PAID_OFF,
        CLOSED
    }

    public Account() {
    }

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AccountType getType() {
        return type;
    }

    public void setType(AccountType type) {
        this.type = type;
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

    public LocalDate getPromoExpires() {
        return promoExpires;
    }

    public void setPromoExpires(LocalDate promoExpires) {
        this.promoExpires = promoExpires;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public LocalDate getOpenedDate() {
        return openedDate;
    }

    public void setOpenedDate(LocalDate openedDate) {
        this.openedDate = openedDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Double getPrincipalPerMonth() {
        return principalPerMonth;
    }

    public void setPrincipalPerMonth(Double principalPerMonth) {
        this.principalPerMonth = principalPerMonth;
    }

    public LocalDate getPayoffDate() {
        return payoffDate;
    }

    public void setPayoffDate(LocalDate payoffDate) {
        this.payoffDate = payoffDate;
    }

    public Integer getMonthsLeft() {
        return monthsLeft;
    }

    public void setMonthsLeft(Integer monthsLeft) {
        this.monthsLeft = monthsLeft;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
