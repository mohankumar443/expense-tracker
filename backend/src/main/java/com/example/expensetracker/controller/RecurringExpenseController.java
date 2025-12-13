package com.example.expensetracker.controller;

import com.example.expensetracker.model.RecurringExpense;
import com.example.expensetracker.service.RecurringExpenseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recurring-expenses")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class RecurringExpenseController {

    @Autowired
    private RecurringExpenseService recurringExpenseService;

    @GetMapping
    public List<RecurringExpense> getAllRecurringExpenses() {
        return recurringExpenseService.getAllRecurringExpenses();
    }

    @PostMapping
    public RecurringExpense createRecurringExpense(@RequestBody RecurringExpense recurringExpense) {
        return recurringExpenseService.createRecurringExpense(recurringExpense);
    }

    @DeleteMapping("/{id}")
    public void deleteRecurringExpense(@PathVariable String id) {
        recurringExpenseService.deleteRecurringExpense(id);
    }

    @PostMapping("/process")
    public void processDueExpenses() {
        recurringExpenseService.processDueExpenses();
    }

    @PutMapping("/{id}")
    public RecurringExpense updateRecurringExpense(@PathVariable String id,
            @RequestBody RecurringExpense recurringExpense) {
        return recurringExpenseService.updateRecurringExpense(id, recurringExpense);
    }
}
