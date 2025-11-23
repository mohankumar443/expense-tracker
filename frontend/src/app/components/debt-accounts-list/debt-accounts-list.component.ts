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

    // Dual Theme color palette - Clean Light & Dark Glass
    cardColors = [
        'bg-white dark:bg-[#1a2332] border-pink-200 dark:border-pink-500/30 shadow-pink-100 dark:shadow-pink-900/10',      // 1
        'bg-white dark:bg-[#1a2332] border-indigo-200 dark:border-indigo-500/30 shadow-indigo-100 dark:shadow-indigo-900/10',  // 2
        'bg-white dark:bg-[#1a2332] border-blue-200 dark:border-blue-500/30 shadow-blue-100 dark:shadow-blue-900/10',      // 3
        'bg-white dark:bg-[#1a2332] border-teal-200 dark:border-teal-500/30 shadow-teal-100 dark:shadow-teal-900/10',      // 4
        'bg-white dark:bg-[#1a2332] border-green-200 dark:border-green-500/30 shadow-green-100 dark:shadow-green-900/10',    // 5
        'bg-white dark:bg-[#1a2332] border-amber-200 dark:border-amber-500/30 shadow-amber-100 dark:shadow-amber-900/10',    // 6
        'bg-white dark:bg-[#1a2332] border-orange-200 dark:border-orange-500/30 shadow-orange-100 dark:shadow-orange-900/10',  // 7
        'bg-white dark:bg-[#1a2332] border-purple-200 dark:border-purple-500/30 shadow-purple-100 dark:shadow-purple-900/10',  // 8
        'bg-white dark:bg-[#1a2332] border-violet-200 dark:border-violet-500/30 shadow-violet-100 dark:shadow-violet-900/10',  // 9
        'bg-white dark:bg-[#1a2332] border-sky-200 dark:border-sky-500/30 shadow-sky-100 dark:shadow-sky-900/10',        // 10
        'bg-white dark:bg-[#1a2332] border-rose-200 dark:border-rose-500/30 shadow-rose-100 dark:shadow-rose-900/10',      // 11
        'bg-white dark:bg-[#1a2332] border-blue-300 dark:border-blue-600/30 shadow-blue-100 dark:shadow-blue-900/10',      // 12
        'bg-white dark:bg-[#1a2332] border-cyan-200 dark:border-cyan-500/30 shadow-cyan-100 dark:shadow-cyan-900/10',      // 13
        'bg-white dark:bg-[#1a2332] border-emerald-200 dark:border-emerald-500/30 shadow-emerald-100 dark:shadow-emerald-900/10',// 14
        'bg-white dark:bg-[#1a2332] border-lime-200 dark:border-lime-500/30 shadow-lime-100 dark:shadow-lime-900/10',      // 15
        'bg-white dark:bg-[#1a2332] border-amber-300 dark:border-amber-600/30 shadow-amber-100 dark:shadow-amber-900/10',    // 16
        'bg-white dark:bg-[#1a2332] border-red-200 dark:border-red-500/30 shadow-red-100 dark:shadow-red-900/10',        // 17
        'bg-white dark:bg-[#1a2332] border-fuchsia-200 dark:border-fuchsia-500/30 shadow-fuchsia-100 dark:shadow-fuchsia-900/10',// 18
        'bg-white dark:bg-[#1a2332] border-violet-300 dark:border-violet-600/30 shadow-violet-100 dark:shadow-violet-900/10',  // 19
        'bg-white dark:bg-[#1a2332] border-sky-300 dark:border-sky-600/30 shadow-sky-100 dark:shadow-sky-900/10'         // 20
    ];

    getCardGradient(index: number): string {
        return this.cardColors[index % this.cardColors.length];
    }

    getNumberColorClass(index: number): string {
        const colors = [
            'bg-pink-500 text-white border-pink-400',
            'bg-indigo-500 text-white border-indigo-400',
            'bg-blue-500 text-white border-blue-400',
            'bg-teal-500 text-white border-teal-400',
            'bg-green-500 text-white border-green-400',
            'bg-amber-500 text-white border-amber-400',
            'bg-orange-500 text-white border-orange-400',
            'bg-purple-500 text-white border-purple-400',
            'bg-violet-500 text-white border-violet-400',
            'bg-sky-500 text-white border-sky-400',
            'bg-rose-500 text-white border-rose-400',
            'bg-blue-600 text-white border-blue-500',
            'bg-cyan-500 text-white border-cyan-400',
            'bg-emerald-500 text-white border-emerald-400',
            'bg-lime-500 text-white border-lime-400',
            'bg-orange-600 text-white border-orange-500',
            'bg-red-500 text-white border-red-400',
            'bg-fuchsia-500 text-white border-fuchsia-400',
            'bg-violet-600 text-white border-violet-500',
            'bg-sky-600 text-white border-sky-500'
        ];
        return colors[index % colors.length];
    }

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
