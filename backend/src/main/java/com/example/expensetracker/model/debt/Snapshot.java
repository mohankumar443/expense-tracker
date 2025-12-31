package com.example.expensetracker.model.debt;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
    private LocalDateTime updatedAt;

    public static class SnapshotMetadata {
        private Double debtReduction;
        private Integer paymentsThisMonth;
        private Double newCharges;
        private Double principalPaid;
        private Double interestPaid;

        public SnapshotMetadata() {
        }

        public Double getDebtReduction() {
            return debtReduction;
        }

        public void setDebtReduction(Double debtReduction) {
            this.debtReduction = debtReduction;
        }

        public Integer getPaymentsThisMonth() {
            return paymentsThisMonth;
        }

        public void setPaymentsThisMonth(Integer paymentsThisMonth) {
            this.paymentsThisMonth = paymentsThisMonth;
        }

        public Double getNewCharges() {
            return newCharges;
        }

        public void setNewCharges(Double newCharges) {
            this.newCharges = newCharges;
        }

        public Double getPrincipalPaid() {
            return principalPaid;
        }

        public void setPrincipalPaid(Double principalPaid) {
            this.principalPaid = principalPaid;
        }

        public Double getInterestPaid() {
            return interestPaid;
        }

        public void setInterestPaid(Double interestPaid) {
            this.interestPaid = interestPaid;
        }
    }

    public Snapshot() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public Double getTotalDebt() {
        return totalDebt;
    }

    public void setTotalDebt(Double totalDebt) {
        this.totalDebt = totalDebt;
    }

    public Double getCreditCardDebt() {
        return creditCardDebt;
    }

    public void setCreditCardDebt(Double creditCardDebt) {
        this.creditCardDebt = creditCardDebt;
    }

    public Double getPersonalLoanDebt() {
        return personalLoanDebt;
    }

    public void setPersonalLoanDebt(Double personalLoanDebt) {
        this.personalLoanDebt = personalLoanDebt;
    }

    public Double getAutoLoanDebt() {
        return autoLoanDebt;
    }

    public void setAutoLoanDebt(Double autoLoanDebt) {
        this.autoLoanDebt = autoLoanDebt;
    }

    public Integer getTotalAccounts() {
        return totalAccounts;
    }

    public void setTotalAccounts(Integer totalAccounts) {
        this.totalAccounts = totalAccounts;
    }

    public Integer getActiveAccounts() {
        return activeAccounts;
    }

    public void setActiveAccounts(Integer activeAccounts) {
        this.activeAccounts = activeAccounts;
    }

    public Integer getPaidOffAccounts() {
        return paidOffAccounts;
    }

    public void setPaidOffAccounts(Integer paidOffAccounts) {
        this.paidOffAccounts = paidOffAccounts;
    }

    public Double getTotalMonthlyPayment() {
        return totalMonthlyPayment;
    }

    public void setTotalMonthlyPayment(Double totalMonthlyPayment) {
        this.totalMonthlyPayment = totalMonthlyPayment;
    }

    public Double getTotalMonthlyInterest() {
        return totalMonthlyInterest;
    }

    public void setTotalMonthlyInterest(Double totalMonthlyInterest) {
        this.totalMonthlyInterest = totalMonthlyInterest;
    }

    public Integer getPerformanceScore() {
        return performanceScore;
    }

    public void setPerformanceScore(Integer performanceScore) {
        this.performanceScore = performanceScore;
    }

    public SnapshotMetadata getMetadata() {
        return metadata;
    }

    public void setMetadata(SnapshotMetadata metadata) {
        this.metadata = metadata;
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
