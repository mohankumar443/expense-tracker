import { Component, OnInit } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
    selector: 'app-expense-list',
    templateUrl: './expense-list.component.html',
    styleUrls: ['./expense-list.component.css'],
    animations: [
        trigger('listAnimation', [
            transition('* => *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(20px)' }),
                    stagger(100, [
                        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
                    ])
                ], { optional: true }),
                query(':leave', [
                    animate('0.3s ease-in', style({ opacity: 0, transform: 'translateX(20px)' }))
                ], { optional: true })
            ])
        ])
    ]
})
export class ExpenseListComponent implements OnInit {
    expenses: Expense[] = [];

    constructor(private expenseService: ExpenseService) { }

    ngOnInit() {
        this.loadExpenses();
    }

    loadExpenses() {
        this.expenseService.getAllExpenses().subscribe(data => {
            this.expenses = data;
        });
    }

    deleteExpense(id: number | undefined) {
        if (id) {
            this.expenseService.deleteExpense(id).subscribe(() => {
                this.loadExpenses();
            });
        }
    }
}
