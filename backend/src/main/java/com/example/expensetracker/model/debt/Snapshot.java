package com.example.expensetracker.model.debt;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Document(collection = "snapshots")
public class Snapshot {
    
    @Id
    private String id;
    
    private LocalDate snapshotDate;
    private Double totalDebt;
    private Double creditCardDebt;
    private Double personalLoanDebt;
    private Double autoLoanDebt;
    private Integer totalAccounts;
    private Integer activeAccounts;
    private Integer paidOffAccounts;
    private Double totalMonthlyPayment;
    private Double totalMonthlyInterest;
    private Integer performanceScore;
    
    private SnapshotMetadata metadata;
    
    private LocalDateTime createdAt;
    
    @Data
    public static class SnapshotMetadata {
        private Double debtReduction;
        private Integer paymentsThisMonth;
        private Double newCharges;
        private Double principalPaid;
        private Double interestPaid;
    }
}
