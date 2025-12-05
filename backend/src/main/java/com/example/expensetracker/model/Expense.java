package com.example.expensetracker.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description;
    private BigDecimal amount;
    private LocalDate date;
    @Column(name = "category")
    private String category;

    @Column(name = "is_recurring")
    private Boolean isRecurring = false;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() { // Changed from Double to BigDecimal to match original type
        return amount;
    }

    public void setAmount(BigDecimal amount) { // Changed from Double to BigDecimal to match original type
        this.amount = amount;
    }

    public LocalDate getDate() { // Changed from String to LocalDate to match original type
        return date;
    }

    public void setDate(LocalDate date) { // Changed from String to LocalDate to match original type
        this.date = date;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Boolean getIsRecurring() {
        return isRecurring;
    }

    public void setIsRecurring(Boolean isRecurring) {
        this.isRecurring = isRecurring;
    }
}
