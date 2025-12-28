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
        return snapshotRepository.findTopByOrderBySnapshotDateDesc();
    }
}
