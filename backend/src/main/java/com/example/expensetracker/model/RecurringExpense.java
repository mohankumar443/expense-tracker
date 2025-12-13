package com.example.expensetracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;

@Document(collection = "recurring_expenses")
public class RecurringExpense {
    @Id
    private String id;
    private String description;
    private BigDecimal amount;
    private String category;
    private Integer dayOfMonth; // 1-31
    private Boolean isEmi = false;
    private String debtAccountId; // Link to debt account if it's an EMI
    private Boolean active = true;
    private java.time.LocalDate lastGenerated;

    public RecurringExpense() {
    }

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

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getDayOfMonth() {
        return dayOfMonth;
    }

    public void setDayOfMonth(Integer dayOfMonth) {
        this.dayOfMonth = dayOfMonth;
    }

    public Boolean getIsEmi() {
        return isEmi;
    }

    public void setIsEmi(Boolean emi) {
        isEmi = emi;
    }

    public String getDebtAccountId() {
        return debtAccountId;
    }

    public void setDebtAccountId(String debtAccountId) {
        this.debtAccountId = debtAccountId;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public java.time.LocalDate getLastGenerated() {
        return lastGenerated;
    }

    public void setLastGenerated(java.time.LocalDate lastGenerated) {
        this.lastGenerated = lastGenerated;
    }
}
