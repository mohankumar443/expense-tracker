package com.example.expensetracker.service;

import com.example.expensetracker.model.Expense;
import com.example.expensetracker.model.RecurringExpense;
import com.example.expensetracker.repository.ExpenseRepository;
import com.example.expensetracker.repository.RecurringExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class RecurringExpenseService {

    @Autowired
    private RecurringExpenseRepository recurringExpenseRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    public List<RecurringExpense> getAllRecurringExpenses() {
        return recurringExpenseRepository.findAll();
    }

    public RecurringExpense createRecurringExpense(RecurringExpense recurringExpense) {
        // Save the recurring definition
        RecurringExpense saved = recurringExpenseRepository.save(recurringExpense);

        // Immediately create a transaction for the current month
        createTransactionForMonth(saved, LocalDate.now());

        return saved;
    }

    private void createTransactionForMonth(RecurringExpense recurring, LocalDate dateContext) {
        if (Boolean.TRUE.equals(recurring.getActive())) {
            try {
                // Check if already generated for this month
                if (recurring.getLastGenerated() != null) {
                    YearMonth lastMonth = YearMonth.from(recurring.getLastGenerated());
                    YearMonth currentMonth = YearMonth.from(dateContext);
                    if (lastMonth.equals(currentMonth)) {
                        return; // Already generated for this month
                    }
                }

                // Construct date for this month
                int day = Math.min(recurring.getDayOfMonth(), YearMonth.from(dateContext).lengthOfMonth());
                LocalDate transactionDate = LocalDate.of(dateContext.getYear(), dateContext.getMonth(), day);

                // If scheduled run, only process if today matches or passed the day (and not
                // generated yet)
                // For manual "processNow", we might want to force it if due.

                Expense expense = new Expense();
                expense.setDescription(recurring.getDescription());
                expense.setAmount(recurring.getAmount());
                expense.setCategory(recurring.getCategory());
                expense.setDate(transactionDate);
                expense.setIsRecurring(true);

                expenseRepository.save(expense);

                // Update last generated
                recurring.setLastGenerated(transactionDate);
                recurringExpenseRepository.save(recurring);

            } catch (Exception e) {
                // Log and ignore to prevent failure of main save
                System.err.println("Failed to create initial transaction for recurring expense: " + e.getMessage());
            }
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 2 * * ?") // 2 AM Daily
    public void processDueExpenses() {
        LocalDate today = LocalDate.now();
        List<RecurringExpense> all = recurringExpenseRepository.findAll();

        for (RecurringExpense expense : all) {
            if (Boolean.TRUE.equals(expense.getActive())) {
                // Check if due day has passed in this month and not generated
                int dueDay = expense.getDayOfMonth();
                if (today.getDayOfMonth() >= dueDay) {
                    createTransactionForMonth(expense, today);
                }
            }
        }
    }

    public RecurringExpense updateRecurringExpense(String id, RecurringExpense updated) {
        return recurringExpenseRepository.findById(id).map(existing -> {
            existing.setDescription(updated.getDescription());
            existing.setAmount(updated.getAmount());
            existing.setCategory(updated.getCategory());
            existing.setDayOfMonth(updated.getDayOfMonth());
            existing.setIsEmi(updated.getIsEmi());
            existing.setDebtAccountId(updated.getDebtAccountId());
            existing.setActive(updated.getActive());
            // Do not update lastGenerated manually usually
            return recurringExpenseRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Recurring Expense not found"));
    }

    public void deleteRecurringExpense(String id) {
        recurringExpenseRepository.deleteById(id);
    }
}
