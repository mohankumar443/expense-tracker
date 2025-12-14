import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DebtAccountService, DebtAccount } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

type CategoryKey = 'credit' | 'personal' | 'auto';

@Component({
    selector: 'app-debt-accounts-list',
    templateUrl: './debt-accounts-list.component.html',
    styleUrls: ['./debt-accounts-list.component.css'],
    animations: [
        trigger('accordion', [
            state('collapsed', style({
                height: '0px',
                opacity: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginTop: 0
            })),
            state('expanded', style({
                height: '*',
                opacity: 1
            })),
            transition('collapsed <=> expanded', animate('200ms ease-in-out'))
        ])
    ]
})
export class DebtAccountsListComponent implements OnInit {
    Math = Math;
    creditCards: DebtAccount[] = [];
    personalLoans: DebtAccount[] = [];
    autoLoans: DebtAccount[] = [];
    viewMode: 'cards' | 'table' = 'cards';
    expandedCategories: Set<CategoryKey> = new Set(['credit']);
    categories: Array<{ key: CategoryKey; label: string; accent: string; icon: string; chip: string; sublabel: string; gradient: string }> = [
        { key: 'credit', label: 'Credit Cards', accent: 'blue', icon: 'credit_card', chip: 'blue-500', sublabel: 'Revolving lines', gradient: 'from-blue-500/10 via-blue-500/5 to-transparent' },
        { key: 'personal', label: 'Personal Loans', accent: 'purple', icon: 'account_balance', chip: 'purple-500', sublabel: 'Installment loans', gradient: 'from-purple-500/10 via-purple-500/5 to-transparent' },
        { key: 'auto', label: 'Auto Loans', accent: 'emerald', icon: 'directions_car', chip: 'emerald-500', sublabel: 'Vehicle financing', gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent' }
    ];

    // Filter states
    hideZeroBalance = false;
    tableFilters = { type: 'all' as 'all' | CategoryKey, aprMin: null as number | null, aprMax: null as number | null, balanceMin: null as number | null, balanceMax: null as number | null };
    cardSort = { column: 'balance' as 'balance' | 'apr' | 'minPayment' | 'dueDate', direction: 'desc' as 'asc' | 'desc' };
    tableSort = { column: 'name' as 'name' | 'type' | 'balance' | 'apr' | 'minPayment' | 'dueDate', direction: 'asc' as 'asc' | 'desc' };

    get visibleCreditCards(): DebtAccount[] {
        if (this.hideZeroBalance) {
            return this.creditCards.filter(card => card.currentBalance > 0);
        }
        return this.creditCards;
    }

    // Sorting state
    sortColumn: string = 'priority';
    sortDirection: 'asc' | 'desc' = 'asc';
    creditCardsSortColumn: string = 'priority';
    creditCardsSortDirection: 'asc' | 'desc' = 'asc';
    personalLoansSortColumn: string = 'priority';
    personalLoansSortDirection: 'asc' | 'desc' = 'asc';
    autoLoansSortColumn: string = 'priority';
    autoLoansSortDirection: 'asc' | 'desc' = 'asc';

    // Modal states
    showEditModal = false;
    showAddModal = false;
    showDeleteConfirmation = false;
    editingAccount: DebtAccount | null = null;
    accountToDelete: DebtAccount | null = null;
    addAccountType: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN' = 'CREDIT_CARD';
    currentSnapshotDate: string = '';
    deleteConfirmationMessage: string = '';
    previousAccountsMap: Map<string, number> = new Map(); // Map<AccountName, PreviousBalance>

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

    isCardsView(): boolean {
        return this.viewMode === 'cards';
    }

    isTableView(): boolean {
        return this.viewMode === 'table';
    }

    isExpanded(category: CategoryKey): boolean {
        return this.expandedCategories.has(category);
    }

    setExpanded(category: CategoryKey): void {
        if (this.expandedCategories.has(category)) {
            this.expandedCategories.delete(category);
        } else {
            this.expandedCategories.add(category);
        }
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
        this.currentSnapshotDate = fileName;
        this.debtService.getSnapshotAccounts(fileName).subscribe(accounts => {
            this.creditCards = accounts.filter(a => a.type === 'CREDIT_CARD');
            this.personalLoans = accounts.filter(a => a.type === 'PERSONAL_LOAN');
            this.autoLoans = accounts.filter(a => a.type === 'AUTO_LOAN');

            // Load previous month's data
            this.debtService.getAvailableSnapshots().subscribe(snapshots => {
                // Sort snapshots chronologically
                const sorted = snapshots.sort((a, b) =>
                    new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
                );

                const currentIndex = sorted.findIndex(s => s.snapshotDate === fileName);
                if (currentIndex > 0) {
                    const previousDate = sorted[currentIndex - 1].snapshotDate;
                    this.debtService.getSnapshotAccounts(previousDate).subscribe(prevAccounts => {
                        this.previousAccountsMap.clear();
                        prevAccounts.forEach(acc => {
                            this.previousAccountsMap.set(acc.name, acc.currentBalance);
                        });
                    });
                } else {
                    this.previousAccountsMap.clear();
                }
            });
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
        if (apr < 15) return 'bg-[#FFB04C]/10 dark:bg-[#FFB04C]/20 text-[#FFB04C] dark:text-[#FFB04C]';
        return 'bg-[#FF5F56]/10 dark:bg-[#FF5F56]/20 text-[#FF5F56] dark:text-[#FF5F56]';
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

    getMonthlyChange(account: DebtAccount): number | null {
        if (!this.previousAccountsMap.has(account.name)) return null;
        const previousBalance = this.previousAccountsMap.get(account.name) || 0;
        return account.currentBalance - previousBalance;
    }

    isNewAccount(account: DebtAccount): boolean {
        // If we have previous data loaded but this account isn't in it, it's new
        return this.previousAccountsMap.size > 0 && !this.previousAccountsMap.has(account.name);
    }

    getTotalChange(accounts: DebtAccount[]): number {
        return accounts.reduce((sum, account) => {
            if (this.isNewAccount(account)) return sum; // Don't count new accounts in change
            const change = this.getMonthlyChange(account);
            return sum + (change || 0);
        }, 0);
    }

    getAccountsByType(type: 'credit' | 'personal' | 'auto'): DebtAccount[] {
        if (type === 'credit') {
            return this.hideZeroBalance
                ? this.creditCards.filter(acc => acc.currentBalance > 0)
                : this.creditCards;
        }
        if (type === 'personal') return this.personalLoans;
        return this.autoLoans;
    }

    getCategoryAccounts(category: CategoryKey): DebtAccount[] {
        if (category === 'credit') return this.hideZeroBalance ? this.creditCards.filter(acc => acc.currentBalance > 0) : this.creditCards;
        if (category === 'personal') return this.personalLoans;
        return this.autoLoans;
    }

    getCardAccounts(category: CategoryKey): DebtAccount[] {
        const accounts = [...this.getCategoryAccounts(category)];
        return accounts.sort((a, b) => this.compareBy(this.cardSort.column, a, b, this.cardSort.direction));
    }

    getTotalBalance(type: 'credit' | 'personal' | 'auto'): number {
        return this.getAccountsByType(type).reduce((sum, acc) => sum + acc.currentBalance, 0);
    }

    getTotalMonthlyChange(type: 'credit' | 'personal' | 'auto'): number | null {
        const accounts = this.getAccountsByType(type);
        if (this.previousAccountsMap.size === 0) return null;
        return this.getTotalChange(accounts);
    }

    getTotalInterest(type: 'credit' | 'personal' | 'auto'): number {
        return this.getAccountsByType(type).reduce((sum, acc) => sum + this.calculateMonthlyInterest(acc.currentBalance, acc.apr), 0);
    }

    getTotalPrincipal(type: 'credit' | 'personal' | 'auto'): number {
        return this.getAccountsByType(type).reduce((sum, acc) => sum + (acc.principalPerMonth || 0), 0);
    }

    getTotalMonthlyPayment(type: 'credit' | 'personal' | 'auto'): number {
        return this.getAccountsByType(type).reduce((sum, acc) => sum + (acc.monthlyPayment || 0), 0);
    }

    getCategorySummary(category: CategoryKey) {
        const accounts = this.getCategoryAccounts(category);
        const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const totalLimit = accounts.reduce((sum, acc) => sum + ((acc as any).creditLimit || 0), 0);
        const availableCredit = Math.max(totalLimit - totalBalance, 0);
        const weightedAprDenominator = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const avgApr = weightedAprDenominator > 0
            ? accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0) * (acc.apr || 0), 0) / weightedAprDenominator
            : 0;
        const nextDueDate = accounts
            .map(acc => (acc as any).dueDate || acc.payoffDate)
            .filter(Boolean)
            .map(date => new Date(date as string))
            .sort((a, b) => a.getTime() - b.getTime())[0];

        return {
            totalBalance,
            availableCredit,
            avgApr,
            nextDueDate
        };
    }

    getCategoryInsights(category: CategoryKey): string[] {
        const accounts = this.getCategoryAccounts(category);
        if (accounts.length === 0) return ['No accounts available in this category yet.'];

        const highestApr = [...accounts].sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
        const monthlyInterest = accounts.reduce((sum, acc) => sum + this.calculateMonthlyInterest(acc.currentBalance || 0, acc.apr || 0), 0);
        const suggestedPayoff = [...accounts].sort((a, b) =>
            this.calculateMonthlyInterest(b.currentBalance || 0, b.apr || 0) - this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0)
        )[0];
        const payoffMonths = accounts
            .filter(acc => acc.monthlyPayment && acc.currentBalance && acc.monthlyPayment > 0)
            .map(acc => Math.ceil((acc.currentBalance || 0) / (acc.monthlyPayment || 1)))[0];

        const insights: string[] = [];
        if (highestApr) {
            insights.push(`${highestApr.name} has the highest APR at ${highestApr.apr}%. Prioritize this for faster payoff.`);
        }
        if (monthlyInterest > 0) {
            insights.push(`You are paying about $${monthlyInterest.toFixed(0)}/month in interest across this category.`);
        }
        if (suggestedPayoff) {
            insights.push(`Redirect extra payments toward ${suggestedPayoff.name} to cut interest burn quickest.`);
        }
        if (payoffMonths) {
            insights.push(`At current pace, earliest payoff completes in ~${payoffMonths} months. Increase payments to accelerate.`);
        }
        return insights;
    }

    getTableAccounts(): DebtAccount[] {
        const combined = [...this.creditCards, ...this.personalLoans, ...this.autoLoans];
        const filtered = combined.filter(acc => {
            if (this.tableFilters.type !== 'all') {
                if (this.tableFilters.type === 'credit' && acc.type !== 'CREDIT_CARD') return false;
                if (this.tableFilters.type === 'personal' && acc.type !== 'PERSONAL_LOAN') return false;
                if (this.tableFilters.type === 'auto' && acc.type !== 'AUTO_LOAN') return false;
            }
            if (this.hideZeroBalance && (acc.currentBalance || 0) === 0) return false;
            if (this.tableFilters.aprMin !== null && acc.apr < this.tableFilters.aprMin) return false;
            if (this.tableFilters.aprMax !== null && acc.apr > this.tableFilters.aprMax) return false;
            if (this.tableFilters.balanceMin !== null && acc.currentBalance < this.tableFilters.balanceMin) return false;
            if (this.tableFilters.balanceMax !== null && acc.currentBalance > this.tableFilters.balanceMax) return false;
            return true;
        });

        return filtered.sort((a, b) => this.compareBy(this.tableSort.column, a, b, this.tableSort.direction));
    }

    compareBy(column: 'name' | 'type' | 'balance' | 'apr' | 'minPayment' | 'dueDate' | 'principal' | 'payoff' | 'monthsLeft' | 'change' | 'interest' | 'monthly',
        a: DebtAccount,
        b: DebtAccount,
        direction: 'asc' | 'desc'): number {
        let aValue: any;
        let bValue: any;

        switch (column) {
            case 'name':
                aValue = a.name?.toLowerCase() || '';
                bValue = b.name?.toLowerCase() || '';
                break;
            case 'type':
                aValue = a.type || '';
                bValue = b.type || '';
                break;
            case 'balance':
                aValue = a.currentBalance || 0;
                bValue = b.currentBalance || 0;
                break;
            case 'apr':
                aValue = a.apr || 0;
                bValue = b.apr || 0;
                break;
            case 'minPayment':
                aValue = a.monthlyPayment || 0;
                bValue = b.monthlyPayment || 0;
                break;
            case 'dueDate':
                aValue = (a as any).dueDate ? new Date((a as any).dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                bValue = (b as any).dueDate ? new Date((b as any).dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                break;
            case 'interest':
                aValue = this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0);
                bValue = this.calculateMonthlyInterest(b.currentBalance || 0, b.apr || 0);
                break;
            case 'principal':
                aValue = a.principalPerMonth || 0;
                bValue = b.principalPerMonth || 0;
                break;
            case 'monthly':
                aValue = a.monthlyPayment || 0;
                bValue = b.monthlyPayment || 0;
                break;
            case 'payoff':
                aValue = a.payoffDate ? new Date(a.payoffDate).getTime() : Number.MAX_SAFE_INTEGER;
                bValue = b.payoffDate ? new Date(b.payoffDate).getTime() : Number.MAX_SAFE_INTEGER;
                break;
            case 'monthsLeft':
                aValue = a.monthsLeft || Number.MAX_SAFE_INTEGER;
                bValue = b.monthsLeft || Number.MAX_SAFE_INTEGER;
                break;
            case 'change':
                const aChange = this.isNewAccount(a) ? Number.MAX_SAFE_INTEGER : (this.getMonthlyChange(a) || 0);
                const bChange = this.isNewAccount(b) ? Number.MAX_SAFE_INTEGER : (this.getMonthlyChange(b) || 0);
                aValue = aChange;
                bValue = bChange;
                break;
            default:
                aValue = 0; bValue = 0;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    }

    sortCards(column: 'balance' | 'apr' | 'minPayment' | 'dueDate') {
        if (this.cardSort.column === column) {
            this.cardSort.direction = this.cardSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.cardSort.column = column;
            this.cardSort.direction = 'desc';
        }
    }

    sortTable(column: 'name' | 'type' | 'balance' | 'apr' | 'minPayment' | 'dueDate') {
        if (this.tableSort.column === column) {
            this.tableSort.direction = this.tableSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.tableSort.column = column;
            this.tableSort.direction = 'asc';
        }
    }

    getSparklinePoints(account: DebtAccount): number[] {
        const history = (account as any).sparkline as number[] | undefined;
        if (history && history.length) return history.slice(-6);
        return [account.currentBalance, account.currentBalance];
    }

    getSparklineHeight(point: number, points: number[]): string {
        const max = Math.max(...points, 1);
        const minHeight = 6;
        return `${Math.max(minHeight, (point / max) * 40)}px`;
    }

    getCategoryLabel(type: DebtAccount['type']): string {
        if (type === 'CREDIT_CARD') return 'Credit Card';
        if (type === 'PERSONAL_LOAN') return 'Personal Loan';
        return 'Auto Loan';
    }

    openAccountAnalytics(account: DebtAccount) {
        // Placeholder for navigation hook to analytics view
        console.log('Open analytics for', account.name);
    }

    // Sorting methods
    sort(accountType: 'credit' | 'personal' | 'auto', column: string) {
        let sortColumn: string;
        let sortDirection: 'asc' | 'desc';
        let accounts: DebtAccount[];

        // Determine which account type to sort
        if (accountType === 'credit') {
            if (this.creditCardsSortColumn === column) {
                this.creditCardsSortDirection = this.creditCardsSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.creditCardsSortColumn = column;
                this.creditCardsSortDirection = 'asc';
            }
            sortColumn = this.creditCardsSortColumn;
            sortDirection = this.creditCardsSortDirection;
            accounts = this.creditCards;
        } else if (accountType === 'personal') {
            if (this.personalLoansSortColumn === column) {
                this.personalLoansSortDirection = this.personalLoansSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.personalLoansSortColumn = column;
                this.personalLoansSortDirection = 'asc';
            }
            sortColumn = this.personalLoansSortColumn;
            sortDirection = this.personalLoansSortDirection;
            accounts = this.personalLoans;
        } else {
            if (this.autoLoansSortColumn === column) {
                this.autoLoansSortDirection = this.autoLoansSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.autoLoansSortColumn = column;
                this.autoLoansSortDirection = 'asc';
            }
            sortColumn = this.autoLoansSortColumn;
            sortDirection = this.autoLoansSortDirection;
            accounts = this.autoLoans;
        }

        // Sort the accounts
        accounts.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            // Get values based on column
            switch (column) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    break;
                case 'balance':
                    aValue = a.currentBalance || 0;
                    bValue = b.currentBalance || 0;
                    break;
                case 'apr':
                    aValue = a.apr || 0;
                    bValue = b.apr || 0;
                    break;
                case 'monthly':
                    aValue = a.monthlyPayment || 0;
                    bValue = b.monthlyPayment || 0;
                    break;
                case 'priority':
                    aValue = a.priority || 999;
                    bValue = b.priority || 999;
                    break;
                case 'interest':
                    aValue = this.calculateMonthlyInterest(a.currentBalance || 0, a.apr || 0);
                    bValue = this.calculateMonthlyInterest(b.currentBalance || 0, b.apr || 0);
                    break;
                case 'principal':
                    aValue = a.principalPerMonth || 0;
                    bValue = b.principalPerMonth || 0;
                    break;
                case 'payoff':
                    aValue = a.payoffDate ? new Date(a.payoffDate).getTime() : Number.MAX_SAFE_INTEGER;
                    bValue = b.payoffDate ? new Date(b.payoffDate).getTime() : Number.MAX_SAFE_INTEGER;
                    break;
                case 'monthsLeft':
                    aValue = a.monthsLeft || Number.MAX_SAFE_INTEGER;
                    bValue = b.monthsLeft || Number.MAX_SAFE_INTEGER;
                    break;
                case 'change':
                    const aChange = this.isNewAccount(a) ? Number.MAX_SAFE_INTEGER : (this.getMonthlyChange(a) || 0);
                    const bChange = this.isNewAccount(b) ? Number.MAX_SAFE_INTEGER : (this.getMonthlyChange(b) || 0);
                    aValue = aChange;
                    bValue = bChange;
                    break;
                default:
                    return 0;
            }

            // Compare values
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Update the arrays
        if (accountType === 'credit') {
            this.creditCards = [...accounts];
        } else if (accountType === 'personal') {
            this.personalLoans = [...accounts];
        } else {
            this.autoLoans = [...accounts];
        }
    }

    getSortIcon(accountType: 'credit' | 'personal' | 'auto', column: string): string {
        let currentColumn: string;
        let currentDirection: 'asc' | 'desc';

        if (accountType === 'credit') {
            currentColumn = this.creditCardsSortColumn;
            currentDirection = this.creditCardsSortDirection;
        } else if (accountType === 'personal') {
            currentColumn = this.personalLoansSortColumn;
            currentDirection = this.personalLoansSortDirection;
        } else {
            currentColumn = this.autoLoansSortColumn;
            currentDirection = this.autoLoansSortDirection;
        }

        if (currentColumn !== column) return 'unfold_more';
        return currentDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }

    // Edit/Add/Delete methods
    editAccount(account: DebtAccount) {
        this.editingAccount = { ...account };
        this.showEditModal = true;
    }

    getAccountTypeFromCategory(key: CategoryKey): 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN' {
        if (key === 'personal') return 'PERSONAL_LOAN';
        if (key === 'auto') return 'AUTO_LOAN';
        return 'CREDIT_CARD';
    }

    newAccount: DebtAccount = {
        name: '',
        type: 'CREDIT_CARD',
        currentBalance: 0,
        apr: 0,
        monthlyPayment: 0
    };

    addNewAccount(type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN') {
        this.addAccountType = type;
        this.newAccount = {
            name: '',
            type: type,
            currentBalance: 0,
            apr: 0,
            monthlyPayment: 0,
            creditLimit: 0 // Added credit limit
        };
        this.showAddModal = true;
    }

    deleteAccount(account: DebtAccount) {
        this.accountToDelete = account;
        this.deleteConfirmationMessage = `Are you sure you want to delete "${account.name}"? This action cannot be undone.`;
        this.showDeleteConfirmation = true;
    }

    saveAccount(account: DebtAccount) {
        if (account.id) {
            // Update existing account
            this.debtService.updateDebt(account.id, account).subscribe({
                next: () => {
                    this.showEditModal = false;
                    this.editingAccount = null;
                    this.loadSnapshotAccounts(this.currentSnapshotDate);
                },
                error: (error) => {
                    console.error('Error updating account:', error);
                    alert('Failed to update account. Please try again.');
                }
            });
        } else {
            // Create new account
            this.debtService.createDebt(account).subscribe({
                next: () => {
                    this.showAddModal = false;
                    this.loadSnapshotAccounts(this.currentSnapshotDate);
                },
                error: (error) => {
                    console.error('Error creating account:', error);
                    alert('Failed to create account. Please try again.');
                }
            });
        }
    }

    confirmDelete() {
        if (this.accountToDelete && this.accountToDelete.id) {
            this.debtService.deleteDebt(this.accountToDelete.id).subscribe({
                next: () => {
                    this.showDeleteConfirmation = false;
                    this.accountToDelete = null;
                    this.loadSnapshotAccounts(this.currentSnapshotDate);
                },
                error: (error) => {
                    console.error('Error deleting account:', error);
                    alert('Failed to delete account. Please try again.');
                    this.showDeleteConfirmation = false;
                    this.accountToDelete = null;
                }
            });
        }
    }

    cancelDelete() {
        this.showDeleteConfirmation = false;
        this.accountToDelete = null;
    }

    cancelEdit() {
        this.showEditModal = false;
        this.editingAccount = null;
    }

    cancelAdd() {
        this.showAddModal = false;
    }
}
