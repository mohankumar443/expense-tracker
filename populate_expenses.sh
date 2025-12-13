
#!/bin/bash

# Base URL
URL="http://localhost:8080/api/recurring-expenses"
PROCESS_URL="http://localhost:8080/api/recurring-expenses/process"

# Function to add expense
add_expense() {
    desc="$1"
    amount="$2"
    cat="$3"
    is_emi="$4"
    
    echo "Adding $desc..."
    curl -X POST -H "Content-Type: application/json" -d "{\"description\":\"$desc\",\"amount\":$amount,\"category\":\"$cat\",\"dayOfMonth\":1,\"active\":true,\"isEmi\":$is_emi}" "$URL"
    echo ""
}

# Subscriptions
add_expense "Zips Car Wash" 25.0 "Subscriptions" false
add_expense "Easy Code" 20.0 "Subscriptions" false
add_expense "Spectrum" 134.99 "Subscriptions" false

# EMIs
add_expense "Car Loan" 805.0 "Car EMI" true
add_expense "Citi Loan" 672.79 "Loan EMI" true
add_expense "AMEX Loan 1" 121.0 "Loan EMI" true
add_expense "Fidelity Loan" 380.0 "Loan EMI" true
add_expense "Sofi Loan 1" 1041.81 "Loan EMI" true
add_expense "Sofi Loan 2" 809.1 "Loan EMI" true

# Trigger Process
echo "Processing expenses..."
curl -X POST "$PROCESS_URL"
echo ""
echo "Done."
