package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.repository.debt.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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

    public List<Account> getAccountsBySnapshotDate(java.time.LocalDate date) {
        return accountRepository.findBySnapshotDate(date);
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
    
    // Clone accounts from one snapshot date to another
    public List<Account> cloneAccountsForNewSnapshot(LocalDate fromDate, LocalDate toDate) {
        List<Account> sourceAccounts = accountRepository.findBySnapshotDate(fromDate);
        
        return sourceAccounts.stream()
                .map(source -> {
                    Account cloned = new Account();
                    cloned.setAccountId(source.getAccountId());
                    cloned.setName(source.getName());
                    cloned.setType(source.getType());
                    cloned.setCurrentBalance(source.getCurrentBalance());
                    cloned.setCreditLimit(source.getCreditLimit());
                    cloned.setApr(source.getApr());
                    cloned.setMonthlyPayment(source.getMonthlyPayment());
                    cloned.setPromoExpires(source.getPromoExpires());
                    cloned.setStatus(source.getStatus());
                    cloned.setOpenedDate(source.getOpenedDate());
                    cloned.setNotes(source.getNotes());
                    cloned.setPrincipalPerMonth(source.getPrincipalPerMonth());
                    cloned.setPayoffDate(source.getPayoffDate());
                    cloned.setMonthsLeft(source.getMonthsLeft());
                    cloned.setPriority(source.getPriority());
                    cloned.setSnapshotDate(toDate);
                    cloned.setCreatedAt(LocalDateTime.now());
                    cloned.setUpdatedAt(LocalDateTime.now());
                    return cloned;
                })
                .collect(Collectors.toList());
    }
    
    // Batch create or update accounts
    public List<Account> batchCreateOrUpdate(List<Account> accounts) {
        LocalDateTime now = LocalDateTime.now();
        
        accounts.forEach(account -> {
            if (account.getId() == null) {
                account.setCreatedAt(now);
            }
            account.setUpdatedAt(now);
        });
        
        return accountRepository.saveAll(accounts);
    }
}
