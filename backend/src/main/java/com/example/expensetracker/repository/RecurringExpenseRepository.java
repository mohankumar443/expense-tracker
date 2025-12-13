package com.example.expensetracker.repository;

import com.example.expensetracker.model.RecurringExpense;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecurringExpenseRepository extends MongoRepository<RecurringExpense, String> {
    List<RecurringExpense> findByActiveTrue();
}
