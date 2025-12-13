package com.example.expensetracker.repository;

import com.example.expensetracker.model.DebtAccount;
import com.example.expensetracker.model.AccountType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DebtAccountRepository extends MongoRepository<DebtAccount, String> {

    List<DebtAccount> findByAccountType(AccountType accountType);
}
