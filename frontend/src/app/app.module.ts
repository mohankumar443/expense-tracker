import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ExpenseListComponent } from './components/expense-list/expense-list.component';
import { ExpenseFormComponent } from './components/expense-form/expense-form.component';
import { ThemeSwitcherComponent } from './components/theme-switcher/theme-switcher.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DebtOverviewComponent } from './components/debt-overview/debt-overview.component';
import { DebtAccountsListComponent } from './components/debt-accounts-list/debt-accounts-list.component';
import { ProgressTrackerComponent } from './components/progress-tracker/progress-tracker.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ExpenseService } from './services/expense.service';

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
        SidebarComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule
    ],
    providers: [ExpenseService],
    bootstrap: [AppComponent]
})
export class AppModule { }
