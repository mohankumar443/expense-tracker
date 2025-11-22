package com.example.expensetracker.controller.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.service.debt.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/debt/accounts")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DebtAccountMongoController {
    
    private final AccountService accountService;
    
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
        return accountService.createAccount(account);
    }
    
    @PutMapping("/{id}")
    public Account updateAccount(@PathVariable String id, @RequestBody Account account) {
        return accountService.updateAccount(id, account);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable String id) {
        accountService.deleteAccount(id);
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
}
