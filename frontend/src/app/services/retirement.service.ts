import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AccountBalanceDTO {
    accountType: string;
    balance: number;
    contribution: number;
}

export interface AccountScorecard {
    accountType: string;
    balance: number;
    ytdContributions: number;
    ytdGrowthDollars: number;
    ytdGrowthPercent: number;
    status: string;
}

export interface GrowthAttribution {
    topGrowthDriver: string;
    weakestContributor: string;
    marketGrowthPercent: number;
    contributionPercent: number;
}

export interface YTDSummary {
    totalYTDContributions: number;
    totalYTDGrowth: number;
    ytdGrowthPercent: number;
}

export interface RetirementPlanRequest {
    currentAge?: number;
    monthYear?: string;
    currentTotalInvestedBalance?: number;
    targetPortfolioValue?: number;
    actualMonthlyContribution?: number;
    oneTimeAdditions?: number;
    afterTaxMode?: 'flat' | 'bucketed' | 'custom';
    flatTaxRate?: number;
    taxFreeRate?: number;
    taxDeferredRate?: number;
    taxableRate?: number;
    persistSnapshot?: boolean;
    accounts?: AccountBalanceDTO[];
}

export interface RetirementPlanResponse {
    currentTargetBalance?: number;
    actualBalance?: number;
    differenceAmount?: number;
    differencePercent?: number;
    status?: string;
    remainingMonths?: number;
    requiredMonthlyContribution?: number;
    commentary?: string;
    bonusAdditions?: number;
    bufferMonths?: number;
    accountScorecard?: AccountScorecard[];
    growthAttribution?: GrowthAttribution;
    ytdSummary?: YTDSummary;
}

@Injectable({
    providedIn: 'root'
})
export class RetirementService {
    private apiUrl = 'http://localhost:8080/api/retirement';

    constructor(private http: HttpClient) { }

    evaluatePlan(request: RetirementPlanRequest): Observable<RetirementPlanResponse> {
        return this.http.post<RetirementPlanResponse>(`${this.apiUrl}/plan`, request);
    }

    getLatestSnapshot(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/snapshots/latest`);
    }

    getSnapshotsByYear(year: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/snapshots/${year}`);
    }
}
