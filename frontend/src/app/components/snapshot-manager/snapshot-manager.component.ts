import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { DebtAccountService, Snapshot } from '../../services/debt-account.service';
import { Account } from '../../models/account.model';

@Component({
    selector: 'app-snapshot-manager',
    templateUrl: './snapshot-manager.component.html',
    styleUrls: ['./snapshot-manager.component.css']
})
export class SnapshotManagerComponent {
    @Output() close = new EventEmitter<void>();
    @Output() snapshotCreated = new EventEmitter<void>();

    isVisible = false;
    isLoading = false;

    selectedDate: string = '';
    cloneFromDate: string | null = null;

    accounts: Account[] = [];
    availableSnapshots: Snapshot[] = [];

    constructor(
        private debtService: DebtAccountService,
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
            // Create snapshot
            const snapshotDate = this.selectedDate + '-01'; // Convert YYYY-MM to YYYY-MM-DD
            const cloneFrom = this.cloneFromDate; // Already in YYYY-MM-DD format from API

            console.log('Creating snapshot:', { snapshotDate, cloneFrom });
            await this.debtService.createSnapshot(snapshotDate, cloneFrom).toPromise();

            // If we have accounts to save (either cloned or manually added)
            if (this.accounts.length > 0) {
                // Ensure all accounts have the correct snapshot date
                this.accounts.forEach(acc => acc.snapshotDate = snapshotDate);

                await this.debtService.batchUpdateAccounts(snapshotDate, this.accounts).toPromise();
            }

            this.snapshotCreated.emit();
            this.closeModal();
        } catch (error) {
            console.error('Error creating snapshot:', error);
            alert('Error creating snapshot. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }
}
