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

  private getBaseIcon(expense: RecurringExpense): string {
    if (expense.emi) return 'credit_card';
    const cat = (expense.category || '').toLowerCase();
    switch (cat) {
      case 'rent':
      case 'room rent':
        return 'home';
      case 'utilities':
        return 'bolt';
      case 'subscription':
      case 'subscriptions':
        return 'subscriptions';
      case 'insurance':
        return 'shield';
      case 'loan':
        return 'account_balance';
      case 'investments':
      case 'investment':
        return 'trending_up';
      case 'car insurance':
        return 'directions_car';
      case 'car wash':
        return 'local_car_wash';
      case 'mobile payment':
        return 'smartphone';
      case 'gas':
        return 'local_gas_station';
      case 'credit card payment':
        return 'payment';
      default:
        const palette = ['receipt_long', 'calendar_today', 'account_balance_wallet', 'shopping_bag', 'payments', 'category', 'attach_money'];
        const desc = (expense.description || 'default');
        const hash = desc.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }
  }

  getDisplayIcon(index: number): string {
    const exp = this.recurringExpenses[index];
    let icon = this.getBaseIcon(exp);
    if (index > 0) {
      const prevIcon = this.getBaseIcon(this.recurringExpenses[index - 1]);
      if (icon === prevIcon) {
        const fallback = ['home', 'bolt', 'subscriptions', 'shield', 'account_balance', 'trending_up', 'directions_car', 'local_car_wash', 'smartphone', 'local_gas_station', 'payment', 'receipt_long'];
        icon = fallback[index % fallback.length];
      }
    }
    return icon;
  }

  getCategoryColor(expense: RecurringExpense): string {
    if (expense.emi) return 'bg-purple-500';
    const cat = (expense.category || '').toLowerCase();
    if (cat.includes('rent')) return 'bg-blue-500';
    if (cat.includes('subscription')) return 'bg-emerald-500';
    if (cat.includes('invest')) return 'bg-amber-500';
    if (cat.includes('insurance')) return 'bg-indigo-500';
    if (cat.includes('loan')) return 'bg-rose-500';
    if (cat.includes('car')) return 'bg-cyan-500';
    if (cat.includes('gas')) return 'bg-orange-500';
    if (cat.includes('utility')) return 'bg-teal-500';

    // Fallback: deterministic color based on description to reduce repeats
    const palette = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500'];
    const desc = (expense.description || 'default');
    const hash = desc.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }
}
