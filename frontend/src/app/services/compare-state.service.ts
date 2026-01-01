import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CompareStateService {
    private readonly openCompareSubject = new Subject<void>();
    openCompare$ = this.openCompareSubject.asObservable();
    private readonly activeSubject = new BehaviorSubject<boolean>(false);
    compareActive$ = this.activeSubject.asObservable();

    open() {
        this.openCompareSubject.next();
    }

    setActive(isActive: boolean) {
        this.activeSubject.next(isActive);
    }
}
