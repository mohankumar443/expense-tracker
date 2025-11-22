package com.example.expensetracker.controller.debt;

import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.service.debt.SnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debt/snapshots")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SnapshotController {

    private final SnapshotService snapshotService;

    @GetMapping
    public List<Snapshot> getAllSnapshots() {
        return snapshotService.getAllSnapshots();
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<Snapshot> getSnapshotByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return snapshotService.getSnapshotByDate(date)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/grouped-by-year")
    public Map<Integer, List<Snapshot>> getSnapshotsGroupedByYear() {
        return snapshotService.getSnapshotsGroupedByYear();
    }
    
    @GetMapping("/years")
    public List<Integer> getAvailableYears() {
        return snapshotService.getAvailableYears();
    }
    
    @GetMapping("/year/{year}")
    public List<Snapshot> getSnapshotsForYear(@PathVariable int year) {
        return snapshotService.getSnapshotsForYear(year);
    }
}
