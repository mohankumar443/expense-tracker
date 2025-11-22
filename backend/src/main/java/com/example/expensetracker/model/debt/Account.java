package com.example.expensetracker.model.debt;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
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
}
