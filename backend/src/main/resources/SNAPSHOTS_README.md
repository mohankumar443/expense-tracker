# Debt Snapshots

This directory contains monthly debt snapshots to track your debt reduction progress over time.

## File Naming Convention
`debt-snapshot-YYYY-MM.json`

Example:
- `debt-snapshot-2025-09.json` - September 2025
- `debt-snapshot-2025-10.json` - October 2025
- `debt-snapshot-2025-11.json` - November 2025

## Current Active Snapshot
The application loads the most recent snapshot on startup. Update the `DebtDataLoader.java` to point to the current month's file.

## Snapshot Structure
Each snapshot contains:
- **snapshotDate**: End date of the month (YYYY-MM-DD)
- **totalDebt**: Total debt across all accounts
- **creditCards**: All credit card accounts with balances and APR
- **personalLoans**: All personal loan accounts
- **autoLoan**: Auto loan accounts
- **payoffStrategy**: Recommended payment order by APR

## Adding a New Month
1. Copy the previous month's snapshot
2. Rename to the new month (e.g., `debt-snapshot-2025-11.json`)
3. Update the `snapshotDate`
4. Update all account balances
5. Recalculate totals
6. Update `DebtDataLoader.java` to load the new file
