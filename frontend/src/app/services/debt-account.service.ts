import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DebtAccount {
    id?: string;
    name: string;
    type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN';
    currentBalance: number;
    apr: number;
    monthlyPayment?: number;
    promoExpires?: string;
    notes?: string;
    createdDate?: string;
    lastUpdated?: string;
    snapshotDate?: string;
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
    private apiUrl = 'http://localhost:8080/api/debt/accounts';
    private snapshotUrl = 'http://localhost:8080/api/debt/snapshots';

    constructor(private http: HttpClient) { }

    getAllDebts(): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(this.apiUrl);
    }

    getDebtById(id: string): Observable<DebtAccount> {
        return this.http.get<DebtAccount>(`${this.apiUrl}/${id}`);
    }

    getDebtsByType(type: string): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/type/${type}`);
    }

    createDebt(debt: DebtAccount): Observable<DebtAccount> {
        return this.http.post<DebtAccount>(this.apiUrl, debt);
    }

    updateDebt(id: string, debt: DebtAccount): Observable<DebtAccount> {
        return this.http.put<DebtAccount>(`${this.apiUrl}/${id}`, debt);
    }

    deleteDebt(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getDebtSummary(): Observable<DebtSummary> {
        return this.http.get<DebtSummary>(`${this.apiUrl}/summary`);
    }

    getPayoffStrategy(): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/strategy`);
    }

    getAvailableSnapshots(): Observable<Snapshot[]> {
        return this.http.get<Snapshot[]>(`${this.snapshotUrl}`);
    }

    getSnapshotAccounts(date: string): Observable<DebtAccount[]> {
        return this.http.get<DebtAccount[]>(`${this.apiUrl}/snapshot/${date}`);
    }

    getSnapshotSummary(date: string): Observable<DebtSummary> {
        return this.http.get<DebtSummary>(`${this.snapshotUrl}/date/${date}`);
    }

    getSnapshotsGroupedByYear(): Observable<{ [key: number]: Snapshot[] }> {
        return this.http.get<{ [key: number]: Snapshot[] }>(`${this.snapshotUrl}/grouped-by-year`);
    }
}
