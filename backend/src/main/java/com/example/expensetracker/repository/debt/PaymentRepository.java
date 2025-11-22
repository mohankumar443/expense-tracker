package com.example.expensetracker.repository.debt;

import com.example.expensetracker.model.debt.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
    
    List<Payment> findByAccountId(String accountId);
    
    List<Payment> findByAccountIdOrderByPaymentDateDesc(String accountId);
    
    List<Payment> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Payment> findByAccountIdAndPaymentDateBetween(String accountId, LocalDate startDate, LocalDate endDate);
}
