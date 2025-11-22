package com.example.expensetracker.service.debt;

import com.example.expensetracker.model.debt.Snapshot;
import com.example.expensetracker.repository.debt.SnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SnapshotService {

    private final SnapshotRepository snapshotRepository;

    public List<Snapshot> getAllSnapshots() {
        return snapshotRepository.findAllByOrderBySnapshotDateDesc();
    }

    public Optional<Snapshot> getSnapshotByDate(LocalDate date) {
        return snapshotRepository.findBySnapshotDate(date);
    }

    // Group snapshots by year for the UI hierarchy
    public Map<Integer, List<Snapshot>> getSnapshotsGroupedByYear() {
        List<Snapshot> allSnapshots = snapshotRepository.findAllByOrderBySnapshotDateDesc();
        
        return allSnapshots.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getSnapshotDate().getYear(),
                        TreeMap::new, // Sort years naturally (though we might want reverse later)
                        Collectors.toList()
                ));
    }
    
    // Get available years
    public List<Integer> getAvailableYears() {
        return snapshotRepository.findAll().stream()
                .map(s -> s.getSnapshotDate().getYear())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
    }
    
    // Get snapshots for a specific year
    public List<Snapshot> getSnapshotsForYear(int year) {
        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);
        return snapshotRepository.findBySnapshotDateBetween(startDate, endDate);
    }
}
