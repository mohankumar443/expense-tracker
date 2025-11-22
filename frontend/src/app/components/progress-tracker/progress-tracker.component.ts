import { Component, OnInit } from '@angular/core';
import { DebtAccountService, DebtSummary } from '../../services/debt-account.service';
import { SnapshotStateService } from '../../services/snapshot-state.service';

@Component({
    selector: 'app-progress-tracker',
    templateUrl: './progress-tracker.component.html',
    styleUrls: ['./progress-tracker.component.css']
})
export class ProgressTrackerComponent implements OnInit {
    septemberSummary: DebtSummary | null = null;
    octoberSummary: DebtSummary | null = null;
    showComparison = false;
    Math = Math; // Make Math available in template

    constructor(
        private debtService: DebtAccountService,
        private snapshotState: SnapshotStateService
    ) { }

    ngOnInit() {
        this.loadComparison();

        // Reload when snapshot changes
        this.snapshotState.currentSnapshot$.subscribe(() => {
            this.loadComparison();
        });
    }

    loadComparison() {
        // Load both months
        this.debtService.getSnapshotSummary('debt-snapshot-2025-09.json').subscribe(data => {
            this.septemberSummary = data;
            this.checkIfBothLoaded();
        });

        this.debtService.getSnapshotSummary('debt-snapshot-2025-10.json').subscribe(data => {
            this.octoberSummary = data;
            this.checkIfBothLoaded();
        });
    }

    checkIfBothLoaded() {
        this.showComparison = this.septemberSummary !== null && this.octoberSummary !== null;
    }

    getDebtChange(): number {
        if (!this.septemberSummary || !this.octoberSummary) return 0;
        return this.octoberSummary.totalDebt - this.septemberSummary.totalDebt;
    }

    getPercentageChange(): number {
        if (!this.septemberSummary || !this.octoberSummary || this.septemberSummary.totalDebt === 0) return 0;
        return ((this.octoberSummary.totalDebt - this.septemberSummary.totalDebt) / this.septemberSummary.totalDebt) * 100;
    }

    isImprovement(): boolean {
        return this.getDebtChange() < 0;
    }
}
