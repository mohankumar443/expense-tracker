import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastMessage, ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html'
})
export class ToastComponent implements OnInit, OnDestroy {
    messages: ToastMessage[] = [];
    private subscription?: Subscription;

    constructor(private toastService: ToastService) { }

    ngOnInit() {
        this.subscription = this.toastService.messages$.subscribe(message => {
            this.messages = [...this.messages, message];
            setTimeout(() => this.dismiss(message.id), 3000);
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    dismiss(id: number) {
        this.messages = this.messages.filter(m => m.id !== id);
    }
}
