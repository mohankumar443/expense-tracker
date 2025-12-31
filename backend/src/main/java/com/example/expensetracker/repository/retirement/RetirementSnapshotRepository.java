package com.example.expensetracker.repository.retirement;

import com.example.expensetracker.model.retirement.RetirementSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RetirementSnapshotRepository extends MongoRepository<RetirementSnapshot, String> {

    List<RetirementSnapshot> findBySnapshotDateBetween(LocalDate start, LocalDate end);

    Optional<RetirementSnapshot> findTopByOrderBySnapshotDateDesc();

    List<RetirementSnapshot> findAllByOrderBySnapshotDateDesc();

    @Query("{ 'snapshotDate': { $gte: ?0, $lt: ?1 } }")
    List<RetirementSnapshot> findByYear(LocalDate yearStart, LocalDate yearEnd);

    Optional<RetirementSnapshot> findBySnapshotDate(LocalDate snapshotDate);
}
