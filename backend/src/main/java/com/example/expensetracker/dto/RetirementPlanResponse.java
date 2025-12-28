package com.example.expensetracker.dto;

import com.example.expensetracker.dto.retirement.AccountScorecard;
import com.example.expensetracker.dto.retirement.GrowthAttribution;
import com.example.expensetracker.dto.retirement.YTDSummary;
import java.util.List;

public class RetirementPlanResponse {
    private Double currentTargetBalance;
    private Double actualBalance;
    private Double differenceAmount;
    private Double differencePercent;
    private String status;
    private Integer remainingMonths;
    private Double requiredMonthlyContribution;
    private String commentary;
    private Double bonusAdditions;
    private Double bufferMonths;

    // New account-level fields
    private List<AccountScorecard> accountScorecard;
    private GrowthAttribution growthAttribution;
    private YTDSummary ytdSummary;

    public RetirementPlanResponse() {
    }

    public Double getCurrentTargetBalance() {
        return currentTargetBalance;
    }

    public void setCurrentTargetBalance(Double currentTargetBalance) {
        this.currentTargetBalance = currentTargetBalance;
    }

    public Double getActualBalance() {
        return actualBalance;
    }

    public void setActualBalance(Double actualBalance) {
        this.actualBalance = actualBalance;
    }

    public Double getDifferenceAmount() {
        return differenceAmount;
    }

    public void setDifferenceAmount(Double differenceAmount) {
        this.differenceAmount = differenceAmount;
    }

    public Double getDifferencePercent() {
        return differencePercent;
    }

    public void setDifferencePercent(Double differencePercent) {
        this.differencePercent = differencePercent;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getRemainingMonths() {
        return remainingMonths;
    }

    public void setRemainingMonths(Integer remainingMonths) {
        this.remainingMonths = remainingMonths;
    }

    public Double getRequiredMonthlyContribution() {
        return requiredMonthlyContribution;
    }

    public void setRequiredMonthlyContribution(Double requiredMonthlyContribution) {
        this.requiredMonthlyContribution = requiredMonthlyContribution;
    }

    public String getCommentary() {
        return commentary;
    }

    public void setCommentary(String commentary) {
        this.commentary = commentary;
    }

    public Double getBonusAdditions() {
        return bonusAdditions;
    }

    public void setBonusAdditions(Double bonusAdditions) {
        this.bonusAdditions = bonusAdditions;
    }

    public Double getBufferMonths() {
        return bufferMonths;
    }

    public void setBufferMonths(Double bufferMonths) {
        this.bufferMonths = bufferMonths;
    }

    public List<AccountScorecard> getAccountScorecard() {
        return accountScorecard;
    }

    public void setAccountScorecard(List<AccountScorecard> accountScorecard) {
        this.accountScorecard = accountScorecard;
    }

    public GrowthAttribution getGrowthAttribution() {
        return growthAttribution;
    }

    public void setGrowthAttribution(GrowthAttribution growthAttribution) {
        this.growthAttribution = growthAttribution;
    }

    public YTDSummary getYtdSummary() {
        return ytdSummary;
    }

    public void setYtdSummary(YTDSummary ytdSummary) {
        this.ytdSummary = ytdSummary;
    }
}
