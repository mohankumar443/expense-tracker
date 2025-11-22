import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SnapshotStateService {
    private currentSnapshotSubject = new BehaviorSubject<string>('debt-snapshot-2025-09.json');
    currentSnapshot$ = this.currentSnapshotSubject.asObservable();

    setCurrentSnapshot(fileName: string) {
        this.currentSnapshotSubject.next(fileName);
    }

    getCurrentSnapshot(): string {
        return this.currentSnapshotSubject.value;
    }
}
