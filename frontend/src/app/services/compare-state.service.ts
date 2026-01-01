import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CompareStateService {
    private readonly openCompareSubject = new Subject<void>();
    openCompare$ = this.openCompareSubject.asObservable();

    open() {
        this.openCompareSubject.next();
    }
}
