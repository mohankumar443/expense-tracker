package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Account.AccountStatus;
import com.example.expensetracker.model.debt.Account.AccountType;
import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.model.debt.Snapshot.SnapshotMetadata;
import com.example.expensetracker.repository.debt.AccountRepository;
import com.example.expensetracker.repository.debt.SnapshotRepository;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    private final AccountRepository accountRepository;
    private final SnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    // List of snapshot files to migrate (including August)
    private static final String[] SNAPSHOT_FILES = {
        "debt-snapshot-2025-08.json",
        "debt-snapshot-2025-09.json",
        "debt-snapshot-2025-10.json"
    };

    @PostConstruct
    public void migrateData() {
        log.info("Starting data migration from JSON files to MongoDB...");

        for (String fileName : SNAPSHOT_FILES) {
            try {
                migrateSnapshotFile(fileName);
            } catch (Exception e) {
                log.error("Failed to migrate file: " + fileName, e);
            }
        }
        
        // After migrating all snapshots, ensure the 'active' accounts in the accounts collection 
        // reflect the latest snapshot (Oct 2025)
        updateActiveAccountsFromLatestSnapshot("debt-snapshot-2025-10.json");

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

        // Check if snapshot already exists to avoid duplicates
        if (snapshotRepository.findBySnapshotDate(snapshotDate).isPresent()) {
            log.info("Snapshot for date {} already exists. Skipping.", snapshotDate);
            return;
        }


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
        List<JsonNode> allAccounts = new ArrayList<>();
        if (root.has("creditCards")) root.get("creditCards").get("accounts").forEach(allAccounts::add);
        if (root.has("personalLoans")) root.get("personalLoans").get("accounts").forEach(allAccounts::add);
        if (root.has("autoLoan")) root.get("autoLoan").get("accounts").forEach(allAccounts::add);

        for (JsonNode acc : allAccounts) {
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
    }

    private void updateActiveAccountsFromLatestSnapshot(String fileName) {
        try {
            ClassPathResource resource = new ClassPathResource(fileName);
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            
            // Clear existing accounts to avoid duplicates during dev/testing
            // In production, you might want a smarter merge strategy
            accountRepository.deleteAll(); 

            processCategoryAccounts(root, "creditCards", AccountType.CREDIT_CARD);
            processCategoryAccounts(root, "personalLoans", AccountType.PERSONAL_LOAN);
            processCategoryAccounts(root, "autoLoan", AccountType.AUTO_LOAN);
            
            log.info("Updated active accounts from {}", fileName);
            
        } catch (Exception e) {
            log.error("Failed to update active accounts", e);
        }
    }

    private void processCategoryAccounts(JsonNode root, String category, AccountType type) {
        if (!root.has(category)) return;
        
        JsonNode categoryNode = root.get(category);
        if (categoryNode.has("accounts")) {
            for (JsonNode accNode : categoryNode.get("accounts")) {
                Account account = new Account();
                account.setName(accNode.get("name").asText());
                account.setType(type);
                account.setCurrentBalance(accNode.get("balance").asDouble());
                account.setApr(accNode.get("apr").asDouble());
                
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
                
                accountRepository.save(account);
            }
        }
    }
}
