import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AutoCategorizationService {

    private keywords: { [key: string]: string } = {
        // Food & Dining
        'starbucks': 'Food',
        'mcdonalds': 'Food',
        'burger king': 'Food',
        'subway': 'Food',
        'chipotle': 'Food',
        'restaurant': 'Food',
        'cafe': 'Food',
        'coffee': 'Food',
        'pizza': 'Food',
        'doordash': 'Food',
        'ubereats': 'Food',
        'grubhub': 'Food',
        'dining': 'Food',
        'lunch': 'Food',
        'dinner': 'Food',
        'breakfast': 'Food',

        // Grocery
        'walmart': 'Grocery',
        'target': 'Grocery',
        'costco': 'Grocery',
        'kroger': 'Grocery',
        'whole foods': 'Grocery',
        'trader joes': 'Grocery',
        'safeway': 'Grocery',
        'aldi': 'Grocery',
        'lidl': 'Grocery',
        'publix': 'Grocery',
        'wegmans': 'Grocery',
        'market': 'Grocery',
        'grocery': 'Grocery',

        // Transport
        'uber': 'Transport',
        'lyft': 'Transport',
        'shell': 'Transport',
        'bp': 'Transport',
        'exxon': 'Transport',
        'chevron': 'Transport',
        'wawa': 'Transport',
        'gas': 'Transport',
        'fuel': 'Transport',
        'parking': 'Transport',
        'toll': 'Transport',
        'metro': 'Transport',
        'bus': 'Transport',
        'train': 'Transport',
        'airline': 'Transport',
        'flight': 'Transport',

        // Utilities
        'electric': 'Utilities',
        'water': 'Utilities',
        'gas bill': 'Utilities',
        'internet': 'Utilities',
        'wifi': 'Utilities',
        'comcast': 'Utilities',
        'xfinity': 'Utilities',
        'verizon': 'Utilities',
        'att': 'Utilities',
        't-mobile': 'Utilities',
        'sprint': 'Utilities',
        'phone': 'Phone bill',
        'mobile': 'Phone bill',

        // Entertainment
        'netflix': 'Entertainment',
        'hulu': 'Entertainment',
        'spotify': 'Entertainment',
        'disney': 'Entertainment',
        'hbo': 'Entertainment',
        'cinema': 'Entertainment',
        'movie': 'Entertainment',
        'theatre': 'Entertainment',
        'game': 'Entertainment',
        'steam': 'Entertainment',
        'playstation': 'Entertainment',
        'xbox': 'Entertainment',
        'nintendo': 'Entertainment',

        // Shopping
        'amazon': 'Shopping',
        'ebay': 'Shopping',
        'clothing': 'Shopping',
        'shoes': 'Shopping',
        'apparel': 'Shopping',
        'nike': 'Shopping',
        'adidas': 'Shopping',
        'store': 'Shopping',
        'mall': 'Shopping',

        // Health
        'pharmacy': 'Health',
        'cvs': 'Health',
        'walgreens': 'Health',
        'doctor': 'Health',
        'hospital': 'Health',
        'clinic': 'Health',
        'dentist': 'Health',
        'gym': 'Health',
        'fitness': 'Health',
        'workout': 'Health',

        // Housing
        'rent': 'Room rent',
        'mortgage': 'Room rent',
        'apartment': 'Room rent',
        'housing': 'Room rent',

        // Insurance
        'insurance': 'Insurance',
        'geico': 'Insurance',
        'progressive': 'Insurance',
        'state farm': 'Insurance',
        'allstate': 'Insurance',
        'liberty mutual': 'Insurance',

        // Car
        'car payment': 'Car EMI',
        'auto loan': 'Car EMI',
        'toyota': 'Car EMI',
        'honda': 'Car EMI',
        'ford': 'Car EMI',
        'bmw': 'Car EMI',
        'mercedes': 'Car EMI'
    };

    constructor() { }

    categorize(description: string): string | null {
        if (!description) return null;

        const lowerDesc = description.toLowerCase();

        for (const [keyword, category] of Object.entries(this.keywords)) {
            if (lowerDesc.includes(keyword)) {
                return category;
            }
        }

        return null; // Return null if no match found, letting user/default decide
    }
}
