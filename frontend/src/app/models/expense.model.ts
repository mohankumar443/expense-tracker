export interface Expense {
    id?: number;
    description: string;
    amount: number;
    category: string;
    date: string;
    isRecurring?: boolean;
}
