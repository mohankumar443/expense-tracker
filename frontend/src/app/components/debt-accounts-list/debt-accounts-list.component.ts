import { Component, OnInit } from '@angular/core';
import { DebtAccountService, DebtAccount } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-debt-accounts-list',
    templateUrl: './debt-accounts-list.component.html',
    styleUrls: ['./debt-accounts-list.component.css']
})
export class DebtAccountsListComponent implements OnInit {
    creditCards: DebtAccount[] = [];
    personalLoans: DebtAccount[] = [];
    autoLoans: DebtAccount[] = [];
    viewMode: 'cards' | 'table' = 'cards';

    // Collapse states
    creditCardsCollapsed = false;
    personalLoansCollapsed = false;
    autoLoansCollapsed = false;

    constructor(
        private debtService: DebtAccountService,
        private snapshotState: SnapshotStateService
    ) { }

    ngOnInit() {
        this.loadAccounts();

        // Subscribe to snapshot changes
        this.snapshotState.currentSnapshot$.subscribe(fileName => {
            if (!fileName) {
                // Ignore initial empty emission
                return;
            }
            this.loadSnapshotAccounts(fileName);
        });
    }

    loadAccounts() {
        this.debtService.getAllDebts().subscribe(accounts => {
            this.creditCards = accounts.filter(a => a.type === 'CREDIT_CARD');
            this.personalLoans = accounts.filter(a => a.type === 'PERSONAL_LOAN');
            this.autoLoans = accounts.filter(a => a.type === 'AUTO_LOAN');
        });
    }

    loadSnapshotAccounts(fileName: string) {
        if (!fileName) {
            // No snapshot selected yet
            return;
        }
        this.debtService.getSnapshotAccounts(fileName).subscribe(accounts => {
            this.creditCards = accounts.filter(a => a.type === 'CREDIT_CARD');
            this.personalLoans = accounts.filter(a => a.type === 'PERSONAL_LOAN');
            this.autoLoans = accounts.filter(a => a.type === 'AUTO_LOAN');
        });
    }

    getAprClass(apr: number): string {
        if (apr === 0) return 'text-green-600 dark:text-green-400';
        if (apr < 8) return 'text-blue-600 dark:text-blue-400';
        if (apr < 12) return 'text-yellow-600 dark:text-yellow-400';
        if (apr < 15) return 'text-orange-600 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
    }

    getAprBadgeClass(apr: number): string {
        if (apr === 0) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        if (apr < 8) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        if (apr < 12) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
        if (apr < 15) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    }

    isPromoExpiringSoon(account: DebtAccount): boolean {
        if (!account.promoExpires) return false;
        const expiryDate = new Date(account.promoExpires);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 0 && daysUntilExpiry <= 90; // Within 90 days
    }

    calculateMonthlyInterest(balance: number, apr: number): number {
        return (balance * apr) / 100 / 12;
    }
}
