package com.example.expensetracker.repository.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends MongoRepository<Account, String> {
    
    Optional<Account> findByAccountId(String accountId);
    
    List<Account> findByType(AccountType type);
    
    List<Account> findByStatus(AccountStatus status);
    
    List<Account> findByTypeAndStatus(AccountType type, AccountStatus status);
    
    List<Account> findByStatusOrderByAprDesc(AccountStatus status);

    List<Account> findBySnapshotDate(java.time.LocalDate snapshotDate);

    void deleteBySnapshotDate(java.time.LocalDate snapshotDate);
}
