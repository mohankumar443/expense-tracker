package com.example.expensetracker.service;

import com.example.expensetracker.model.DebtAccount;
import com.example.expensetracker.model.AccountType;
import com.example.expensetracker.repository.DebtAccountRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;

@Component
public class DebtDataLoader implements CommandLineRunner {

    @Autowired
    private DebtAccountRepository debtAccountRepository;

    @Override
    public void run(String... args) throws Exception {
        // Only load if database is empty
        if (debtAccountRepository.count() > 0) {
            System.out.println("Debt accounts already exist, skipping data load");
            return;
        }

        System.out.println("Loading initial debt data from debt-snapshot-2025-09.json...");

        ObjectMapper mapper = new ObjectMapper();
        InputStream inputStream = new ClassPathResource("debt-snapshot-2025-09.json").getInputStream();
        JsonNode root = mapper.readTree(inputStream);

        // Load Credit Cards
        JsonNode creditCards = root.get("creditCards").get("accounts");
        for (JsonNode card : creditCards) {
            DebtAccount account = new DebtAccount();
            account.setName(card.get("name").asText());
            account.setAccountType(AccountType.CREDIT_CARD);
            account.setCurrentBalance(card.get("balance").asDouble());
            account.setApr(card.get("apr").asDouble());
            account.setNotes(card.get("notes").asText());
            
            if (card.has("promoExpires")) {
                account.setPromoExpirationDate(LocalDate.parse(card.get("promoExpires").asText()));
            }
            
            debtAccountRepository.save(account);
        }

        // Load Personal Loans
        JsonNode personalLoans = root.get("personalLoans").get("accounts");
        for (JsonNode loan : personalLoans) {
            DebtAccount account = new DebtAccount();
            account.setName(loan.get("name").asText());
            account.setAccountType(AccountType.PERSONAL_LOAN);
            account.setCurrentBalance(loan.get("balance").asDouble());
            account.setApr(loan.get("apr").asDouble());
            account.setNotes(loan.get("notes").asText());
            
            if (loan.has("monthlyPayment")) {
                account.setMonthlyPayment(loan.get("monthlyPayment").asDouble());
            }
            
            debtAccountRepository.save(account);
        }

        // Load Auto Loan
        JsonNode autoLoan = root.get("autoLoan").get("accounts").get(0);
        DebtAccount account = new DebtAccount();
        account.setName(autoLoan.get("name").asText());
        account.setAccountType(AccountType.AUTO_LOAN);
        account.setCurrentBalance(autoLoan.get("balance").asDouble());
        account.setApr(autoLoan.get("apr").asDouble());
        account.setMonthlyPayment(autoLoan.get("monthlyPayment").asDouble());
        account.setNotes(autoLoan.get("notes").asText());
        debtAccountRepository.save(account);

        System.out.println("Successfully loaded " + debtAccountRepository.count() + " debt accounts");
    }
}
