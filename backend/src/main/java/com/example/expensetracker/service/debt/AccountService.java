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

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
public class AccountService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AccountService.class);

    private final AccountRepository accountRepository;
    private final FileSnapshotService fileSnapshotService;

    private boolean isDbAvailable = true;

    public List<Account> getAllAccounts() {
        try {
            if (isDbAvailable) {
                return accountRepository.findAll();
            }
        } catch (Exception e) {
            log.warn("MongoDB unavailable, falling back to file snapshots for all accounts: {}", e.getMessage());
            isDbAvailable = false;
        }
        // Fallback: return most recent snapshot accounts
        return fileSnapshotService.getLatestAccounts();
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

    public List<Account> getAccountsBySnapshotDate(LocalDate snapshotDate) {
        try {
            if (isDbAvailable) {
                return accountRepository.findBySnapshotDate(snapshotDate);
            }
        } catch (Exception e) {
            log.warn("MongoDB unavailable, falling back to file storage for accounts: {}", e.getMessage());
            isDbAvailable = false;
        }
        return fileSnapshotService.getAccountsBySnapshotDate(snapshotDate);
    }

    /**
     * Calculate loan fields if they are not provided by the user.
     * Calculates: principalPerMonth, monthsLeft, payoffDate, and notes
     */
    private void calculateLoanFields(Account account) {
        // Only calculate for loan types (not credit cards)
        if (account.getType() == AccountType.CREDIT_CARD) {
            return;
        }

        // Skip if essential fields are missing
        if (account.getCurrentBalance() == null || account.getApr() == null ||
                account.getMonthlyPayment() == null || account.getCurrentBalance() <= 0 ||
                account.getMonthlyPayment() <= 0) {
            return;
        }

        double balance = account.getCurrentBalance();
        double apr = account.getApr();
        double monthlyPayment = account.getMonthlyPayment();
        double monthlyInterestRate = (apr / 100) / 12;

        // Calculate principal per month if not provided
        if (account.getPrincipalPerMonth() == null) {
            double interestPayment = balance * monthlyInterestRate;
            double principalPerMonth = monthlyPayment - interestPayment;
            account.setPrincipalPerMonth(Math.max(0, principalPerMonth));
        }

        // Calculate months left if not provided
        if (account.getMonthsLeft() == null) {
            int monthsLeft = 0;

            if (monthlyInterestRate > 0 && monthlyPayment > balance * monthlyInterestRate) {
                // Use loan amortization formula: n = -log(1 - r*P/M) / log(1 + r)
                // where P = principal, r = monthly rate, M = monthly payment
                double numerator = Math.log(1 - (monthlyInterestRate * balance / monthlyPayment));
                double denominator = Math.log(1 + monthlyInterestRate);
                monthsLeft = (int) Math.ceil(-numerator / denominator);
            } else if (monthlyInterestRate == 0 && monthlyPayment > 0) {
                // No interest case
                monthsLeft = (int) Math.ceil(balance / monthlyPayment);
            } else {
                // Payment is too low to cover interest, set a high value
                monthsLeft = 999;
            }

            account.setMonthsLeft(monthsLeft);
        }

        // Calculate payoff date if not provided
        if (account.getPayoffDate() == null && account.getMonthsLeft() != null) {
            LocalDate payoffDate = LocalDate.now().plusMonths(account.getMonthsLeft());
            account.setPayoffDate(payoffDate);
        }

        // Generate default notes if not provided
        if (account.getNotes() == null || account.getNotes().trim().isEmpty()) {
            String notes = String.format("Auto-calculated on %s. Payoff in %d months with $%.2f monthly payment.",
                    LocalDate.now(), account.getMonthsLeft(), monthlyPayment);
            account.setNotes(notes);
        }

        // Calculate priority if not provided (based on APR - higher interest = higher
        // priority)
        if (account.getPriority() == null) {
            // Priority scale: 1-5, where 5 is highest priority
            // APR >= 20% = Priority 5
            // APR >= 15% = Priority 4
            // APR >= 10% = Priority 3
            // APR >= 5% = Priority 2
            // APR < 5% = Priority 1
            int priority;
            if (apr >= 20.0) {
                priority = 5;
            } else if (apr >= 15.0) {
                priority = 4;
            } else if (apr >= 10.0) {
                priority = 3;
            } else if (apr >= 5.0) {
                priority = 2;
            } else {
                priority = 1;
            }
            account.setPriority(priority);
        }
    }

    public Account createAccount(Account account) {
        if (!isDbAvailable) {
            throw new IllegalStateException("Cannot create account in offline mode");
        }
        // Calculate missing loan fields automatically
        calculateLoanFields(account);

        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());
        return accountRepository.save(account);
    }

    public Account updateAccount(String id, Account accountDetails) {
        if (!isDbAvailable) {
            throw new IllegalStateException("Cannot update account in offline mode");
        }
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found with id: " + id));

        // Update fields
        account.setName(accountDetails.getName());
        account.setType(accountDetails.getType());
        account.setCurrentBalance(accountDetails.getCurrentBalance());
        account.setCreditLimit(accountDetails.getCreditLimit());
        account.setApr(accountDetails.getApr());
        account.setMonthlyPayment(accountDetails.getMonthlyPayment());
        account.setPromoExpires(accountDetails.getPromoExpires());
        account.setStatus(accountDetails.getStatus());
        account.setOpenedDate(accountDetails.getOpenedDate());
        account.setNotes(accountDetails.getNotes());
        account.setPrincipalPerMonth(accountDetails.getPrincipalPerMonth());
        account.setPayoffDate(accountDetails.getPayoffDate());
        account.setMonthsLeft(accountDetails.getMonthsLeft());
        account.setPriority(accountDetails.getPriority());
        account.setSnapshotDate(accountDetails.getSnapshotDate());

        // Recalculate missing loan fields automatically
        calculateLoanFields(account);

        account.setUpdatedAt(LocalDateTime.now());
        return accountRepository.save(account);
    }

    public void deleteAccount(String id) {
        if (!isDbAvailable) {
            throw new IllegalStateException("Cannot delete account in offline mode");
        }
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
    public List<Account> cloneAccountsForNewSnapshot(LocalDate sourceDate, LocalDate targetDate) {
        // This method is used by backend cloning.
        // If DB is down, we can't save the new accounts anyway, so we can fail or
        // return empty.
        // But since we disabled backend cloning in frontend (passed null), this might
        // not be called.
        // However, if called:

        List<Account> sourceAccounts = getAccountsBySnapshotDate(sourceDate); // Uses fallback if needed

        if (!isDbAvailable) {
            // In offline mode, we can return the cloned objects but we can't save them.
            // The controller calls batchCreateOrUpdate next, which will fail.
            // So we can just return the list.
            return sourceAccounts.stream()
                    .map(account -> {
                        Account newAccount = new Account();
                        // Copy fields... (same as before)
                        newAccount.setAccountId(account.getAccountId()); // Added this line based on original logic
                        newAccount.setName(account.getName());
                        newAccount.setType(account.getType());
                        newAccount.setCurrentBalance(account.getCurrentBalance());
                        newAccount.setCreditLimit(account.getCreditLimit()); // Added this line based on original logic
                        newAccount.setApr(account.getApr());
                        newAccount.setMonthlyPayment(account.getMonthlyPayment());
                        newAccount.setPromoExpires(account.getPromoExpires()); // Added this line based on original
                                                                               // logic
                        newAccount.setStatus(account.getStatus());
                        newAccount.setOpenedDate(account.getOpenedDate()); // Added this line based on original logic
                        newAccount.setNotes(account.getNotes());
                        newAccount.setPrincipalPerMonth(account.getPrincipalPerMonth()); // Added this line based on
                                                                                         // original logic
                        newAccount.setPayoffDate(account.getPayoffDate()); // Added this line based on original logic
                        newAccount.setMonthsLeft(account.getMonthsLeft()); // Added this line based on original logic
                        newAccount.setPriority(account.getPriority()); // Added this line based on original logic
                        newAccount.setSnapshotDate(targetDate);
                        newAccount.setCreatedAt(LocalDateTime.now()); // Added this line based on original logic
                        newAccount.setUpdatedAt(LocalDateTime.now()); // Added this line based on original logic
                        return newAccount;
                    })
                    .collect(Collectors.toList());
        }

        List<Account> newAccounts = sourceAccounts.stream()
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
                    cloned.setSnapshotDate(targetDate);
                    cloned.setCreatedAt(LocalDateTime.now());
                    cloned.setUpdatedAt(LocalDateTime.now());
                    return cloned;
                })
                .collect(Collectors.toList());
        return newAccounts; // Added return statement for the DB available case
    }

    // Batch create or update accounts
    public List<Account> batchCreateOrUpdate(List<Account> accounts) {
        if (!isDbAvailable) {
            throw new IllegalStateException("Cannot save accounts in offline mode");
        }
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
