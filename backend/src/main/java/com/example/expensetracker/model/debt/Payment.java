package com.example.expensetracker.model.debt;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "payments")
public class Payment {
    
    @Id
    private String id;
    
    private String accountId; // Reference to Account
    private Double amount;
    private LocalDate paymentDate;
    private PaymentType paymentType;
    private Double principalAmount;
    private Double interestAmount;
    private Double balanceAfter;
    private String notes;
    
    private LocalDateTime createdAt;
    
    public enum PaymentType {
        MANUAL,
        AUTO_PAY,
        EXTRA,
        MINIMUM
    }
}
