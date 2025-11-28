package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Snapshot;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileSnapshotService {

    private final ObjectMapper objectMapper;
    private static final String SNAPSHOT_PATTERN = "classpath:debt-snapshot-*.json";

    // Cache to avoid reading files on every request
    private List<Snapshot> cachedSnapshots = null;
    private Map<LocalDate, List<Account>> cachedAccounts = new HashMap<>();

    public List<Snapshot> getAllSnapshots() {
        if (cachedSnapshots == null) {
            loadData();
        }
        return cachedSnapshots;
    }

    public Optional<Snapshot> getSnapshotByDate(LocalDate date) {
        if (cachedSnapshots == null) {
            loadData();
        }
        return cachedSnapshots.stream()
                .filter(s -> s.getSnapshotDate().equals(date))
                .findFirst();
    }

    public List<Account> getAccountsBySnapshotDate(LocalDate date) {
        if (cachedSnapshots == null) {
            loadData();
        }
        return cachedAccounts.getOrDefault(date, new ArrayList<>());
    }

    private synchronized void loadData() {
        if (cachedSnapshots != null)
            return;

        cachedSnapshots = new ArrayList<>();
        cachedAccounts = new HashMap<>();

        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources(SNAPSHOT_PATTERN);

            for (Resource resource : resources) {
                try {
                    // Read JSON into a Map first to extract data manually
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = objectMapper.readValue(resource.getInputStream(),
                            new TypeReference<Map<String, Object>>() {
                            });

                    String dateStr = (String) data.get("snapshotDate");
                    LocalDate date = LocalDate.parse(dateStr);

                    // Create Snapshot object
                    Snapshot snapshot = new Snapshot();
                    snapshot.setSnapshotDate(date);
                    snapshot.setTotalDebt(getDouble(data, "totalDebt"));

                    // Extract Accounts and other totals
                    List<Account> accounts = new ArrayList<>();

                    // Credit Cards
                    @SuppressWarnings("unchecked")
                    Map<String, Object> ccData = (Map<String, Object>) data.get("creditCards");
                    if (ccData != null) {
                        snapshot.setCreditCardDebt(getDouble(ccData, "total"));
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> ccAccounts = (List<Map<String, Object>>) ccData.get("accounts");
                        if (ccAccounts != null) {
                            for (Map<String, Object> accData : ccAccounts) {
                                accounts.add(mapAccount(accData, Account.AccountType.CREDIT_CARD, date));
                            }
                        }
                    }

                    // Personal Loans
                    @SuppressWarnings("unchecked")
                    Map<String, Object> plData = (Map<String, Object>) data.get("personalLoans");
                    if (plData != null) {
                        snapshot.setPersonalLoanDebt(getDouble(plData, "total"));
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> plAccounts = (List<Map<String, Object>>) plData.get("accounts");
                        if (plAccounts != null) {
                            for (Map<String, Object> accData : plAccounts) {
                                accounts.add(mapAccount(accData, Account.AccountType.PERSONAL_LOAN, date));
                            }
                        }
                    }

                    // Auto Loans
                    @SuppressWarnings("unchecked")
                    Map<String, Object> alData = (Map<String, Object>) data.get("autoLoan");
                    if (alData != null) {
                        snapshot.setAutoLoanDebt(getDouble(alData, "total"));
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> alAccounts = (List<Map<String, Object>>) alData.get("accounts");
                        if (alAccounts != null) {
                            for (Map<String, Object> accData : alAccounts) {
                                accounts.add(mapAccount(accData, Account.AccountType.AUTO_LOAN, date));
                            }
                        }
                    }

                    // Calculate other fields
                    snapshot.setTotalAccounts(accounts.size());
                    snapshot.setActiveAccounts(
                            (int) accounts.stream().filter(a -> a.getStatus() == Account.AccountStatus.ACTIVE).count());

                    cachedSnapshots.add(snapshot);
                    cachedAccounts.put(date, accounts);

                } catch (Exception e) {
                    log.error("Failed to parse snapshot file: " + resource.getFilename(), e);
                }
            }

            // Sort snapshots by date descending
            cachedSnapshots.sort((a, b) -> b.getSnapshotDate().compareTo(a.getSnapshotDate()));

        } catch (IOException e) {
            log.error("Failed to load snapshot resources", e);
        }
    }

    private Account mapAccount(Map<String, Object> data, Account.AccountType type, LocalDate date) {
        Account account = new Account();
        account.setName((String) data.get("name"));
        account.setType(type);
        account.setCurrentBalance(getDouble(data, "balance"));
        account.setApr(getDouble(data, "apr"));
        account.setMonthlyPayment(getDouble(data, "monthlyPayment"));
        account.setNotes((String) data.get("notes"));
        account.setSnapshotDate(date);
        account.setStatus(Account.AccountStatus.ACTIVE);
        return account;
    }

    private double getDouble(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) {
            return ((Number) val).doubleValue();
        }
        return 0.0;
    }
}
