#!/bin/bash

FILE="/Users/likhithadalapathi/Desktop/WorkSpace/Expense tracker/frontend/src/app/components/debt-accounts-list/debt-accounts-list.component.html"

# Find line numbers for Personal Loans and Auto Loans Notes cells
echo "Finding line numbers..."
grep -n "{{ account.notes }}</td>" "$FILE"

echo ""
echo "Manual steps needed:"
echo "1. Add action buttons after line 533 (Personal Loans)"
echo "2. Add Auto Loans 'Add New' button"  
echo "3. Add Actions header to Auto Loans table"
echo "4. Add action buttons to Auto Loans rows"
