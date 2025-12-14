package com.example.expensetracker.config;

import com.example.expensetracker.service.debt.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CreditLimitFixRunner implements ApplicationRunner {

    private final AccountService accountService;

    @Override
    public void run(ApplicationArguments args) {
        // Ensure any credit cards without limits get the default
        accountService.ensureDefaultCreditLimits(1000.0);
    }
}
