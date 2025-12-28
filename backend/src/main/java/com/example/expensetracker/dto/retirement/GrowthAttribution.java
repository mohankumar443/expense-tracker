package com.example.expensetracker.dto.retirement;

public class GrowthAttribution {
    private String topGrowthDriver;
    private String weakestContributor;
    private Double marketGrowthPercent;
    private Double contributionPercent;

    public GrowthAttribution() {
    }

    public GrowthAttribution(String topGrowthDriver, String weakestContributor,
            Double marketGrowthPercent, Double contributionPercent) {
        this.topGrowthDriver = topGrowthDriver;
        this.weakestContributor = weakestContributor;
        this.marketGrowthPercent = marketGrowthPercent;
        this.contributionPercent = contributionPercent;
    }

    public String getTopGrowthDriver() {
        return topGrowthDriver;
    }

    public void setTopGrowthDriver(String topGrowthDriver) {
        this.topGrowthDriver = topGrowthDriver;
    }

    public String getWeakestContributor() {
        return weakestContributor;
    }

    public void setWeakestContributor(String weakestContributor) {
        this.weakestContributor = weakestContributor;
    }

    public Double getMarketGrowthPercent() {
        return marketGrowthPercent;
    }

    public void setMarketGrowthPercent(Double marketGrowthPercent) {
        this.marketGrowthPercent = marketGrowthPercent;
    }

    public Double getContributionPercent() {
        return contributionPercent;
    }

    public void setContributionPercent(Double contributionPercent) {
        this.contributionPercent = contributionPercent;
    }
}
