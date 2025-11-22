package com.example.expensetracker.model.debt;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "goals")
public class Goal {
    
    @Id
    private String id;
    
    private GoalType goalType;
    private LocalDate targetDate;
    private Double targetAmount;
    private String accountId; // Optional, for specific account goals
    private PayoffStrategy strategy;
    private Double monthlyPayment;
    private GoalStatus status;
    private Double progress; // Percentage (0-100)
    private String notes;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public enum GoalType {
        DEBT_FREE,
        ACCOUNT_PAYOFF,
        SAVINGS,
        EMERGENCY_FUND
    }
    
    public enum PayoffStrategy {
        AVALANCHE, // Highest interest first
        SNOWBALL,  // Lowest balance first
        CUSTOM
    }
    
    public enum GoalStatus {
        ACTIVE,
        COMPLETED,
        PAUSED,
        CANCELLED
    }
}
