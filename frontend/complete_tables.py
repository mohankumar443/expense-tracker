#!/usr/bin/env python3
import re

file_path = "/Users/likhithadalapathi/Desktop/WorkSpace/Expense tracker/frontend/src/app/components/debt-accounts-list/debt-accounts-list.component.html"

# Read the file
with open(file_path, 'r') as f:
    lines = f.readlines()

# Action buttons template
action_buttons = '''                            <td class="px-4 py-4 whitespace-nowrap text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button (click)="editAccount(account)" 
                                        class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Edit">
                                        <span class="material-icons text-sm">edit</span>
                                    </button>
                                    <button (click)="deleteAccount(account)"
                                        class="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete">
                                        <span class="material-icons text-sm">delete</span>
                                    </button>
                                </div>
                            </td>
'''

# Actions header template
actions_header = '''                            <th
                                class="px-4 py-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions</th>
'''

# Add New Auto Loan button template
add_auto_button = '''            
            <!-- Add New Account Button -->
            <button *ngIf="!autoLoansCollapsed" (click)="addNewAccount('AUTO_LOAN')"
                class="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2">
                <span class="material-icons text-sm">add_circle</span>
                Add New Auto Loan
            </button>
            
'''

# Find and insert for Personal Loans action buttons (after Notes cell, before </tr>)
personal_loans_notes_found = False
auto_loans_header_found = False
auto_loans_button_found = False
auto_loans_notes_found = False

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    new_lines.append(line)
    
    # Personal Loans: Add action buttons after Notes cell
    if not personal_loans_notes_found and '{{ account.notes }}</td>' in line and i > 400 and i < 550:
        # Check if next line is </tr> and we haven't added buttons yet
        if i + 1 < len(lines) and '</tr>' in lines[i + 1]:
            new_lines.append(action_buttons)
            personal_loans_notes_found = True
            print(f"✅ Added Personal Loans action buttons after line {i+1}")
    
    # Auto Loans: Add "Add New" button before table div
    if not auto_loans_button_found and 'Auto Loans Table' in line:
        # Look ahead for the div with overflow-x-auto
        for j in range(i, min(i+20, len(lines))):
            if 'overflow-x-auto' in lines[j] and 'autoLoansCollapsed' in lines[j]:
                new_lines.insert(len(new_lines) - (j - i), add_auto_button)
                auto_loans_button_found = True
                print(f"✅ Added Auto Loans Add New button before line {j+1}")
                break
    
    # Auto Loans: Add Actions header after Notes header
    if not auto_loans_header_found and 'Notes</th>' in line and i > 600:
        # Check if next line is </tr>
        if i + 1 < len(lines) and '</tr>' in lines[i + 1]:
            new_lines.append(actions_header)
            auto_loans_header_found = True
            print(f"✅ Added Auto Loans Actions header after line {i+1}")
    
    # Auto Loans: Add action buttons after Notes cell
    if not auto_loans_notes_found and '{{ account.notes }}</td>' in line and i > 650:
        # Check if next line is </tr>
        if i + 1 < len(lines) and '</tr>' in lines[i + 1]:
            new_lines.append(action_buttons)
            auto_loans_notes_found = True
            print(f"✅ Added Auto Loans action buttons after line {i+1}")
    
    i += 1

# Write the modified content
with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("\n✅ All modifications completed successfully!")
print(f"Personal Loans buttons: {'✅' if personal_loans_notes_found else '❌'}")
print(f"Auto Loans Add button: {'✅' if auto_loans_button_found else '❌'}")
print(f"Auto Loans header: {'✅' if auto_loans_header_found else '❌'}")
print(f"Auto Loans buttons: {'✅' if auto_loans_notes_found else '❌'}")
