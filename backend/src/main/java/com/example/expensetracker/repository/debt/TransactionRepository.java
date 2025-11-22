package com.example.expensetracker.repository.debt;

import com.example.expensetracker.model.debt.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    
    List<Transaction> findByAccountId(String accountId);
    
    List<Transaction> findByAccountIdOrderByTransactionDateDesc(String accountId);
    
    List<Transaction> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Transaction> findByAccountIdAndTransactionDateBetween(String accountId, LocalDate startDate, LocalDate endDate);
    
    List<Transaction> findByCategory(String category);
}
