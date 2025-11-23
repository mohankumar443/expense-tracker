export interface Account {
    id?: string;
    accountId: string;
    name: string;
    type: 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'AUTO_LOAN' | 'MORTGAGE' | 'STUDENT_LOAN';
    currentBalance: number;
    creditLimit?: number;
    apr: number;
    monthlyPayment: number;
    promoExpires?: string;
    status: 'ACTIVE' | 'PAID_OFF' | 'CLOSED';
    openedDate?: string;
    notes?: string;
    principalPerMonth?: number;
    payoffDate?: string;
    monthsLeft?: number;
    priority?: number;
    snapshotDate: string;
    createdAt?: string;
    updatedAt?: string;
}
