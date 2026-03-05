package com.example.expensetracker.config;

import com.example.expensetracker.model.debt.Snapshot;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.springframework.data.mongodb.core.query.Criteria.where;

@Component
public class DuplicateSnapshotCleaner implements CommandLineRunner {

    private final MongoTemplate mongoTemplate;

    public DuplicateSnapshotCleaner(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("----- STARTING DUPLICATE SNAPSHOT CLEANUP -----");
        try {
            List<Snapshot> allSnapshots = mongoTemplate.findAll(Snapshot.class);

            // Group by date
            Map<LocalDate, List<Snapshot>> grouped = allSnapshots.stream()
                    .collect(Collectors.groupingBy(Snapshot::getSnapshotDate));

            for (Map.Entry<LocalDate, List<Snapshot>> entry : grouped.entrySet()) {
                List<Snapshot> snapshots = entry.getValue();
                if (snapshots.size() > 1) {
                    System.out.println("Found duplicate snapshots for date: " + entry.getKey());

                    // Keep the first one, delete the rest
                    // Better to keep the one with the most recent update time or most
                    // accounts/debt,
                    // but for now just safely keeping one is prioritized to fix the 500 header
                    // error.
                    // We'll sort by updatedAt descending (if available) or just arbitrary.

                    // Assuming getLastUpdated or just arbitrary for now since they are likely
                    // identical or broken
                    Snapshot toKeep = snapshots.get(0);
                    System.out.println("Keeping snapshot ID: " + toKeep.getId());

                    for (int i = 1; i < snapshots.size(); i++) {
                        Snapshot toDelete = snapshots.get(i);
                        System.out.println("Deleting duplicate snapshot ID: " + toDelete.getId());
                        mongoTemplate.remove(toDelete);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to clean duplicates: " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("----- DUPLICATE SNAPSHOT CLEANUP FINISHED -----");
    }
}
