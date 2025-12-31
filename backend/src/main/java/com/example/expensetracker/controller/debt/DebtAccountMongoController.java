package com.example.expensetracker.controller.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.service.debt.AccountService;
import com.example.expensetracker.service.debt.SnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/debt/accounts")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DebtAccountMongoController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DebtAccountMongoController.class);

    private final AccountService accountService;
    private final SnapshotService snapshotService;
    
    @GetMapping
    public List<Account> getAllAccounts() {
        return accountService.getAllAccounts();
    }

    @GetMapping("/snapshot/{date}")
    public List<Account> getAccountsBySnapshotDate(@PathVariable @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        return accountService.getAccountsBySnapshotDate(date);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Account> getAccountById(@PathVariable String id) {
        return accountService.getAccountById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/account-id/{accountId}")
    public ResponseEntity<Account> getAccountByAccountId(@PathVariable String accountId) {
        return accountService.getAccountByAccountId(accountId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/type/{type}")
    public List<Account> getAccountsByType(@PathVariable AccountType type) {
        return accountService.getAccountsByType(type);
    }
    
    @GetMapping("/status/{status}")
    public List<Account> getAccountsByStatus(@PathVariable AccountStatus status) {
        return accountService.getAccountsByStatus(status);
    }
    
    @GetMapping("/active/type/{type}")
    public List<Account> getActiveAccountsByType(@PathVariable AccountType type) {
        return accountService.getActiveAccountsByType(type);
    }
    
    @GetMapping("/highest-interest")
    public List<Account> getAccountsByHighestInterest() {
        return accountService.getAccountsByHighestInterest();
    }
    
    @PostMapping
    public Account createAccount(@RequestBody Account account) {
        Account saved = accountService.createAccount(account);
        refreshSnapshot(saved.getSnapshotDate());
        return saved;
    }
    
    @PutMapping("/{id}")
    public Account updateAccount(@PathVariable String id, @RequestBody Account account) {
        Account updated = accountService.updateAccount(id, account);
        refreshSnapshot(updated.getSnapshotDate());
        return updated;
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable String id) {
        Optional<Account> existing = accountService.getAccountById(id);
        accountService.deleteAccount(id);
        existing.map(Account::getSnapshotDate).ifPresent(this::refreshSnapshot);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/total-debt")
    public Double getTotalDebt() {
        return accountService.getTotalDebt();
    }
    
    @GetMapping("/total-debt/type/{type}")
    public Double getTotalDebtByType(@PathVariable AccountType type) {
        return accountService.getTotalDebtByType(type);
    }

    private void refreshSnapshot(LocalDate snapshotDate) {
        if (snapshotDate == null) {
            return;
        }
        try {
            if (!snapshotService.snapshotExists(snapshotDate)) {
                snapshotService.createSnapshot(snapshotDate, null);
            }
            List<Account> accounts = accountService.getAccountsBySnapshotDate(snapshotDate);
            snapshotService.updateSnapshotFromAccounts(snapshotDate, accounts);
        } catch (Exception ex) {
            log.warn("Failed to refresh snapshot {} after account change: {}", snapshotDate, ex.getMessage());
        }
    }
}
