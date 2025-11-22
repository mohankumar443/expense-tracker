package com.example.expensetracker.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
@Table(name = "debt_accounts")
public class DebtAccount {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType accountType;
    
    @Column(nullable = false)
    private Double currentBalance;

    public Double getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(Double currentBalance) {
        this.currentBalance = currentBalance;
    }
    
    @Column(nullable = false)
    private Double apr; // Annual Percentage Rate
    
    private Double monthlyPayment;
    
    private LocalDate promoExpirationDate;
    
    private String notes;
    
    @Column(updatable = false)
    private LocalDate createdDate = LocalDate.now();
    
    private LocalDate lastUpdated = LocalDate.now();
}
