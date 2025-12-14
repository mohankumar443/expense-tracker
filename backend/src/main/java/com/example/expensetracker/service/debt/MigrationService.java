package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.model.debt.Snapshot.SnapshotMetadata;
import com.example.expensetracker.repository.debt.AccountRepository;
import com.example.expensetracker.repository.debt.SnapshotRepository;
import com.example.expensetracker.service.DebtStrategyService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MigrationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MigrationService.class);

    private final AccountRepository accountRepository;
    private final SnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;
    private final DebtStrategyService debtStrategyService;

    // List of snapshot files to migrate (including August)
    private static final String[] SNAPSHOT_FILES = {
            "debt-snapshot-2025-08.json",
            "debt-snapshot-2025-09.json",
            "debt-snapshot-2025-10.json",
            "debt-snapshot-2025-11.json"
    };

    @PostConstruct
    public void migrateData() {
        log.info("Starting data migration from JSON files to MongoDB...");

        // Quick guard: if Mongo is unavailable, skip migration to avoid startup delays
        try {
            accountRepository.count();
        } catch (Exception e) {
            log.warn("MongoDB not reachable, skipping migration. Running in file-snapshot mode only. Reason: {}",
                    e.getMessage());
            return;
        }

        for (String fileName : SNAPSHOT_FILES) {
            try {
                migrateSnapshotFile(fileName);
            } catch (Exception e) {
                log.error("Failed to migrate file: " + fileName, e);
            }
        }

        log.info("Data migration completed successfully.");
    }

    private void migrateSnapshotFile(String fileName) throws IOException {
        ClassPathResource resource = new ClassPathResource(fileName);
        if (!resource.exists()) {
            log.warn("Snapshot file not found: {}", fileName);
            return;
        }

        JsonNode root = objectMapper.readTree(resource.getInputStream());
        String dateStr = root.get("snapshotDate").asText();
        LocalDate snapshotDate = LocalDate.parse(dateStr);

        // Capture existing accounts to preserve user-updated fields (e.g., credit limits)
        Map<String, Double> existingLimits = new HashMap<>();
        snapshotRepository.findBySnapshotDate(snapshotDate).ifPresent(existing -> {
            log.info("Snapshot for date {} already exists. Replacing with latest file data.", snapshotDate);
            try {
                accountRepository.findBySnapshotDate(snapshotDate).forEach(acc -> {
                    if (acc.getCreditLimit() != null) {
                        existingLimits.put(acc.getAccountId() != null ? acc.getAccountId() : acc.getName(), acc.getCreditLimit());
                    }
                });
            } catch (Exception e) {
                log.warn("Could not read existing accounts for date {} to preserve limits: {}", snapshotDate, e.getMessage());
            }
            try {
                accountRepository.deleteBySnapshotDate(snapshotDate);
            } catch (Exception e) {
                log.warn("Could not delete existing accounts for date: {}", snapshotDate);
            }
            try {
                snapshotRepository.delete(existing);
            } catch (Exception e) {
                log.warn("Could not delete existing snapshot for date: {}", snapshotDate);
            }
        });

        // Create Snapshot Entity
        Snapshot snapshot = new Snapshot();
        snapshot.setSnapshotDate(snapshotDate);
        snapshot.setTotalDebt(root.get("totalDebt").asDouble());

        // Extract category totals
        if (root.has("creditCards")) {
            snapshot.setCreditCardDebt(root.get("creditCards").get("total").asDouble());
        }
        if (root.has("personalLoans")) {
            snapshot.setPersonalLoanDebt(root.get("personalLoans").get("total").asDouble());
        }
        if (root.has("autoLoan")) {
            snapshot.setAutoLoanDebt(root.get("autoLoan").get("total").asDouble());
        }

        // Calculate totals
        int totalAccounts = 0;
        int activeAccounts = 0;
        int paidOffAccounts = 0;
        double totalMonthlyPayment = 0;

        // Helper to process accounts list from JSON
        List<JsonNode> allAccountsJson = new ArrayList<>();
        if (root.has("creditCards"))
            root.get("creditCards").get("accounts").forEach(allAccountsJson::add);
        if (root.has("personalLoans"))
            root.get("personalLoans").get("accounts").forEach(allAccountsJson::add);
        if (root.has("autoLoan"))
            root.get("autoLoan").get("accounts").forEach(allAccountsJson::add);

        for (JsonNode acc : allAccountsJson) {
            totalAccounts++;
            double balance = acc.get("balance").asDouble();
            if (balance > 0) {
                activeAccounts++;
            } else {
                paidOffAccounts++;
            }
            if (acc.has("monthlyPayment")) {
                totalMonthlyPayment += acc.get("monthlyPayment").asDouble();
            }
        }

        snapshot.setTotalAccounts(totalAccounts);
        snapshot.setActiveAccounts(activeAccounts);
        snapshot.setPaidOffAccounts(paidOffAccounts);
        snapshot.setTotalMonthlyPayment(totalMonthlyPayment);

        // Metadata (simplified for now)
        SnapshotMetadata metadata = new SnapshotMetadata();
        metadata.setPaymentsThisMonth(0); // Placeholder
        snapshot.setMetadata(metadata);

        snapshot.setCreatedAt(LocalDateTime.now());

        snapshotRepository.save(snapshot);
        log.info("Migrated snapshot for {}", snapshotDate);

        // Migrate accounts for this snapshot
        try {
            accountRepository.deleteBySnapshotDate(snapshotDate);
        } catch (Exception e) {
            log.warn("Could not delete existing accounts for date: {}", snapshotDate);
        }

        List<Account> snapshotAccounts = new ArrayList<>();
        snapshotAccounts.addAll(processCategoryAccounts(root, "creditCards", AccountType.CREDIT_CARD, snapshotDate, existingLimits));
        snapshotAccounts
                .addAll(processCategoryAccounts(root, "personalLoans", AccountType.PERSONAL_LOAN, snapshotDate, existingLimits));
        snapshotAccounts.addAll(processCategoryAccounts(root, "autoLoan", AccountType.AUTO_LOAN, snapshotDate, existingLimits));

        // Calculate and Enrich
        for (Account account : snapshotAccounts) {
            debtStrategyService.calculateAndEnrich(account);
        }

        // Calculate Priorities
        debtStrategyService.calculatePriorities(snapshotAccounts);

        // Save All
        accountRepository.saveAll(snapshotAccounts);
    }

    private List<Account> processCategoryAccounts(JsonNode root, String category, AccountType type,
            LocalDate snapshotDate, Map<String, Double> existingLimits) {
        List<Account> accounts = new ArrayList<>();
        if (!root.has(category))
            return accounts;

        JsonNode categoryNode = root.get(category);
        if (categoryNode.has("accounts")) {
            for (JsonNode accNode : categoryNode.get("accounts")) {
                Account account = new Account();
                account.setName(accNode.get("name").asText());
                account.setType(type);
                account.setCurrentBalance(accNode.get("balance").asDouble());
                if (type == AccountType.CREDIT_CARD) {
                    String key = account.getName().toLowerCase().replaceAll("\\s+", "-");
                    double limit = 1000.0;
                    if (accNode.has("creditLimit")) {
                        limit = accNode.get("creditLimit").asDouble();
                    } else if (existingLimits.containsKey(key)) {
                        limit = existingLimits.get(key);
                    }
                    account.setCreditLimit(limit);
                }
                account.setApr(accNode.get("apr").asDouble());
                account.setSnapshotDate(snapshotDate);

                if (accNode.has("monthlyPayment")) {
                    account.setMonthlyPayment(accNode.get("monthlyPayment").asDouble());
                }

                if (accNode.has("notes")) {
                    account.setNotes(accNode.get("notes").asText());
                }

                // Generate a consistent ID or use name as ID for now
                String accountId = account.getName().toLowerCase().replaceAll("\\s+", "-");
                account.setAccountId(accountId);

                if (account.getCurrentBalance() > 0) {
                    account.setStatus(AccountStatus.ACTIVE);
                } else {
                    account.setStatus(AccountStatus.PAID_OFF);
                }

                account.setCreatedAt(LocalDateTime.now());
                account.setUpdatedAt(LocalDateTime.now());

                accounts.add(account);
            }
        }
        return accounts;
    }
}
