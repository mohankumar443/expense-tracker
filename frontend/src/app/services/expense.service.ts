import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Expense {
    id?: number;
    description: string;
    amount: number;
    date: string;
    category: string;
}

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private apiUrl = 'http://localhost:8080/api/expenses';

    constructor(private http: HttpClient) { }

    getExpenses(): Observable<Expense[]> {
        return this.http.get<Expense[]>(this.apiUrl);
    }

    addExpense(expense: Expense): Observable<Expense> {
        return this.http.post<Expense>(this.apiUrl, expense);
    }

    deleteExpense(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
