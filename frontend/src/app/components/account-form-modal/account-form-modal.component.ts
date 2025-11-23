import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DebtAccount } from '../../services/debt-account.service';

@Component({
    selector: 'app-account-form-modal',
    templateUrl: './account-form-modal.component.html',
    styleUrls: ['./account-form-modal.component.css']
})
export class AccountFormModalComponent implements OnInit {
    @Input() isVisible = false;
    @Input() account: DebtAccount | null = null;
    @Input() accountType: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN' = 'CREDIT_CARD';
    @Input() mode: 'edit' | 'add' = 'add';
    @Input() snapshotDate: string = '';

    @Output() save = new EventEmitter<DebtAccount>();
    @Output() cancel = new EventEmitter<void>();

    formData: DebtAccount = this.getEmptyAccount();
    errors: { [key: string]: string } = {};

    ngOnInit() {
        if (this.mode === 'edit' && this.account) {
            this.formData = { ...this.account };
        } else {
            this.formData = this.getEmptyAccount();
            this.formData.type = this.accountType;
        }
    }

    ngOnChanges() {
        if (this.isVisible) {
            if (this.mode === 'edit' && this.account) {
                this.formData = { ...this.account };
            } else {
                this.formData = this.getEmptyAccount();
                this.formData.type = this.accountType;
            }
            this.errors = {};
        }
    }

    getEmptyAccount(): DebtAccount {
        return {
            accountId: '',
            name: '',
            type: this.accountType,
            currentBalance: 0,
            apr: 0,
            monthlyPayment: 0,
            principalPerMonth: 0,
            payoffDate: null,
            monthsLeft: 0,
            priority: 0,
            notes: '',
            status: 'ACTIVE',
            snapshotDate: this.snapshotDate
        };
    }

    validateForm(): boolean {
        this.errors = {};
        let isValid = true;

        if (!this.formData.name || this.formData.name.trim() === '') {
            this.errors['name'] = 'Account name is required';
            isValid = false;
        }

        if (this.formData.currentBalance === null || this.formData.currentBalance === undefined || this.formData.currentBalance < 0) {
            this.errors['currentBalance'] = 'Balance must be 0 or greater';
            isValid = false;
        }

        if (this.formData.apr === null || this.formData.apr === undefined || this.formData.apr < 0 || this.formData.apr > 100) {
            this.errors['apr'] = 'APR must be between 0 and 100';
            isValid = false;
        }

        if (this.formData.monthlyPayment === null || this.formData.monthlyPayment === undefined || this.formData.monthlyPayment < 0) {
            this.errors['monthlyPayment'] = 'Monthly payment must be 0 or greater';
            isValid = false;
        }

        return isValid;
    }

    onSave() {
        if (this.validateForm()) {
            // Generate accountId if adding new account
            if (this.mode === 'add' && !this.formData.accountId) {
                this.formData.accountId = this.formData.name.toLowerCase().replace(/\s+/g, '-');
            }

            // Set snapshot date
            this.formData.snapshotDate = this.snapshotDate;

            this.save.emit(this.formData);
        }
    }

    onCancel() {
        this.cancel.emit();
    }

    calculatePrincipal() {
        if (this.formData.currentBalance && this.formData.apr !== null && this.formData.monthlyPayment) {
            const monthlyInterest = (this.formData.currentBalance * this.formData.apr) / 100 / 12;
            this.formData.principalPerMonth = Math.max(0, this.formData.monthlyPayment - monthlyInterest);
        }
    }

    calculateMonthsLeft() {
        if (this.formData.currentBalance && this.formData.principalPerMonth && this.formData.principalPerMonth > 0) {
            this.formData.monthsLeft = Math.ceil(this.formData.currentBalance / this.formData.principalPerMonth);
        }
    }

    getTypeLabel(): string {
        switch (this.accountType) {
            case 'CREDIT_CARD': return 'Credit Card';
            case 'PERSONAL_LOAN': return 'Personal Loan';
            case 'AUTO_LOAN': return 'Auto Loan';
            default: return 'Account';
        }
    }
}
