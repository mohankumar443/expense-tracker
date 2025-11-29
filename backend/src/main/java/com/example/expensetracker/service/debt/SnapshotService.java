package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.repository.debt.SnapshotRepository;
import com.example.expensetracker.repository.debt.AccountRepository;
import com.example.expensetracker.service.DebtStrategyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class SnapshotService {

        private final SnapshotRepository snapshotRepository;
        private final AccountRepository accountRepository;
        private final FileSnapshotService fileSnapshotService;

        private final DebtStrategyService debtStrategyService;

        private boolean isDbAvailable = true; // Optimistic default

        public List<Snapshot> getAllSnapshots() {
                try {
                        if (isDbAvailable) {
                                return snapshotRepository.findAllByOrderBySnapshotDateDesc();
                        }
                } catch (Exception e) {
                        log.warn("MongoDB unavailable, falling back to file storage: {}", e.getMessage());
                        isDbAvailable = false;
                }
                return fileSnapshotService.getAllSnapshots();
        }

        public Optional<Snapshot> getSnapshotByDate(LocalDate date) {
                try {
                        if (isDbAvailable) {
                                return snapshotRepository.findBySnapshotDate(date);
                        }
                } catch (Exception e) {
                        log.warn("MongoDB unavailable, falling back to file storage");
                        isDbAvailable = false;
                }
                return fileSnapshotService.getSnapshotByDate(date);
        }

        // Group snapshots by year for the UI hierarchy
        public Map<Integer, List<Snapshot>> getSnapshotsGroupedByYear() {
                List<Snapshot> allSnapshots = getAllSnapshots(); // Use the safe method

                return allSnapshots.stream()
                                .collect(Collectors.groupingBy(
                                                s -> s.getSnapshotDate().getYear(),
                                                TreeMap::new, // Sort years naturally (though we might want reverse
                                                              // later)
                                                Collectors.toList()));
        }

        // Get available years
        public List<Integer> getAvailableYears() {
                return getAllSnapshots().stream() // Use safe method
                                .map(s -> s.getSnapshotDate().getYear())
                                .distinct()
                                .sorted(Comparator.reverseOrder())
                                .collect(Collectors.toList());
        }

        // Get snapshots for a specific year
        public List<Snapshot> getSnapshotsForYear(int year) {
                try {
                        if (isDbAvailable) {
                                LocalDate startDate = LocalDate.of(year, 1, 1);
                                LocalDate endDate = LocalDate.of(year, 12, 31);
                                return snapshotRepository.findBySnapshotDateBetween(startDate, endDate);
                        }
                } catch (Exception e) {
                        isDbAvailable = false;
                }
                // Fallback: filter from all snapshots
                return getAllSnapshots().stream()
                                .filter(s -> s.getSnapshotDate().getYear() == year)
                                .collect(Collectors.toList());
        }

        // Create new snapshot (optionally clone from another date)
        public Snapshot createSnapshot(LocalDate snapshotDate, LocalDate cloneFromDate) {
                if (!isDbAvailable) {
                        throw new IllegalStateException("Cannot create snapshots in offline mode");
                }
                // Check if snapshot already exists
                if (snapshotRepository.findBySnapshotDate(snapshotDate).isPresent()) {
                        throw new IllegalArgumentException("Snapshot already exists for date: " + snapshotDate);
                }

                Snapshot snapshot = new Snapshot();
                snapshot.setSnapshotDate(snapshotDate);
                snapshot.setCreatedAt(LocalDateTime.now());

                // Initialize with zeros
                snapshot.setTotalDebt(0.0);
                snapshot.setCreditCardDebt(0.0);
                snapshot.setPersonalLoanDebt(0.0);
                snapshot.setAutoLoanDebt(0.0);
                snapshot.setTotalAccounts(0);
                snapshot.setActiveAccounts(0);
                snapshot.setPaidOffAccounts(0);
                snapshot.setTotalMonthlyPayment(0.0);
                snapshot.setTotalMonthlyInterest(0.0);
                snapshot.setPerformanceScore(0);

                return snapshotRepository.save(snapshot);
        }

        // Update snapshot with recalculated totals from accounts
        public Snapshot updateSnapshotFromAccounts(LocalDate snapshotDate, List<Account> accounts) {
                if (!isDbAvailable) {
                        // In offline mode, we can't save updates, but we can return a calculated
                        // snapshot for display if needed
                        // For now, throw exception or return dummy
                        throw new IllegalStateException("Cannot update snapshots in offline mode");
                }
                Snapshot snapshot = snapshotRepository.findBySnapshotDate(snapshotDate)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Snapshot not found for date: " + snapshotDate));

                // Calculate priorities before saving
                debtStrategyService.calculatePriorities(accounts);
                accountRepository.saveAll(accounts); // Save updated priorities

                // Calculate totals
                double totalDebt = accounts.stream()
                                .filter(a -> a.getStatus() == Account.AccountStatus.ACTIVE)
                                .mapToDouble(Account::getCurrentBalance)
                                .sum();

                double creditCardDebt = accounts.stream()
                                .filter(a -> a.getType() == Account.AccountType.CREDIT_CARD
                                                && a.getStatus() == Account.AccountStatus.ACTIVE)
                                .mapToDouble(Account::getCurrentBalance)
                                .sum();

                double personalLoanDebt = accounts.stream()
                                .filter(a -> a.getType() == Account.AccountType.PERSONAL_LOAN
                                                && a.getStatus() == Account.AccountStatus.ACTIVE)
                                .mapToDouble(Account::getCurrentBalance)
                                .sum();

                double autoLoanDebt = accounts.stream()
                                .filter(a -> a.getType() == Account.AccountType.AUTO_LOAN
                                                && a.getStatus() == Account.AccountStatus.ACTIVE)
                                .mapToDouble(Account::getCurrentBalance)
                                .sum();

                int totalAccounts = accounts.size();
                int activeAccounts = (int) accounts.stream()
                                .filter(a -> a.getStatus() == Account.AccountStatus.ACTIVE)
                                .count();
                int paidOffAccounts = (int) accounts.stream()
                                .filter(a -> a.getStatus() == Account.AccountStatus.PAID_OFF)
                                .count();

                double totalMonthlyPayment = accounts.stream()
                                .filter(a -> a.getStatus() == Account.AccountStatus.ACTIVE)
                                .mapToDouble(a -> a.getMonthlyPayment() != null ? a.getMonthlyPayment() : 0.0)
                                .sum();

                double totalMonthlyInterest = accounts.stream()
                                .filter(a -> a.getStatus() == Account.AccountStatus.ACTIVE && a.getApr() != null)
                                .mapToDouble(a -> (a.getCurrentBalance() * a.getApr()) / 100 / 12)
                                .sum();

                // Update snapshot
                snapshot.setTotalDebt(totalDebt);
                snapshot.setCreditCardDebt(creditCardDebt);
                snapshot.setPersonalLoanDebt(personalLoanDebt);
                snapshot.setAutoLoanDebt(autoLoanDebt);
                snapshot.setTotalAccounts(totalAccounts);
                snapshot.setActiveAccounts(activeAccounts);
                snapshot.setPaidOffAccounts(paidOffAccounts);
                snapshot.setTotalMonthlyPayment(totalMonthlyPayment);
                snapshot.setTotalMonthlyInterest(totalMonthlyInterest);

                // Calculate performance score (simple formula)
                int performanceScore = calculatePerformanceScore(totalDebt, totalMonthlyPayment, totalMonthlyInterest);
                snapshot.setPerformanceScore(performanceScore);

                return snapshotRepository.save(snapshot);
        }

        // Check if snapshot exists
        public boolean snapshotExists(LocalDate date) {
                try {
                        if (isDbAvailable) {
                                return snapshotRepository.findBySnapshotDate(date).isPresent();
                        }
                } catch (Exception e) {
                        isDbAvailable = false;
                }
                return fileSnapshotService.getSnapshotByDate(date).isPresent();
        }

        // Delete snapshot and its accounts
        public void deleteSnapshot(LocalDate date) {
                if (!isDbAvailable) {
                        throw new IllegalStateException("Cannot delete snapshots in offline mode");
                }
                // Delete all accounts for this snapshot
                accountRepository.deleteBySnapshotDate(date);

                // Delete the snapshot
                snapshotRepository.findBySnapshotDate(date)
                                .ifPresent(snapshotRepository::delete);
        }

        private int calculatePerformanceScore(double totalDebt, double monthlyPayment, double monthlyInterest) {
                if (totalDebt == 0)
                        return 100;

                double paymentRatio = monthlyPayment / totalDebt * 100;
                double interestRatio = monthlyInterest / monthlyPayment * 100;

                int score = (int) (paymentRatio * 0.6 - interestRatio * 0.4);
                return Math.max(0, Math.min(100, score));
        }
}
