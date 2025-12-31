package com.example.expensetracker.controller;

import com.example.expensetracker.dto.RetirementPlanRequest;
import com.example.expensetracker.dto.RetirementPlanResponse;
import com.example.expensetracker.model.retirement.RetirementSnapshot;
import com.example.expensetracker.repository.retirement.RetirementSnapshotRepository;
import com.example.expensetracker.service.RetirementPlanningService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    @GetMapping("/snapshots/{year}")
    public List<RetirementSnapshot> getSnapshotsByYear(@PathVariable int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year + 1, 1, 1);
        return snapshotRepository.findByYear(yearStart, yearEnd);
    }

    @GetMapping("/snapshots/latest")
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
