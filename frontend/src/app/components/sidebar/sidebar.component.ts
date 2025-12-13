import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { slideInLeft } from '../../animations';
import { DebtAccountService, Snapshot } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    animations: [slideInLeft]
})
export class SidebarComponent implements OnInit {
    isCollapsed = false;
    activeTab = 'overview';

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

            // Expand the most recent year by default
            if (this.years.length > 0) {
                this.expandedYears[this.years[0]] = true;
            }
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
        this.setActiveTab('overview');
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
        let sectionId = '';

        switch (tab) {
            case 'overview':
                sectionId = 'overview';
                break;
            case 'strategy':
                sectionId = 'strategy';
                break;
            case 'progress':
                sectionId = 'progress';
                break;
            case 'accounts':
                sectionId = 'accounts';
                break;
            case 'budget':
                sectionId = 'budget';
                break;
            case 'recurring':
                sectionId = 'recurring';
                break;
        }

        if (sectionId) {
            this.scrollToSection(sectionId);
        }
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
            this.debtService.deleteSnapshot(this.snapshotToDelete.snapshotDate).subscribe({
                next: () => {
                    console.log('Snapshot deleted successfully');
                    // Reload snapshots to update the sidebar
                    this.loadSnapshots();
                    // Notify other components to refresh
                    this.snapshotStateService.setCurrentSnapshot('');
                    this.showDeleteConfirmation = false;
                    this.snapshotToDelete = null;
                },
                error: (error) => {
                    console.error('Error deleting snapshot:', error);
                    alert('Failed to delete snapshot. Please try again.');
                    this.showDeleteConfirmation = false;
                    this.snapshotToDelete = null;
                }
            });
        }
    }

    cancelDelete() {
        this.showDeleteConfirmation = false;
        this.snapshotToDelete = null;
    }
}
