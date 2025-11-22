package com.example.expensetracker.repository.debt;

import com.example.expensetracker.model.debt.Goal;
import com.example.expensetracker.model.debt.Goal.GoalStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GoalRepository extends MongoRepository<Goal, String> {
    
    List<Goal> findByStatus(GoalStatus status);
    
    List<Goal> findByAccountId(String accountId);
    
    List<Goal> findByStatusOrderByTargetDateAsc(GoalStatus status);
}
