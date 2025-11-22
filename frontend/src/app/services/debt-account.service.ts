import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DebtAccount {
    id?: number;
    name: string;
    accountType: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN';
    currentBalance: number;
    apr: number;
    monthlyPayment?: number;
    promoExpirationDate?: string;
    notes?: string;
    createdDate?: string;
    lastUpdated?: string;
}

export interface DebtSummary {
    snapshotDate: string;
    totalDebt: number;
    creditCardDebt: number;
    personalLoanDebt: number;
    autoLoanDebt: number;
    totalAccounts: number;
}

export interface SnapshotInfo {
    fileName: string;
    displayName: string;
    snapshotDate: string;
    isActive: boolean;
}

export interface Snapshot {
    id: string;
    snapshotDate: string;
    totalDebt: number;
    creditCardDebt: number;
    personalLoanDebt: number;
    autoLoanDebt: number;
    totalAccounts: number;
    activeAccounts: number;
    paidOffAccounts: number;
    totalMonthlyPayment: number;
    totalMonthlyInterest: number;
    performanceScore: number;
    metadata: any;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class DebtAccountService {
    private apiUrl = 'http://localhost:8080/api/debts';
    private snapshotUrl = 'http://localhost:8080/api/debt/snapshots';

    constructor(private http: HttpClient) { }

    getAllDebts(): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(this.apiUrl);
    }

    getDebtById(id: number): Observable<DebtAccount> {
        return this.http.get<DebtAccount>(`${this.apiUrl}/${id}`);
    }

    getDebtsByType(type: string): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/type/${type}`);
    }

    createDebt(debt: DebtAccount): Observable<DebtAccount> {
        return this.http.post<DebtAccount>(this.apiUrl, debt);
    }

    updateDebt(id: number, debt: DebtAccount): Observable<DebtAccount> {
        return this.http.put<DebtAccount>(`${this.apiUrl}/${id}`, debt);
    }

    deleteDebt(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getDebtSummary(): Observable<DebtSummary> {
        return this.http.get<DebtSummary>(`${this.apiUrl}/summary`);
    }

    getPayoffStrategy(): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/strategy`);
    }

    getAvailableSnapshots(): Observable<SnapshotInfo[]> {
        return this.http.get<SnapshotInfo[]>(`${this.apiUrl}/snapshots`);
    }

    getSnapshotAccounts(fileName: string): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/snapshot/${fileName}`);
    }

    getSnapshotSummary(fileName: string): Observable<DebtSummary> {
        return this.http.get<DebtSummary>(`${this.apiUrl}/snapshot/${fileName}/summary`);
    }

    getSnapshotsGroupedByYear(): Observable<{ [key: number]: Snapshot[] }> {
        return this.http.get<{ [key: number]: Snapshot[] }>(`${this.snapshotUrl}/grouped-by-year`);
    }
}
