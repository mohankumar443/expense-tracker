import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DebtAccountService, Snapshot } from '../../services/debt-account.service';
import { RetirementService, RetirementPlanRequest } from '../../services/retirement.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';
import { ToastService } from '../../services/toast.service';
import { Account } from '../../models/account.model';

@Component({
    selector: 'app-snapshot-manager',
    templateUrl: './snapshot-manager.component.html',
    styleUrls: ['./snapshot-manager.component.css']
})
export class SnapshotManagerComponent {
    @Output() close = new EventEmitter<void>();
    @Output() snapshotCreated = new EventEmitter<string | null>();

    isVisible = false;
    isLoading = false;

    selectedDate: string = '';
    cloneFromDate: string | null = null;

    accounts: Account[] = [];
    availableSnapshots: Snapshot[] = [];

    constructor(
        private debtService: DebtAccountService,
        private retirementService: RetirementService,
        private snapshotStateService: SnapshotStateService,
        private toastService: ToastService,
        private cdr: ChangeDetectorRef
    ) { }

    open() {
        console.log('SnapshotManager.open() called, setting isVisible to true');
        this.isVisible = true;
        this.cdr.detectChanges(); // Manually trigger change detection
        console.log('isVisible is now:', this.isVisible);
        this.loadAvailableSnapshots();

        // Set default date to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this.selectedDate = nextMonth.toISOString().substring(0, 7); // YYYY-MM format
        console.log('selectedDate set to:', this.selectedDate);
    }

    closeModal() {
        this.isVisible = false;
        this.reset();
        this.close.emit();
    }

    reset() {
        this.selectedDate = '';
        this.cloneFromDate = null;
        this.accounts = [];
    }

    loadAvailableSnapshots() {
        this.debtService.getAllSnapshots().subscribe(snapshots => {
            this.availableSnapshots = snapshots;
        });
    }

    onCloneFromChange() {
        if (this.cloneFromDate) {
            this.isLoading = true;
            this.debtService.getAccountsBySnapshotDate(this.cloneFromDate).subscribe(accounts => {
                this.accounts = accounts.map(acc => ({ ...acc, id: undefined })); // Remove IDs for new accounts
                this.isLoading = false;
            });
        } else {
            this.accounts = [];
        }
    }

    addAccount() {
        const newAccount: Account = {
            accountId: '',
            name: '',
            type: 'CREDIT_CARD',
            currentBalance: 0,
            apr: 0,
            monthlyPayment: 0,
            status: 'ACTIVE',
            snapshotDate: this.selectedDate
        };
        this.accounts.push(newAccount);
    }

    removeAccount(index: number) {
        this.accounts.splice(index, 1);
    }

    async submit() {
        if (!this.selectedDate) {
            alert('Please select a date');
            return;
        }

        this.isLoading = true;

        try {
            // Create snapshot - append -01 for the first of the month
            // The backend/DB seems to store them as YYYY-MM-DD
            const snapshotDate = this.selectedDate + '-01';

            // We handle cloning on the frontend by pre-filling the accounts array
            // So we pass null for cloneFromDate to the backend to avoid double-creation
            const cloneFrom = null;

            console.log('Creating snapshot:', { snapshotDate, cloneFrom });
            await this.debtService.createSnapshot(snapshotDate, cloneFrom).toPromise();

            // If we have accounts to save (either cloned or manually added)
            if (this.accounts.length > 0) {
                // Ensure all accounts have the correct snapshot date
                this.accounts.forEach(acc => acc.snapshotDate = snapshotDate);

                await this.debtService.batchUpdateAccounts(snapshotDate, this.accounts).toPromise();
            }

            await this.cloneRetirementSnapshot(this.selectedDate, this.cloneFromDate);

            this.snapshotCreated.emit(snapshotDate); // Emit the new date
            this.loadAvailableSnapshots(); // Refresh list

            const displayDate = new Date(this.selectedDate + '-01T12:00:00').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
            this.closeModal();
            this.toastService.show(`${displayDate} Snapshot created successfully!`, 'info', 5000);
        } catch (error: any) {
            console.error('Error creating snapshot:', error);
            const message = this.extractErrorMessage(error) || 'Error creating snapshot. Please try again.';
            this.toastService.show(message, 'error', 0);
        } finally {
            this.isLoading = false;
        }
    }

    private async cloneRetirementSnapshot(monthYear: string, cloneFromDate: string | null) {
        try {
            const targetMonthYear = this.normalizeMonthYear(monthYear);
            const existing = await this.retirementService.getSnapshotByMonth(targetMonthYear).toPromise();
            if (this.hasRetirementData(existing)) {
                return;
            }

            const sourceMonthYear = this.normalizeMonthYear(cloneFromDate || targetMonthYear);
            await this.retirementService.cloneSnapshot(sourceMonthYear, targetMonthYear).toPromise();
        } catch (error) {
            console.error('Error cloning retirement snapshot:', error);
        }
    }

    private hasRetirementData(snapshot: any): boolean {
        if (!snapshot) return false;
        if ((snapshot.totalBalance || 0) > 0) return true;
        if ((snapshot.totalContributions || 0) > 0) return true;
        if (!snapshot.accounts) return false;
        return snapshot.accounts.some((acc: any) => (acc.balance || 0) > 0 || (acc.contribution || 0) > 0);
    }

    private findPreviousRetirementSnapshot(snapshots: any[], monthYear: string): any | null {
        const monthStart = new Date(`${monthYear}-01`);
        if (isNaN(monthStart.getTime())) return null;
        const previous = snapshots
            .filter(s => new Date(s.snapshotDate) < monthStart)
            .filter(s => this.hasRetirementData(s))
            .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());
        return previous.length ? previous[0] : null;
    }

    private pickSnapshotForMonthWithData(snapshots: any[], monthYear: string): any | null {
        const monthStart = new Date(`${monthYear}-01`);
        if (isNaN(monthStart.getTime())) return null;
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const matches = snapshots
            .filter(s => {
                const date = new Date(s.snapshotDate);
                return date >= monthStart && date < monthEnd;
            })
            .filter(s => this.hasRetirementData(s))
            .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());
        return matches.length ? matches[0] : null;
    }

    private buildRetirementCloneRequest(snapshot: any, monthYear: string): RetirementPlanRequest {
        const accounts = (snapshot.accounts || []).map((acc: any) => ({
            accountType: acc.accountType,
            goalType: acc.goalType,
            balance: acc.balance || 0,
            contribution: acc.contribution || 0
        }));
        const totalContribution = accounts.reduce((sum: number, acc: any) => sum + (acc.contribution || 0), 0);

        return {
            currentAge: snapshot.currentAge,
            monthYear,
            currentTotalInvestedBalance: snapshot.totalBalance,
            targetPortfolioValue: snapshot.targetPortfolioValue,
            actualMonthlyContribution: totalContribution,
            oneTimeAdditions: snapshot.oneTimeAdditions ?? undefined,
            afterTaxMode: snapshot.afterTaxMode,
            flatTaxRate: snapshot.flatTaxRate,
            taxFreeRate: snapshot.taxFreeRate,
            taxDeferredRate: snapshot.taxDeferredRate,
            taxableRate: snapshot.taxableRate,
            persistSnapshot: true,
            accounts
        };
    }

    deleteSnapshot(date: string) {
        if (confirm(`Are you sure you want to delete the snapshot for ${date}? This cannot be undone.`)) {
            this.isLoading = true;
            const snapshotDate = this.normalizeSnapshotDate(date);
            const monthYear = this.normalizeMonthYear(date);
            forkJoin([
                this.debtService.deleteSnapshot(snapshotDate),
                this.retirementService.deleteSnapshotByMonth(monthYear).pipe(catchError(() => of(null)))
            ])
                .pipe(finalize(() => { this.isLoading = false; }))
                .subscribe({
                    next: () => {
                        this.refreshAfterDelete();
                        this.snapshotCreated.emit(null); // Emit null for deletion
                    },
                    error: (err) => {
                        console.error('Error deleting snapshot:', err);
                        alert('Error deleting snapshot');
                    }
                });
        }
    }

    private normalizeSnapshotDate(value: string): string {
        return value ? value.slice(0, 10) : value;
    }

    private normalizeMonthYear(value: string): string {
        return value ? value.slice(0, 7) : value;
    }

    private extractErrorMessage(error: any): string | null {
        if (!error) return null;
        if (typeof error === 'string') return error;
        const apiMessage = error?.error?.message || error?.error?.error || error?.error;
        if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
            return apiMessage;
        }
        if (typeof error?.message === 'string' && error.message.trim().length > 0) {
            return error.message;
        }
        if (error?.status === 400) {
            return 'Snapshot already exists for that month.';
        }
        return null;
    }

    private refreshAfterDelete() {
        this.loadAvailableSnapshots();
        this.debtService.getAvailableSnapshots().subscribe({
            next: (snapshots) => {
                if (!snapshots || snapshots.length === 0) {
                    this.snapshotStateService.setCurrentSnapshot('');
                    return;
                }
                const sorted = snapshots.sort((a, b) =>
                    new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
                );
                const latest = sorted[sorted.length - 1];
                if (latest) {
                    this.snapshotStateService.setCurrentSnapshot(latest.snapshotDate);
                }
            },
            error: () => {
                this.snapshotStateService.setCurrentSnapshot('');
            }
        });
    }
}
