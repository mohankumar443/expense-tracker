import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecurringExpense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  emi: boolean;
  debtAccountId?: string;
  active: boolean;
  lastGenerated?: string; // Date string
}

@Injectable({
  providedIn: 'root'
})
export class RecurringExpenseService {
  private apiUrl = 'http://localhost:8080/api/recurring-expenses';

  constructor(private http: HttpClient) { }

  getAll(): Observable<RecurringExpense[]> {
    return this.http.get<RecurringExpense[]>(this.apiUrl);
  }

  create(expense: RecurringExpense): Observable<RecurringExpense> {
    return this.http.post<RecurringExpense>(this.apiUrl, expense);
  }

  update(id: string, expense: RecurringExpense): Observable<RecurringExpense> {
    return this.http.put<RecurringExpense>(`${this.apiUrl}/${id}`, expense);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  processNow(): Observable<any> {
    return this.http.post(`${this.apiUrl}/process`, {});
  }
}
