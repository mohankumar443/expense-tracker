package com.example.expensetracker.model.debt;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "transactions")
public class Transaction {
    
    @Id
    private String id;
    
    private String accountId; // Reference to Account
    private TransactionType type;
    private Double amount;
    private String description;
    private LocalDate transactionDate;
    private String category; // Optional categorization
    private Double balanceAfter;
    
    private LocalDateTime createdAt;
    
    public enum TransactionType {
        CHARGE,
        PAYMENT,
        FEE,
        INTEREST,
        REFUND,
        CREDIT
    }
}
