import { Component } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';

@Component({
    selector: 'app-expense-form',
    templateUrl: './expense-form.component.html',
    styleUrls: ['./expense-form.component.css']
})
export class ExpenseFormComponent {
    expense: Expense = {
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: ''
    };

    constructor(private expenseService: ExpenseService) { }

    onSubmit() {
        this.expenseService.createExpense(this.expense).subscribe(() => {
            // Reset form or notify list to update
            this.expense = {
                description: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                category: ''
            };
            // Ideally use a shared service or event emitter to notify list component
            window.location.reload(); // Simple reload for now
        });
    }
}
