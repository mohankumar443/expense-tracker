package com.example.expensetracker.service;

import com.example.expensetracker.dto.RetirementPlanRequest;
import com.example.expensetracker.dto.RetirementPlanResponse;
import com.example.expensetracker.dto.retirement.AccountBalanceDTO;
import com.example.expensetracker.dto.retirement.AccountScorecard;
import com.example.expensetracker.dto.retirement.GrowthAttribution;
import com.example.expensetracker.dto.retirement.YTDSummary;
import com.example.expensetracker.model.retirement.AccountBalance;
import com.example.expensetracker.model.retirement.RetirementSnapshot;
import com.example.expensetracker.repository.retirement.RetirementSnapshotRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RetirementPlanningService {
    private static final double START_AGE = 33.0;
    private static final double TARGET_RETIREMENT_AGE = 50.0;
    private static final double STARTING_BALANCE = 94000.0;
    private static final double BASE_MONTHLY_CONTRIBUTION = 2600.0;
    private static final double TARGET_PORTFOLIO_VALUE = 1_270_000.0;
    private static final double ANNUAL_RETURN = 0.07;
    private static final double MONTHLY_RATE = ANNUAL_RETURN / 12.0;

    private final RetirementSnapshotRepository snapshotRepository;

    public RetirementPlanningService(RetirementSnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    public RetirementPlanResponse evaluatePlan(RetirementPlanRequest request) {
        double currentAge = request.getCurrentAge() != null ? request.getCurrentAge() : START_AGE;
        int monthsElapsed = Math.max(0, (int) Math.round((currentAge - START_AGE) * 12.0));
        int remainingMonths = Math.max(0, (int) Math.round((TARGET_RETIREMENT_AGE - currentAge) * 12.0));

        // Calculate total balance from accounts if provided, otherwise use legacy field
        double actualBalance = calculateTotalBalance(request);

        double targetBalance = calculateTargetBalance(monthsElapsed);
        double differenceAmount = actualBalance - targetBalance;
        double differencePercent = targetBalance == 0 ? 0.0 : (differenceAmount / targetBalance) * 100.0;

        String status = classifyStatus(differenceAmount, targetBalance);
        Double requiredMonthlyContribution = null;
        if ("Slightly Behind".equals(status) || "Behind".equals(status)) {
            if (remainingMonths > 0) {
                Double targetValue = request.getTargetPortfolioValue() != null ? request.getTargetPortfolioValue()
                        : TARGET_PORTFOLIO_VALUE;
                double required = calculateRequiredMonthlyContribution(actualBalance, remainingMonths, targetValue);
                requiredMonthlyContribution = roundCurrency(Math.max(BASE_MONTHLY_CONTRIBUTION, required));
            }
        }

        RetirementPlanResponse response = new RetirementPlanResponse();
        response.setCurrentTargetBalance(roundCurrency(targetBalance));
        response.setActualBalance(roundCurrency(actualBalance));
        response.setDifferenceAmount(roundCurrency(differenceAmount));
        response.setDifferencePercent(roundPercent(differencePercent));
        response.setStatus(status);
        response.setRemainingMonths(remainingMonths);
        response.setRequiredMonthlyContribution(requiredMonthlyContribution);

        double bonusAdditions = calculateBonusAdditions(request.getActualMonthlyContribution(),
                request.getOneTimeAdditions());
        if (bonusAdditions > 0) {
            response.setBonusAdditions(roundCurrency(bonusAdditions));
        }

        if ("Ahead".equals(status)) {
            response.setBufferMonths(roundPercent(differenceAmount / BASE_MONTHLY_CONTRIBUTION));
        }

        // Account-level analysis if accounts are provided
        if (request.getAccounts() != null && !request.getAccounts().isEmpty()) {
            processAccountLevelAnalysis(request, response);
            boolean persist = request.getPersistSnapshot() == null ? true : request.getPersistSnapshot();
            if (persist) {
                saveSnapshot(request);
            }
        }

        response.setCommentary(buildCommentary(status, requiredMonthlyContribution, remainingMonths, bonusAdditions,
                differenceAmount, response.getGrowthAttribution()));
        return response;
    }

    private void processAccountLevelAnalysis(RetirementPlanRequest request, RetirementPlanResponse response) {
        LocalDate snapshotDate = parseSnapshotDate(request.getMonthYear());
        LocalDate yearStart = LocalDate.of(snapshotDate.getYear(), 1, 1);

        // Get YTD snapshots
        List<RetirementSnapshot> ytdSnapshots = snapshotRepository.findByYear(yearStart, snapshotDate.plusDays(1));
        ytdSnapshots.sort(Comparator.comparing(RetirementSnapshot::getSnapshotDate));

        // Get previous snapshot for growth calculation
        Optional<RetirementSnapshot> previousSnapshotOpt = snapshotRepository.findTopByOrderBySnapshotDateDesc();

        List<AccountScorecard> scorecards = new ArrayList<>();
        Map<String, Double> accountGrowthMap = new HashMap<>();
        double totalYTDContributions = 0.0;
        double totalYTDGrowth = 0.0;
        double totalPreviousBalance = 0.0;

        for (AccountBalanceDTO accountDTO : request.getAccounts()) {
            // Find previous balance for this account
            double previousBalance = findPreviousBalance(previousSnapshotOpt, accountDTO.getAccountType());

            // Calculate market growth for the latest month
            double marketGrowth = accountDTO.getBalance() - previousBalance - accountDTO.getContribution();

            // Calculate YTD metrics
            double ytdContributions = calculateYTDContributions(ytdSnapshots, accountDTO.getAccountType());
            double ytdStartBalance = findYearStartBalance(ytdSnapshots, accountDTO.getAccountType(), previousBalance);
            double ytdGrowth = accountDTO.getBalance() - ytdStartBalance - (ytdContributions + accountDTO.getContribution());
            double ytdGrowthPercent = ytdStartBalance > 0 ? (ytdGrowth / ytdStartBalance) * 100.0 : 0.0;

            totalYTDContributions += ytdContributions;
            totalYTDGrowth += ytdGrowth;
            totalPreviousBalance += previousBalance;

            accountGrowthMap.put(accountDTO.getAccountType(), marketGrowth);

            AccountScorecard scorecard = new AccountScorecard();
            scorecard.setAccountType(accountDTO.getAccountType());
            scorecard.setGoalType(accountDTO.getGoalType() != null ? accountDTO.getGoalType() : "RETIREMENT");
            scorecard.setBalance(roundCurrency(accountDTO.getBalance()));
            scorecard.setYtdContributions(roundCurrency(ytdContributions + accountDTO.getContribution()));
            scorecard.setYtdGrowthDollars(roundCurrency(ytdGrowth));
            scorecard.setYtdGrowthPercent(roundPercent(ytdGrowthPercent));
            if ((accountDTO.getBalance() == null || accountDTO.getBalance() <= 0)
                    && (ytdContributions + accountDTO.getContribution()) <= 0) {
                scorecard.setStatus("Behind");
            } else {
                scorecard.setStatus("On Plan"); // Will be updated below
            }

            scorecards.add(scorecard);
        }

        // Calculate portfolio average growth for status classification
        double portfolioAvgGrowth = totalPreviousBalance > 0 ? (totalYTDGrowth / totalPreviousBalance) * 100.0 : 0.0;

        // Classify account status
        for (AccountScorecard scorecard : scorecards) {
            if (!"Behind".equals(scorecard.getStatus())) {
                scorecard.setStatus(classifyAccountStatus(scorecard.getYtdGrowthPercent(), portfolioAvgGrowth));
            }
        }

        // Growth attribution
        GrowthAttribution attribution = calculateGrowthAttribution(accountGrowthMap, totalYTDContributions,
                totalYTDGrowth);

        // YTD summary
        YTDSummary ytdSummary = new YTDSummary();
        ytdSummary.setTotalYTDContributions(roundCurrency(totalYTDContributions));
        ytdSummary.setTotalYTDGrowth(roundCurrency(totalYTDGrowth));
        ytdSummary.setYtdGrowthPercent(roundPercent(portfolioAvgGrowth));

        response.setAccountScorecard(scorecards);
        response.setGrowthAttribution(attribution);
        response.setYtdSummary(ytdSummary);
    }

    private double findPreviousBalance(Optional<RetirementSnapshot> previousSnapshotOpt, String accountType) {
        if (previousSnapshotOpt.isEmpty()) {
            return 0.0;
        }

        RetirementSnapshot previousSnapshot = previousSnapshotOpt.get();
        if (previousSnapshot.getAccounts() == null) {
            return 0.0;
        }

        return previousSnapshot.getAccounts().stream()
                .filter(acc -> acc.getAccountType().equals(accountType))
                .findFirst()
                .map(AccountBalance::getBalance)
                .orElse(0.0);
    }

    private double calculateYTDContributions(List<RetirementSnapshot> ytdSnapshots, String accountType) {
        return ytdSnapshots.stream()
                .flatMap(snapshot -> snapshot.getAccounts().stream())
                .filter(acc -> acc.getAccountType().equals(accountType))
                .mapToDouble(acc -> acc.getContribution() != null ? acc.getContribution() : 0.0)
                .sum();
    }

    private double calculateYTDGrowth(List<RetirementSnapshot> ytdSnapshots, String accountType,
            double startingBalance) {
        if (ytdSnapshots.isEmpty()) {
            return 0.0;
        }

        double totalContributions = calculateYTDContributions(ytdSnapshots, accountType);
        double currentBalance = ytdSnapshots.get(ytdSnapshots.size() - 1).getAccounts().stream()
                .filter(acc -> acc.getAccountType().equals(accountType))
                .findFirst()
                .map(AccountBalance::getBalance)
                .orElse(0.0);

        return currentBalance - startingBalance - totalContributions;
    }

    private double findYearStartBalance(List<RetirementSnapshot> ytdSnapshots, String accountType,
            double fallbackBalance) {
        if (ytdSnapshots.isEmpty()) {
            return fallbackBalance;
        }

        for (RetirementSnapshot snapshot : ytdSnapshots) {
            if (snapshot.getAccounts() == null) {
                continue;
            }
            Optional<AccountBalance> match = snapshot.getAccounts().stream()
                    .filter(acc -> acc.getAccountType().equals(accountType))
                    .findFirst();
            if (match.isPresent()) {
                Double balance = match.get().getBalance();
                if (balance != null) {
                    return balance;
                }
            }
        }
        return fallbackBalance;
    }

    private String classifyAccountStatus(double accountGrowthPercent, double portfolioAvgGrowth) {
        if (accountGrowthPercent > portfolioAvgGrowth + 2.0) {
            return "Leading";
        } else if (accountGrowthPercent < portfolioAvgGrowth - 2.0) {
            return "Behind";
        } else {
            return "On Plan";
        }
    }

    private GrowthAttribution calculateGrowthAttribution(Map<String, Double> accountGrowthMap,
            double totalContributions, double totalGrowth) {
        // Find top and weakest performers
        Map.Entry<String, Double> topEntry = accountGrowthMap.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        Map.Entry<String, Double> weakestEntry = accountGrowthMap.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .orElse(null);

        double totalPortfolioChange = totalGrowth + totalContributions;
        double marketGrowthPercent = totalPortfolioChange > 0 ? (totalGrowth / totalPortfolioChange) * 100.0 : 0.0;
        double contributionPercent = totalPortfolioChange > 0 ? (totalContributions / totalPortfolioChange) * 100.0
                : 0.0;

        GrowthAttribution attribution = new GrowthAttribution();
        attribution.setTopGrowthDriver(topEntry != null ? topEntry.getKey() : "N/A");
        attribution.setWeakestContributor(weakestEntry != null ? weakestEntry.getKey() : "N/A");
        attribution.setMarketGrowthPercent(roundPercent(marketGrowthPercent));
        attribution.setContributionPercent(roundPercent(contributionPercent));

        return attribution;
    }

    private void saveSnapshot(RetirementPlanRequest request) {
        LocalDate snapshotDate = parseSnapshotDate(request.getMonthYear());

        // Check if snapshot already exists for this date
        Optional<RetirementSnapshot> existing = snapshotRepository.findBySnapshotDate(snapshotDate);
        if (existing.isPresent()) {
            // Update existing snapshot
            RetirementSnapshot snapshot = existing.get();
            updateSnapshot(snapshot, request);
            snapshotRepository.save(snapshot);
        } else {
            // Create new snapshot
            RetirementSnapshot snapshot = new RetirementSnapshot();
            snapshot.setSnapshotDate(snapshotDate);
            updateSnapshot(snapshot, request);
            snapshotRepository.save(snapshot);
        }
    }

    private void updateSnapshot(RetirementSnapshot snapshot, RetirementPlanRequest request) {
        snapshot.setCurrentAge(request.getCurrentAge());
        snapshot.setOneTimeAdditions(request.getOneTimeAdditions());

        List<AccountBalance> accounts = request.getAccounts().stream()
                .map(dto -> {
                    AccountBalance acc = new AccountBalance();
                    acc.setAccountType(dto.getAccountType());
                    acc.setGoalType(dto.getGoalType() != null ? dto.getGoalType() : "RETIREMENT");
                    acc.setBalance(dto.getBalance());
                    acc.setContribution(dto.getContribution());
                    return acc;
                })
                .collect(Collectors.toList());

        snapshot.setAccounts(accounts);
        snapshot.setTotalBalance(calculateTotalBalance(request));
        snapshot.setTotalContributions(request.getAccounts().stream()
                .mapToDouble(AccountBalanceDTO::getContribution)
                .sum());
        snapshot.setTargetPortfolioValue(request.getTargetPortfolioValue()); // Save target value
        snapshot.setAfterTaxMode(request.getAfterTaxMode());
        snapshot.setFlatTaxRate(request.getFlatTaxRate());
        snapshot.setTaxFreeRate(request.getTaxFreeRate());
        snapshot.setTaxDeferredRate(request.getTaxDeferredRate());
        snapshot.setTaxableRate(request.getTaxableRate());
    }

    private LocalDate parseSnapshotDate(String monthYear) {
        if (monthYear == null || monthYear.isEmpty()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(monthYear + "-01", DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private double calculateTotalBalance(RetirementPlanRequest request) {
        if (request.getAccounts() != null && !request.getAccounts().isEmpty()) {
            return request.getAccounts().stream()
                    .filter(acc -> !"EDUCATION".equalsIgnoreCase(acc.getGoalType())) // Exclude EDUCATION from
                                                                                     // retirement total
                    .mapToDouble(AccountBalanceDTO::getBalance)
                    .sum();
        }
        return request.getCurrentTotalInvestedBalance() != null ? request.getCurrentTotalInvestedBalance() : 0.0;
    }

    private double calculateTargetBalance(int monthsElapsed) {
        if (monthsElapsed <= 0) {
            return STARTING_BALANCE;
        }
        if (MONTHLY_RATE == 0.0) {
            return STARTING_BALANCE + (BASE_MONTHLY_CONTRIBUTION * monthsElapsed);
        }
        double growthFactor = Math.pow(1 + MONTHLY_RATE, monthsElapsed);
        double contributionGrowth = (growthFactor - 1) / MONTHLY_RATE;
        return (STARTING_BALANCE * growthFactor) + (BASE_MONTHLY_CONTRIBUTION * contributionGrowth);
    }

    private double calculateRequiredMonthlyContribution(double actualBalance, int remainingMonths, double targetValue) {
        if (remainingMonths <= 0) {
            return BASE_MONTHLY_CONTRIBUTION;
        }
        if (MONTHLY_RATE == 0.0) {
            return (targetValue - actualBalance) / remainingMonths;
        }
        double growthFactor = Math.pow(1 + MONTHLY_RATE, remainingMonths);
        double numerator = (targetValue - (actualBalance * growthFactor)) * MONTHLY_RATE;
        double denominator = growthFactor - 1;
        return denominator == 0.0 ? BASE_MONTHLY_CONTRIBUTION : numerator / denominator;
    }

    private double calculateBonusAdditions(Double actualMonthlyContribution, Double oneTimeAdditions) {
        double bonus = 0.0;
        if (actualMonthlyContribution != null && actualMonthlyContribution > BASE_MONTHLY_CONTRIBUTION) {
            bonus += (actualMonthlyContribution - BASE_MONTHLY_CONTRIBUTION);
        }
        if (oneTimeAdditions != null && oneTimeAdditions > 0) {
            bonus += oneTimeAdditions;
        }
        return bonus;
    }

    private String classifyStatus(double differenceAmount, double targetBalance) {
        if (differenceAmount >= 0) {
            return "Ahead";
        }
        double onTrackThreshold = -0.05 * targetBalance;
        double slightlyBehindThreshold = -0.10 * targetBalance;
        if (differenceAmount >= onTrackThreshold) {
            return "On Track";
        }
        if (differenceAmount >= slightlyBehindThreshold) {
            return "Slightly Behind";
        }
        return "Behind";
    }

    private String buildCommentary(String status, Double requiredMonthlyContribution, int remainingMonths,
            double bonusAdditions, double differenceAmount, GrowthAttribution attribution) {
        StringBuilder commentary = new StringBuilder();

        if ("Ahead".equals(status)) {
            commentary.append("Ahead of the target path. Keep the $2,600 base; the buffer is about ")
                    .append(roundPercent(differenceAmount / BASE_MONTHLY_CONTRIBUTION))
                    .append(" months of contributions.");
        } else if ("On Track".equals(status)) {
            commentary.append("Tracking within 5% of target. Keep the $2,600 base plan steady.");
        } else if ("Slightly Behind".equals(status)) {
            if (requiredMonthlyContribution != null) {
                commentary.append("A modest catch-up would help; consider about $")
                        .append(requiredMonthlyContribution)
                        .append("/mo while keeping the $2,600 base.");
            } else {
                commentary.append("A modest catch-up would help; keep the $2,600 base and review next month.");
            }
        } else {
            if (remainingMonths > 0 && requiredMonthlyContribution != null) {
                commentary.append("To close the gap, aim for about $")
                        .append(requiredMonthlyContribution)
                        .append("/mo or consider a slightly later retirement age; keep the $2,600 base.");
            } else {
                commentary.append(
                        "At the target age already; consider a later retirement age while keeping the $2,600 base.");
            }
        }

        if (bonusAdditions > 0) {
            commentary.append(" Bonus additions this month: $").append(roundCurrency(bonusAdditions)).append(".");
        }

        if (attribution != null) {
            commentary.append(" Top performer: ").append(attribution.getTopGrowthDriver()).append(".");
        }

        return commentary.toString();
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double roundPercent(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
