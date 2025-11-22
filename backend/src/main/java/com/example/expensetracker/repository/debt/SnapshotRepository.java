package com.example.expensetracker.repository.debt;

import com.example.expensetracker.model.debt.Snapshot;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SnapshotRepository extends MongoRepository<Snapshot, String> {
    
    Optional<Snapshot> findBySnapshotDate(LocalDate snapshotDate);
    
    List<Snapshot> findAllByOrderBySnapshotDateDesc();
    
    List<Snapshot> findBySnapshotDateBetween(LocalDate startDate, LocalDate endDate);
}
