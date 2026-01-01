import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastMessage, ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html'
})
export class ToastComponent implements OnInit, OnDestroy {
    messages: ToastMessage[] = [];
    remainingSeconds: { [key: number]: number } = {};
    private timers: { [key: number]: any } = {};
    private subscription?: Subscription;

    constructor(private toastService: ToastService) { }

    ngOnInit() {
        this.subscription = this.toastService.messages$.subscribe(message => {
            this.messages = [...this.messages, message];
            const durationMs = message.type === 'error' ? 0 : (message.durationMs ?? 5000);
            if (durationMs > 0) {
                this.remainingSeconds[message.id] = Math.max(1, Math.ceil(durationMs / 1000));
                this.timers[message.id] = setInterval(() => {
                    this.remainingSeconds[message.id] = Math.max(0, (this.remainingSeconds[message.id] || 0) - 1);
                }, 1000);
                setTimeout(() => this.dismiss(message.id), durationMs);
            }
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
        Object.values(this.timers).forEach(timer => clearInterval(timer));
    }

    dismiss(id: number) {
        this.messages = this.messages.filter(m => m.id !== id);
        if (this.timers[id]) {
            clearInterval(this.timers[id]);
            delete this.timers[id];
        }
        delete this.remainingSeconds[id];
    }
}
