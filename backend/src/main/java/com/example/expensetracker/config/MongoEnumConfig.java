package com.example.expensetracker.config;

import com.example.expensetracker.model.AccountType;
import com.example.expensetracker.model.debt.Account;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

@Configuration
public class MongoEnumConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(
            new DebtAccountTypeReadingConverter(),
            new LegacyAccountTypeReadingConverter()
        ));
    }

    @ReadingConverter
    static class DebtAccountTypeReadingConverter implements Converter<String, Account.AccountType> {
        @Override
        public Account.AccountType convert(String source) {
            try {
                return Account.AccountType.valueOf(source);
            } catch (Exception ex) {
                return Account.AccountType.UNKNOWN;
            }
        }
    }

    @ReadingConverter
    static class LegacyAccountTypeReadingConverter implements Converter<String, AccountType> {
        @Override
        public AccountType convert(String source) {
            try {
                return AccountType.valueOf(source);
            } catch (Exception ex) {
                return AccountType.UNKNOWN;
            }
        }
    }
}
