import { Component, OnInit } from '@angular/core';
import { DebtAccountService, Snapshot } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
    isCollapsed = false;
    activeTab = 'overview';

    groupedSnapshots: { [key: number]: Snapshot[] } = {};
    years: number[] = [];
    expandedYears: { [key: number]: boolean } = {};

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
        // Scroll to section
        const element = document.getElementById(tab);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    scrollToSection(sectionId: string) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
