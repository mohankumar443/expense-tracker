export interface Expense {
    id?: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    cardName?: string;
    isRecurring?: boolean;
}
