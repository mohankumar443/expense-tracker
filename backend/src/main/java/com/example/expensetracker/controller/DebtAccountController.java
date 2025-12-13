package com.example.expensetracker.controller;

import com.example.expensetracker.model.DebtAccount;
import com.example.expensetracker.model.AccountType;
import com.example.expensetracker.repository.DebtAccountRepository;
import com.example.expensetracker.dto.DebtSummary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import com.example.expensetracker.model.debt.Snapshot;

@RestController
@RequestMapping("/api/debts")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DebtAccountController {

    @Autowired
    private DebtAccountRepository debtAccountRepository;

    @Autowired
    private com.example.expensetracker.service.SnapshotLoaderService snapshotLoaderService;

    @Autowired
    private com.example.expensetracker.service.debt.SnapshotService snapshotService;

    @GetMapping
    public List<DebtAccount> getAllDebts() {
        return debtAccountRepository.findAll();
    }

    @GetMapping("/snapshot/{fileName}")
    public List<DebtAccount> getDebtsBySnapshot(@PathVariable String fileName) {
        try {
            return snapshotLoaderService.loadSnapshotFromFile(fileName);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load snapshot: " + fileName, e);
        }
    }

    @GetMapping("/snapshot/{fileName}/summary")
    public DebtSummary getSnapshotSummary(@PathVariable String fileName) {
        try {
            List<DebtAccount> accounts = snapshotLoaderService.loadSnapshotFromFile(fileName);
            String snapshotDate = snapshotLoaderService.getSnapshotDate(fileName);

            DebtSummary summary = new DebtSummary();
            summary.setSnapshotDate(snapshotDate);

            double total = accounts.stream().mapToDouble(DebtAccount::getCurrentBalance).sum();
            summary.setTotalDebt(total);

            double creditCards = accounts.stream()
                    .filter(a -> a.getAccountType() == AccountType.CREDIT_CARD)
                    .mapToDouble(DebtAccount::getCurrentBalance).sum();
            summary.setCreditCardDebt(creditCards);

            double personalLoans = accounts.stream()
                    .filter(a -> a.getAccountType() == AccountType.PERSONAL_LOAN)
                    .mapToDouble(DebtAccount::getCurrentBalance).sum();
            summary.setPersonalLoanDebt(personalLoans);

            double autoLoans = accounts.stream()
                    .filter(a -> a.getAccountType() == AccountType.AUTO_LOAN)
                    .mapToDouble(DebtAccount::getCurrentBalance).sum();
            summary.setAutoLoanDebt(autoLoans);

            summary.setTotalAccounts(accounts.size());

            return summary;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load snapshot summary: " + fileName, e);
        }
    }

    @GetMapping("/{id}")
    public DebtAccount getDebtById(@PathVariable String id) {
        return debtAccountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Debt account not found"));
    }

    @GetMapping("/type/{type}")
    public List<DebtAccount> getDebtsByType(@PathVariable AccountType type) {
        return debtAccountRepository.findByAccountType(type);
    }

    @PostMapping
    public DebtAccount createDebt(@RequestBody DebtAccount debtAccount) {
        debtAccount.setLastUpdated(LocalDate.now());
        return debtAccountRepository.save(debtAccount);
    }

    @PutMapping("/{id}")
    public DebtAccount updateDebt(@PathVariable String id, @RequestBody DebtAccount debtAccount) {
        DebtAccount existing = debtAccountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Debt account not found"));

        existing.setName(debtAccount.getName());
        existing.setAccountType(debtAccount.getAccountType());
        existing.setCurrentBalance(debtAccount.getCurrentBalance());
        // existing.setApr(debtAccount.getApr()); // APR removed from model
        existing.setMonthlyPayment(debtAccount.getMonthlyPayment());
        // existing.setPromoExpirationDate(debtAccount.getPromoExpirationDate()); //
        // Removed? Wait, checking model
        existing.setNotes(debtAccount.getNotes());
        existing.setLastUpdated(LocalDate.now());

        return debtAccountRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public void deleteDebt(@PathVariable String id) {
        debtAccountRepository.deleteById(id);
    }

    @GetMapping("/summary")
    public DebtSummary getDebtSummary() {
        DebtSummary summary = new DebtSummary();

        // Set snapshot date (you can make this dynamic later)
        summary.setSnapshotDate("2025-09-30");

        List<DebtAccount> allAccounts = debtAccountRepository.findAll();

        double total = allAccounts.stream()
                .mapToDouble(DebtAccount::getCurrentBalance)
                .sum();
        summary.setTotalDebt(total);

        double creditCards = allAccounts.stream()
                .filter(a -> a.getAccountType() == AccountType.CREDIT_CARD)
                .mapToDouble(DebtAccount::getCurrentBalance)
                .sum();
        summary.setCreditCardDebt(creditCards);

        double personalLoans = allAccounts.stream()
                .filter(a -> a.getAccountType() == AccountType.PERSONAL_LOAN)
                .mapToDouble(DebtAccount::getCurrentBalance)
                .sum();
        summary.setPersonalLoanDebt(personalLoans);

        double autoLoans = allAccounts.stream()
                .filter(a -> a.getAccountType() == AccountType.AUTO_LOAN)
                .mapToDouble(DebtAccount::getCurrentBalance)
                .sum();
        summary.setAutoLoanDebt(autoLoans);

        summary.setTotalAccounts(allAccounts.size());

        return summary;
    }

    @GetMapping("/strategy")
    public List<DebtAccount> getPayoffStrategy() {
        // Return debts (Avalanche method removed as APR is removed from model)
        // Returning all debts for now
        return debtAccountRepository.findAll();
    }

    @GetMapping("/snapshots")
    public List<com.example.expensetracker.dto.SnapshotInfo> getAvailableSnapshots() {
        // Fetch all snapshots from database
        List<Snapshot> snapshots = snapshotService.getAllSnapshots();

        // Convert to SnapshotInfo DTOs
        return snapshots.stream()
                .map(snapshot -> {
                    com.example.expensetracker.dto.SnapshotInfo info = new com.example.expensetracker.dto.SnapshotInfo();
                    info.setSnapshotDate(snapshot.getSnapshotDate().toString());

                    // Format display name as "Month Year"
                    String displayName = snapshot.getSnapshotDate().getMonth().toString().charAt(0)
                            + snapshot.getSnapshotDate().getMonth().toString().substring(1).toLowerCase()
                            + " " + snapshot.getSnapshotDate().getYear();
                    info.setDisplayName(displayName);

                    // You can set fileName if needed, or use snapshotDate as identifier
                    info.setFileName(snapshot.getSnapshotDate().toString());
                    info.setActive(true); // or determine based on your logic

                    return info;
                })
                .collect(Collectors.toList());
    }
}
