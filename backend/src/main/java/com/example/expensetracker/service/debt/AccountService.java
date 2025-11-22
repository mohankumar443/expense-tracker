package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.repository.debt.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccountService {
    
    private final AccountRepository accountRepository;
    
    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }
    
    public Optional<Account> getAccountById(String id) {
        return accountRepository.findById(id);
    }
    
    public Optional<Account> getAccountByAccountId(String accountId) {
        return accountRepository.findByAccountId(accountId);
    }
    
    public List<Account> getAccountsByType(AccountType type) {
        return accountRepository.findByType(type);
    }
    
    public List<Account> getAccountsByStatus(AccountStatus status) {
        return accountRepository.findByStatus(status);
    }
    
    public List<Account> getActiveAccountsByType(AccountType type) {
        return accountRepository.findByTypeAndStatus(type, AccountStatus.ACTIVE);
    }
    
    public List<Account> getAccountsByHighestInterest() {
        return accountRepository.findByStatusOrderByAprDesc(AccountStatus.ACTIVE);
    }
    
    public Account createAccount(Account account) {
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());
        return accountRepository.save(account);
    }
    
    public Account updateAccount(String id, Account account) {
        account.setId(id);
        account.setUpdatedAt(LocalDateTime.now());
        return accountRepository.save(account);
    }
    
    public void deleteAccount(String id) {
        accountRepository.deleteById(id);
    }
    
    public Double getTotalDebt() {
        return accountRepository.findByStatus(AccountStatus.ACTIVE)
                .stream()
                .mapToDouble(Account::getCurrentBalance)
                .sum();
    }
    
    public Double getTotalDebtByType(AccountType type) {
        return accountRepository.findByTypeAndStatus(type, AccountStatus.ACTIVE)
                .stream()
                .mapToDouble(Account::getCurrentBalance)
                .sum();
    }
}
