import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurringExpenseService, RecurringExpense } from '../../services/recurring-expense.service';
import { DebtAccountService, DebtAccount } from '../../services/debt-account.service';

@Component({
  selector: 'app-recurring-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recurring-expenses.component.html',
  styleUrl: './recurring-expenses.component.css'
})
export class RecurringExpensesComponent implements OnInit {
  recurringExpenses: RecurringExpense[] = [];
  debtAccounts: DebtAccount[] = [];

  newExpense: RecurringExpense = {
    description: '',
    amount: 0,
    category: 'Utilities',
    dayOfMonth: 1,
    emi: false,
    active: true
  };

  categories = ['Utilities', 'Rent', 'Subscription', 'Insurance', 'Loan', 'Other'];
  daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  constructor(
    private recurringService: RecurringExpenseService,
    private debtService: DebtAccountService
  ) { }

  ngOnInit() {
    this.loadExpenses();
    this.loadDebtAccounts();
  }

  loadExpenses() {
    this.recurringService.getAll().subscribe(data => {
      this.recurringExpenses = data;
    });
  }

  loadDebtAccounts() {
    this.debtService.getAllDebts().subscribe(data => {
      this.debtAccounts = data.filter(a => a.status === 'ACTIVE'); // Only show active accounts
    });
  }

  addExpense() {
    if (!this.newExpense.description || this.newExpense.amount <= 0) return;

    // Clean up debtAccountId if not EMI
    if (!this.newExpense.emi) {
      delete this.newExpense.debtAccountId;
    }

    this.recurringService.create(this.newExpense).subscribe(() => {
      this.loadExpenses();
      this.resetForm();
    });
  }

  deleteExpense(id: string) {
    if (confirm('Are you sure you want to delete this recurring expense?')) {
      this.recurringService.delete(id).subscribe(() => {
        this.loadExpenses();
      });
    }
  }

  toggleActive(expense: RecurringExpense) {
    if (expense.id) {
      this.recurringService.update(expense.id, expense).subscribe();
    }
  }

  processNow() {
    if (confirm('Process all due recurring expenses now? This will create actual expense entries.')) {
      this.recurringService.processNow().subscribe(() => {
        alert('Expenses processed successfully!');
        this.loadExpenses(); // To update lastGenerated if we show it
      });
    }
  }

  resetForm() {
    this.newExpense = {
      description: '',
      amount: 0,
      category: 'Utilities',
      dayOfMonth: 1,
      emi: false,
      active: true
    };
  }

  getDebtAccountName(id?: string): string {
    if (!id) return '';
    const account = this.debtAccounts.find(a => a.id === id);
    return account ? account.name : 'Unknown Account';
  }
}
