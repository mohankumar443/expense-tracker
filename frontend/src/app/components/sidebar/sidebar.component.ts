import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { slideInLeft } from '../../animations';
import { DebtAccountService, Snapshot } from '../../services/debt-account.service';
import { RetirementService } from '../../services/retirement.service';
import { CompareStateService } from '../../services/compare-state.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    animations: [slideInLeft]
})
export class SidebarComponent implements OnInit {
    isCollapsed = false;
    activeSection = 'overview';
    showMore = false;
    private navItemType = null as unknown as { id: string; label: string; icon: string; hint?: string };
    primaryNavItems: Array<{ id: string; label: string; icon: string; hint?: string }> = [
        { id: 'overview', label: 'Overview', icon: 'dashboard', hint: 'Debt + Retirement' }
    ];
    secondaryNavItems: Array<{ id: string; label: string; icon: string; hint?: string }> = [
        { id: 'strategy', label: 'Strategy Center', icon: 'bolt' },
        { id: 'progress', label: 'Progress', icon: 'show_chart' },
        { id: 'accounts', label: 'Debt Accounts', icon: 'account_balance_wallet' },
        { id: 'budget', label: 'Budget & Expenses', icon: 'payments' },
        { id: 'recurring', label: 'Recurring & EMIs', icon: 'repeat' }
    ];

    @Output() sidebarToggled = new EventEmitter<boolean>();

    groupedSnapshots: { [key: number]: Snapshot[] } = {};
    years: number[] = [];
    expandedYears: { [key: number]: boolean } = {};

    // Confirmation modal state
    showDeleteConfirmation = false;
    snapshotToDelete: Snapshot | null = null;
    deleteConfirmationMessage = '';

    constructor(
        private debtService: DebtAccountService,
        private retirementService: RetirementService,
        private compareStateService: CompareStateService,
        private snapshotStateService: SnapshotStateService
    ) { }

    ngOnInit() {
        this.loadSnapshots();
    }

    loadSnapshots() {
        this.debtService.getSnapshotsGroupedByYear().subscribe(data => {
            this.groupedSnapshots = data;
            // Sort years descending (newest first)
            this.years = Object.keys(data).map(Number).sort((a, b) => b - a);

            // All years are collapsed by default now
        });
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        this.sidebarToggled.emit(this.isCollapsed);
    }

    toggleYear(year: number) {
        this.expandedYears[year] = !this.expandedYears[year];
    }

    getMonthName(dateStr: string): string {
        const date = new Date(dateStr);
        // Add timezone offset handling if needed, but for month name usually fine
        // Using UTC to avoid timezone shifts changing the month
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return utcDate.toLocaleString('default', { month: 'long' });
    }

    selectSnapshot(snapshot: Snapshot) {
        this.snapshotStateService.setCurrentSnapshot(snapshot.snapshotDate);
        this.setActiveSection('overview');
    }

    get shouldShowMoreExpanded() {
        return this.showMore;
    }

    toggleMore() {
        this.showMore = !this.showMore;
    }

    openCompare() {
        this.compareStateService.open();
    }

    get totalSecondaryCount() {
        return this.secondaryNavItems.length;
    }

    setActiveSection(sectionId: string) {
        this.activeSection = sectionId;
        this.scrollToSection(sectionId);
    }

    scrollToSection(sectionId: string) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    deleteSnapshot(snapshot: Snapshot) {
        console.log('deleteSnapshot called for:', snapshot);
        const monthName = this.getMonthName(snapshot.snapshotDate);
        this.deleteConfirmationMessage = `Are you sure you want to delete the snapshot for ${monthName}? This will also delete all associated account data.`;
        this.snapshotToDelete = snapshot;
        this.showDeleteConfirmation = true;
    }

    confirmDelete() {
        if (this.snapshotToDelete) {
            this.runDelete(this.snapshotToDelete);
            this.showDeleteConfirmation = false;
            this.snapshotToDelete = null;
        }
    }

    private normalizeSnapshotDate(value: string): string {
        return value ? value.slice(0, 10) : value;
    }

    private normalizeMonthYear(value: string): string {
        return value ? value.slice(0, 7) : value;
    }

    private refreshAfterDelete() {
        this.loadSnapshots();
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

    private runDelete(snapshot: Snapshot) {
        const snapshotDate = this.normalizeSnapshotDate(snapshot.snapshotDate);
        const monthYear = this.normalizeMonthYear(snapshot.snapshotDate);
        forkJoin([
            this.debtService.deleteSnapshot(snapshotDate),
            this.retirementService.deleteSnapshotByMonth(monthYear).pipe(catchError(() => of(null)))
        ])
            .subscribe({
                next: () => {
                    console.log('Snapshot deleted successfully');
                    this.refreshAfterDelete();
                },
                error: (error) => {
                    console.error('Error deleting snapshot:', error);
                    alert('Failed to delete snapshot. Please try again.');
                }
            });
    }

    cancelDelete() {
        this.showDeleteConfirmation = false;
        this.snapshotToDelete = null;
    }
}
