package com.example.expensetracker.service;

import com.example.expensetracker.model.DebtAccount;
import com.example.expensetracker.model.AccountType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class SnapshotLoaderService {

    public List<DebtAccount> loadSnapshotFromFile(String fileName) throws Exception {
        List<DebtAccount> accounts = new ArrayList<>();
        
        ObjectMapper mapper = new ObjectMapper();
        InputStream inputStream = new ClassPathResource(fileName).getInputStream();
        JsonNode root = mapper.readTree(inputStream);

        // Load Credit Cards
        JsonNode creditCards = root.get("creditCards").get("accounts");
        for (JsonNode card : creditCards) {
            DebtAccount account = new DebtAccount();
            account.setName(card.get("name").asText());
            account.setAccountType(AccountType.CREDIT_CARD);
            account.setAccountType(AccountType.CREDIT_CARD);
            account.setCurrentBalance(card.get("balance").asDouble());
            account.setApr(card.get("apr").asDouble());
            account.setNotes(card.get("notes").asText());
            
            if (card.has("monthlyPayment")) {
                account.setMonthlyPayment(card.get("monthlyPayment").asDouble());
            }
            
            if (card.has("promoExpires")) {
                account.setPromoExpirationDate(LocalDate.parse(card.get("promoExpires").asText()));
            }
            
            accounts.add(account);
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
            
            accounts.add(account);
        }

        // Load Auto Loan
        if (root.has("autoLoan") && root.get("autoLoan").has("accounts")) {
            JsonNode autoLoan = root.get("autoLoan").get("accounts").get(0);
            DebtAccount account = new DebtAccount();
            account.setName(autoLoan.get("name").asText());
            account.setAccountType(AccountType.AUTO_LOAN);
            account.setCurrentBalance(autoLoan.get("balance").asDouble());
            account.setApr(autoLoan.get("apr").asDouble());
            account.setMonthlyPayment(autoLoan.get("monthlyPayment").asDouble());
            account.setNotes(autoLoan.get("notes").asText());
            accounts.add(account);
        }

        return accounts;
    }
    
    public String getSnapshotDate(String fileName) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        InputStream inputStream = new ClassPathResource(fileName).getInputStream();
        JsonNode root = mapper.readTree(inputStream);
        return root.get("snapshotDate").asText();
    }
}
