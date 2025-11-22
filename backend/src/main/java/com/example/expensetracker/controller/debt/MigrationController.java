package com.example.expensetracker.controller.debt;

import com.example.expensetracker.repository.debt.AccountRepository;
import com.example.expensetracker.repository.debt.SnapshotRepository;
import com.example.expensetracker.service.debt.MigrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debt/migration")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class MigrationController {

    private final AccountRepository accountRepository;
    private final SnapshotRepository snapshotRepository;
    private final MigrationService migrationService;

    @PostMapping("/clear-and-reload")
    public Map<String, String> clearAndReload() {
        log.info("Clearing all snapshots and accounts...");
        
        // Clear all data
        accountRepository.deleteAll();
        snapshotRepository.deleteAll();
        
        log.info("Triggering migration...");
        
        // Trigger migration
        migrationService.migrateData();
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Data cleared and reloaded successfully");
        
        return response;
    }
}
