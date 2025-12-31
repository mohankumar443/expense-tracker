import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: number;
    text: string;
    type: ToastType;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private messagesSubject = new Subject<ToastMessage>();
    messages$ = this.messagesSubject.asObservable();
    private nextId = 1;

    show(text: string, type: ToastType = 'info') {
        this.messagesSubject.next({ id: this.nextId++, text, type });
    }
}
