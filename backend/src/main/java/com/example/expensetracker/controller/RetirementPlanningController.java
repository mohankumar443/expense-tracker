package com.example.expensetracker.controller;

import com.example.expensetracker.dto.RetirementPlanRequest;
import com.example.expensetracker.dto.RetirementPlanResponse;
import com.example.expensetracker.model.retirement.RetirementSnapshot;
import com.example.expensetracker.repository.retirement.RetirementSnapshotRepository;
import com.example.expensetracker.service.RetirementPlanningService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/retirement")
@CrossOrigin(origins = "*")
public class RetirementPlanningController {
    private final RetirementPlanningService retirementPlanningService;
    private final RetirementSnapshotRepository snapshotRepository;

    public RetirementPlanningController(RetirementPlanningService retirementPlanningService,
            RetirementSnapshotRepository snapshotRepository) {
        this.retirementPlanningService = retirementPlanningService;
        this.snapshotRepository = snapshotRepository;
    }

    @PostMapping("/plan")
    public RetirementPlanResponse getPlan(@RequestBody RetirementPlanRequest request) {
        return retirementPlanningService.evaluatePlan(request);
    }

    @GetMapping("/history")
    public List<RetirementSnapshot> getAllSnapshots() {
        return snapshotRepository.findAllByOrderBySnapshotDateDesc();
    }

    @GetMapping("/snapshots/{year}")
    public List<RetirementSnapshot> getSnapshotsByYear(@PathVariable int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year + 1, 1, 1);
        return snapshotRepository.findByYear(yearStart, yearEnd);
    }

    @GetMapping("/snapshot/{monthYear}")
    public Optional<RetirementSnapshot> getSnapshotByMonth(@PathVariable String monthYear) {
        try {
            LocalDate monthStart = LocalDate.parse(monthYear + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            LocalDate monthEnd = monthStart.plusMonths(1);
            List<RetirementSnapshot> snapshots = snapshotRepository.findBySnapshotDateBetween(monthStart, monthEnd);
            return snapshots.stream()
                    .filter(this::hasNonZeroSnapshot)
                    .max((a, b) -> a.getSnapshotDate().compareTo(b.getSnapshotDate()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @GetMapping("/snapshot/date/{date}")
    public Optional<RetirementSnapshot> getSnapshotByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            return snapshotRepository.findBySnapshotDate(date);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @DeleteMapping("/snapshot/{monthYear}")
    public void deleteSnapshotByMonth(@PathVariable String monthYear) {
        try {
            LocalDate monthStart = LocalDate.parse(monthYear + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            LocalDate monthEnd = monthStart.plusMonths(1);
            List<RetirementSnapshot> snapshots = snapshotRepository.findBySnapshotDateBetween(monthStart, monthEnd);
            if (!snapshots.isEmpty()) {
                snapshotRepository.deleteAll(snapshots);
            }
        } catch (Exception e) {
            // No-op on invalid date formats or missing snapshots.
        }
    }

    @PostMapping("/snapshot/clone")
    public void cloneSnapshot(@RequestBody CloneSnapshotRequest request) {
        if (request == null || request.sourceMonthYear == null || request.targetMonthYear == null) {
            return;
        }
        try {
            LocalDate sourceStart = LocalDate.parse(request.sourceMonthYear + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            LocalDate sourceEnd = sourceStart.plusMonths(1);
            List<RetirementSnapshot> sourceSnapshots = snapshotRepository.findBySnapshotDateBetween(sourceStart, sourceEnd);
            RetirementSnapshot source = sourceSnapshots.stream()
                    .filter(this::hasNonZeroSnapshot)
                    .max((a, b) -> a.getSnapshotDate().compareTo(b.getSnapshotDate()))
                    .orElse(null);
            if (source == null) {
                return;
            }

            LocalDate targetStart = LocalDate.parse(request.targetMonthYear + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            LocalDate targetEnd = targetStart.plusMonths(1);
            List<RetirementSnapshot> targetSnapshots = snapshotRepository.findBySnapshotDateBetween(targetStart, targetEnd);
            if (!targetSnapshots.isEmpty()) {
                snapshotRepository.deleteAll(targetSnapshots);
            }

            RetirementSnapshot target = new RetirementSnapshot();
            target.setSnapshotDate(targetStart);
            target.setCurrentAge(source.getCurrentAge());
            target.setAccounts(cloneAccounts(source.getAccounts()));
            target.setOneTimeAdditions(source.getOneTimeAdditions());
            target.setTotalBalance(source.getTotalBalance());
            target.setTargetPortfolioValue(source.getTargetPortfolioValue());
            target.setTotalContributions(source.getTotalContributions());
            target.setAfterTaxMode(source.getAfterTaxMode());
            target.setFlatTaxRate(source.getFlatTaxRate());
            target.setTaxFreeRate(source.getTaxFreeRate());
            target.setTaxDeferredRate(source.getTaxDeferredRate());
            target.setTaxableRate(source.getTaxableRate());

            snapshotRepository.save(target);
        } catch (Exception e) {
            // No-op on invalid input.
        }
    }

    private List<com.example.expensetracker.model.retirement.AccountBalance> cloneAccounts(
            List<com.example.expensetracker.model.retirement.AccountBalance> accounts) {
        if (accounts == null) {
            return null;
        }
        return accounts.stream().map(acc -> {
            com.example.expensetracker.model.retirement.AccountBalance copy =
                    new com.example.expensetracker.model.retirement.AccountBalance();
            copy.setAccountType(acc.getAccountType());
            copy.setGoalType(acc.getGoalType());
            copy.setBalance(acc.getBalance());
            copy.setContribution(acc.getContribution());
            copy.setPreviousBalance(acc.getPreviousBalance());
            return copy;
        }).toList();
    }

    public static class CloneSnapshotRequest {
        public String sourceMonthYear;
        public String targetMonthYear;
    }

    @GetMapping("/latest")
    public Optional<RetirementSnapshot> getLatestSnapshot() {
        List<RetirementSnapshot> snapshots = snapshotRepository.findAllByOrderBySnapshotDateDesc();
        for (RetirementSnapshot snapshot : snapshots) {
            if (hasNonZeroSnapshot(snapshot)) {
                return Optional.of(snapshot);
            }
        }
        return Optional.empty();
    }

    private boolean hasNonZeroSnapshot(RetirementSnapshot snapshot) {
        if (snapshot == null) {
            return false;
        }
        if (snapshot.getTotalBalance() != null && snapshot.getTotalBalance() > 0) {
            return true;
        }
        if (snapshot.getTotalContributions() != null && snapshot.getTotalContributions() > 0) {
            return true;
        }
        if (snapshot.getAccounts() == null) {
            return false;
        }
        return snapshot.getAccounts().stream()
                .anyMatch(acc -> acc.getBalance() != null && acc.getBalance() > 0);
    }
}
