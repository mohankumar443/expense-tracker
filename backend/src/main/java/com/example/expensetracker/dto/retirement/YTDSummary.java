package com.example.expensetracker.dto.retirement;

public class YTDSummary {
    private Double totalYTDContributions;
    private Double totalYTDGrowth;
    private Double ytdGrowthPercent;

    public YTDSummary() {
    }

    public YTDSummary(Double totalYTDContributions, Double totalYTDGrowth, Double ytdGrowthPercent) {
        this.totalYTDContributions = totalYTDContributions;
        this.totalYTDGrowth = totalYTDGrowth;
        this.ytdGrowthPercent = ytdGrowthPercent;
    }

    public Double getTotalYTDContributions() {
        return totalYTDContributions;
    }

    public void setTotalYTDContributions(Double totalYTDContributions) {
        this.totalYTDContributions = totalYTDContributions;
    }

    public Double getTotalYTDGrowth() {
        return totalYTDGrowth;
    }

    public void setTotalYTDGrowth(Double totalYTDGrowth) {
        this.totalYTDGrowth = totalYTDGrowth;
    }

    public Double getYtdGrowthPercent() {
        return ytdGrowthPercent;
    }

    public void setYtdGrowthPercent(Double ytdGrowthPercent) {
        this.ytdGrowthPercent = ytdGrowthPercent;
    }
}
