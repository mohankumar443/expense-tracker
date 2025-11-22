package com.example.expensetracker.repository;

import com.example.expensetracker.model.DebtAccount;
import com.example.expensetracker.model.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DebtAccountRepository extends JpaRepository<DebtAccount, Long> {
    
    List<DebtAccount> findByAccountType(AccountType accountType);
    
    List<DebtAccount> findByOrderByAprDesc();
    
    @Query("SELECT SUM(d.currentBalance) FROM DebtAccount d")
    Double getTotalDebt();
    
    @Query("SELECT SUM(d.currentBalance) FROM DebtAccount d WHERE d.accountType = ?1")
    Double getTotalDebtByType(AccountType accountType);
}
