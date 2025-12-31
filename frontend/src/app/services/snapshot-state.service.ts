import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SnapshotStateService {
    private readonly STORAGE_KEY = 'selected_snapshot_date';
    private currentSnapshotSubject = new BehaviorSubject<string>(localStorage.getItem(this.STORAGE_KEY) || '');
    currentSnapshot$ = this.currentSnapshotSubject.asObservable();

    setCurrentSnapshot(fileName: string) {
        if (fileName) {
            localStorage.setItem(this.STORAGE_KEY, fileName);
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
        this.currentSnapshotSubject.next(fileName);
    }

    getCurrentSnapshot(): string {
        return this.currentSnapshotSubject.value;
    }
}
