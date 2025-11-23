import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-confirmation-modal',
    templateUrl: './confirmation-modal.component.html',
    styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
    @Input() isVisible = false;
    @Input() title = 'Confirm Action';
    @Input() message = 'Are you sure you want to proceed?';
    @Input() confirmText = 'Confirm';
    @Input() cancelText = 'Cancel';
    @Input() isDanger = false;

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}
