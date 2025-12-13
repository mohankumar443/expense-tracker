package com.example.expensetracker.controller.debt;

import com.example.expensetracker.model.debt.Account;
import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.service.debt.AccountService;
import com.example.expensetracker.service.debt.SnapshotService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/debt/snapshots/manage")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SnapshotManagementController {

    private final SnapshotService snapshotService;
    private final AccountService accountService;

    // Create new snapshot (optionally clone from another month)
    @PostMapping("/create")
    public ResponseEntity<SnapshotCreationResponse> createSnapshot(@RequestBody CreateSnapshotRequest request) {
        try {
            // Create the snapshot
            Snapshot snapshot = snapshotService.createSnapshot(request.getSnapshotDate(), request.getCloneFromDate());

            List<Account> accounts = null;

            // If cloning, copy accounts from source date
            if (request.getCloneFromDate() != null) {
                accounts = accountService.cloneAccountsForNewSnapshot(
                        request.getCloneFromDate(),
                        request.getSnapshotDate());

                // Save cloned accounts
                accounts = accountService.batchCreateOrUpdate(accounts);

                // Update snapshot with calculated totals
                snapshot = snapshotService.updateSnapshotFromAccounts(request.getSnapshotDate(), accounts);
            }

            SnapshotCreationResponse response = new SnapshotCreationResponse();
            response.setSnapshot(snapshot);
            response.setAccounts(accounts);
            response.setMessage("Snapshot created successfully");

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Batch update accounts for a snapshot
    @PostMapping("/{date}/accounts/batch")
    public ResponseEntity<Snapshot> updateSnapshotAccounts(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody List<Account> accounts) {
        try {
            // Ensure all accounts have the correct snapshot date
            accounts.forEach(account -> account.setSnapshotDate(date));

            // Save all accounts
            accountService.batchCreateOrUpdate(accounts);

            // Recalculate and update snapshot totals
            Snapshot updatedSnapshot = snapshotService.updateSnapshotFromAccounts(date, accounts);

            return ResponseEntity.ok(updatedSnapshot);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Update snapshot metadata
    @PutMapping("/{date}")
    public ResponseEntity<Snapshot> updateSnapshot(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Snapshot snapshot) {
        try {
            snapshot.setSnapshotDate(date);
            List<Account> accounts = accountService.getAccountsBySnapshotDate(date);
            return ResponseEntity.ok(snapshotService.updateSnapshotFromAccounts(date, accounts));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete snapshot and its accounts
    @DeleteMapping("/{date}")
    public ResponseEntity<Void> deleteSnapshot(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        snapshotService.deleteSnapshot(date);
        return ResponseEntity.noContent().build();
    }

    // Check if snapshot exists
    @GetMapping("/{date}/exists")
    public ResponseEntity<Boolean> snapshotExists(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(snapshotService.snapshotExists(date));
    }

    // DTOs
    public static class CreateSnapshotRequest {
        private LocalDate snapshotDate;
        private LocalDate cloneFromDate; // Optional

        public LocalDate getSnapshotDate() {
            return snapshotDate;
        }

        public void setSnapshotDate(LocalDate snapshotDate) {
            this.snapshotDate = snapshotDate;
        }

        public LocalDate getCloneFromDate() {
            return cloneFromDate;
        }

        public void setCloneFromDate(LocalDate cloneFromDate) {
            this.cloneFromDate = cloneFromDate;
        }
    }

    public static class SnapshotCreationResponse {
        private Snapshot snapshot;
        private List<Account> accounts;
        private String message;

        public Snapshot getSnapshot() {
            return snapshot;
        }

        public void setSnapshot(Snapshot snapshot) {
            this.snapshot = snapshot;
        }

        public List<Account> getAccounts() {
            return accounts;
        }

        public void setAccounts(List<Account> accounts) {
            this.accounts = accounts;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
