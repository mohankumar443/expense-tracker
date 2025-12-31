import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { AppComponent } from './app.component';
import { ExpenseListComponent } from './components/expense-list/expense-list.component';
import { ExpenseFormComponent } from './components/expense-form/expense-form.component';
import { ThemeSwitcherComponent } from './components/theme-switcher/theme-switcher.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DebtOverviewComponent } from './components/debt-overview/debt-overview.component';
import { DebtAccountsListComponent } from './components/debt-accounts-list/debt-accounts-list.component';
import { ProgressTrackerComponent } from './components/progress-tracker/progress-tracker.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SnapshotManagerComponent } from './components/snapshot-manager/snapshot-manager.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { AccountFormModalComponent } from './components/account-form-modal/account-form-modal.component';
import { ExpenseService } from './services/expense.service';

import { StrategyDashboardComponent } from './components/strategy-dashboard/strategy-dashboard.component';
import { CountUpDirective } from './directives/count-up.directive';
import { BudgetTrackerComponent } from './components/budget-tracker/budget-tracker.component';
import { RecurringExpensesComponent } from './components/recurring-expenses/recurring-expenses.component';
import { RetirementTrackerComponent } from './components/retirement-tracker/retirement-tracker.component';
import { ToastComponent } from './components/toast/toast.component';

@NgModule({
    declarations: [
        AppComponent,
        ExpenseListComponent,
        ExpenseFormComponent,
        ThemeSwitcherComponent,
        DashboardComponent,
        DebtOverviewComponent,
        DebtAccountsListComponent,
        ProgressTrackerComponent,
        SidebarComponent,
        SnapshotManagerComponent,
        ConfirmationModalComponent,
        AccountFormModalComponent,
        StrategyDashboardComponent,
        CountUpDirective,
        BudgetTrackerComponent,
        RetirementTrackerComponent,
        ToastComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        NgChartsModule,
        RecurringExpensesComponent
    ],
    providers: [ExpenseService],
    bootstrap: [AppComponent]
})
export class AppModule { }
