package com.example.expensetracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.math.BigDecimal;
import java.time.LocalDate;

@Document(collection = "expenses")
public class Expense {
    @Id
    private String id;

    private String description;
    private BigDecimal amount;
    private LocalDate date;
    @Field("category")
    private String category;

    @Field("is_recurring")
    private Boolean isRecurring = false;

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
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
