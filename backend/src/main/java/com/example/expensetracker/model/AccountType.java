package com.example.expensetracker.model;

import com.fasterxml.jackson.annotation.JsonEnumDefaultValue;

public enum AccountType {
    @JsonEnumDefaultValue
    UNKNOWN,
    CREDIT_CARD,
    PERSONAL_LOAN,
    AUTO_LOAN
}
