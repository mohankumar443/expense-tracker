import { Injectable, computed, signal, effect, Injector } from '@angular/core';
import { RetirementService, RetirementPlanRequest, RetirementPlanResponse } from './retirement.service';
import { ToastService } from './toast.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, filter, tap } from 'rxjs/operators';

export interface RetirementAccount {
    accountType: string;
    goalType: string;
    balance: number;
    contribution: number;
}

export interface RetirementState {
    accounts: RetirementAccount[];
    currentAge: number;
    targetRetirementAge: number;
    targetPortfolioValue: number;
    monthYear: string;
    oneTimeAdditions: number;
    afterTaxMode: 'flat' | 'bucketed' | 'custom';
    flatTaxRate: number;
    customTaxRates: { taxFree: number; taxDeferred: number; taxable: number };
    response: RetirementPlanResponse | null;
    previousSnapshot: any | null;
    loading: boolean;
    error: string | null;
    lastSnapshotDate: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class RetirementStateService {
    // Initial State Defaults
    private readonly initialState: RetirementState = {
        accounts: [
            { accountType: '401k', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
            { accountType: 'Roth IRA', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
            { accountType: 'HSA', goalType: 'RETIREMENT', balance: 0, contribution: 0 },
            { accountType: 'Brokerage', goalType: 'RETIREMENT', balance: 0, contribution: 0 }
        ],
        currentAge: 33,
        targetRetirementAge: 50,
        targetPortfolioValue: 1270000,
        monthYear: '',
        oneTimeAdditions: 0,
        afterTaxMode: 'bucketed',
        flatTaxRate: 20,
        customTaxRates: { taxFree: 0, taxDeferred: 22, taxable: 15 },
        response: null,
        previousSnapshot: null,
        loading: false,
        error: null,
        lastSnapshotDate: null
    };

    // Signals
    readonly accounts = signal<RetirementAccount[]>(this.initialState.accounts);
    readonly currentAge = signal<number>(this.initialState.currentAge);
    readonly targetRetirementAge = signal<number>(this.initialState.targetRetirementAge);
    readonly targetPortfolioValue = signal<number>(this.initialState.targetPortfolioValue);

    // Monte Carlo State
    readonly monteCarloResults = signal<{ p10: number[], p50: number[], p90: number[], probabilitySuccess: number } | null>(null);
    readonly simulationEnabled = signal<boolean>(true);

    readonly response = signal<RetirementPlanResponse | null>(null);
    readonly previousSnapshot = signal<any | null>(null);
    readonly loading = signal<boolean>(false);
    readonly error = signal<string | null>(null);
    readonly lastSnapshotDate = signal<string | null>(null);

    // Safeguards
    readonly isInitialLoadComplete = signal<boolean>(false);
    readonly isSaving = signal<boolean>(false);

    // Additional Inputs
    readonly monthYear = signal<string>('');
    readonly oneTimeAdditions = signal<number>(0);
    readonly afterTaxMode = signal<'flat' | 'bucketed' | 'custom'>('bucketed');
    readonly flatTaxRate = signal<number>(20);
    readonly customTaxRates = signal<{ taxFree: number; taxDeferred: number; taxable: number }>({ taxFree: 0, taxDeferred: 22, taxable: 15 });

    // Playground Signals (Transient State)
    readonly playgroundContribution = signal<number | null>(null);
    readonly playgroundRetirementAge = signal<number | null>(null);
    readonly isPlaygroundActive = computed(() =>
        this.playgroundContribution() !== null || this.playgroundRetirementAge() !== null
    );


    // Computed Signals (Derived State)
    readonly totalBalance = computed(() => this.accounts().reduce((sum, acc) => sum + (acc.balance || 0), 0));
    readonly totalContributions = computed(() => this.accounts().reduce((sum, acc) => sum + (acc.contribution || 0), 0));

    readonly totalRetirementBalance = computed(() =>
        this.accounts()
            .filter(acc => acc.goalType === 'RETIREMENT')
            .reduce((sum, acc) => sum + (acc.balance || 0), 0)
    );

    readonly totalProjectedBalance = computed(() => {
        // Use playground values if active, else defaults
        const contrib = this.playgroundContribution() !== null
            ? this.playgroundContribution()!
            : this.totalContributions();

        const months = this.response()?.remainingMonths || 0;

        // Recalc months if age changes in playground
        let projectedMonths = months;
        if (this.playgroundRetirementAge() !== null) {
            const ageDiff = this.playgroundRetirementAge()! - this.currentAge();
            projectedMonths = ageDiff * 12;
            // Basic safety
            if (projectedMonths < 0) projectedMonths = 0;
        }

        return this.calculateProjectedBalance(
            this.response()?.actualBalance || 0,
            projectedMonths,
            contrib,
            0.07 / 12 // 7% annual default
        );
    });

    readonly gapToTarget = computed(() => {
        const resp = this.response();
        return resp ? resp.differenceAmount || 0 : 0;
    });

    readonly projectedShortfall = computed(() => {
        return this.totalProjectedBalance() - this.targetPortfolioValue();
    });

    // Consolidated Status (Computed)
    readonly consolidatedStatus = computed(() => {
        const resp = this.response();
        if (!resp) return { status: 'Unknown', isAtRisk: false, requiredMonthly: 0 };

        let status = resp.status || 'Unknown';

        // Calculate scientifically correct required contribution in frontend
        const months = resp.remainingMonths || 0;
        const targetValue = this.targetPortfolioValue();
        const currentBalance = this.totalBalance();
        const monthlyRate = 0.07 / 12;

        let requiredMonthly = 0;
        if (months > 0) {
            const growthFactor = Math.pow(1 + monthlyRate, months);
            const numerator = (targetValue - (currentBalance * growthFactor)) * monthlyRate;
            const denominator = growthFactor - 1;
            requiredMonthly = Math.max(0, Math.round(numerator / denominator));
        }
        let isAtRisk = false;

        const proj = this.totalProjectedBalance();
        const target = this.targetPortfolioValue();

        // Check At Risk condition
        // Buffer of $100
        if (proj < (target - 100) && (status === 'Ahead' || status === 'On Track')) {
            status = 'At Risk';
            isAtRisk = true;

            // Recalculate required PMT
            const currentBalance = resp.actualBalance || 0;
            const months = resp.remainingMonths || 1;
            const r = 0.07 / 12;

            const growthFactor = Math.pow(1 + r, months);
            const fvCurrent = currentBalance * growthFactor;
            const shortfall = target - fvCurrent;
            const denom = (Math.pow(1 + r, months) - 1);

            if (denom !== 0) {
                requiredMonthly = Math.round((shortfall * r) / denom);
            } else {
                requiredMonthly = Math.round(shortfall / months);
            }
        } else if (status === 'At Risk') {
            isAtRisk = true;
        }

        return { status, isAtRisk, requiredMonthly };
    });

    readonly recommendations = computed(() => {
        const resp = this.response();
        const recs: { title: string; hint: string; impact: string; icon: string; type: 'success' | 'warning' | 'info' }[] = [];
        if (!resp) return recs;

        const currentTotalContrib = this.totalContributions();
        const age = this.currentAge();
        const targetAge = this.targetRetirementAge();

        // 1. HSA Nudge
        const hsaAcc = this.accounts().find(a => a.accountType === 'HSA');
        if (hsaAcc && hsaAcc.contribution < 350) { // Approx 4150/12
            recs.push({
                title: 'Optimize HSA Contributions',
                hint: 'HSAs are triple-tax advantaged. Consider increasing your contribution to the 2024 limit ($4,150).',
                impact: 'Could save ~$1,200/yr in taxes alone.',
                icon: 'medical_services',
                type: 'info'
            });
        }

        // 2. Savings Rate / FIRE Nudge
        const status = this.consolidatedStatus();
        if (status.isAtRisk) {
            const gap = status.requiredMonthly - currentTotalContrib;
            recs.push({
                title: 'The FIRE Shortfall',
                hint: `You are projecting a shortfall. To hit your ${targetAge} goal, you need an extra $${gap}/mo.`,
                impact: `Closing this gap increases success probability to >90%.`,
                icon: 'trending_up',
                type: 'warning'
            });
        }

        // 3. Catch-up Contributions (Age 50+)
        if (age >= 50) {
            recs.push({
                title: 'Catch-up Power',
                hint: 'As you are 50+, you qualify for catch-up contributions in your 401k and IRA.',
                impact: 'Add $7,500/yr to your 401k limit.',
                icon: 'speed',
                type: 'info'
            });
        }

        // 4. Withdrawal Strategy
        const safeWithdrawal = (this.targetPortfolioValue() * 0.04) / 12;
        if (safeWithdrawal < 4000) {
            recs.push({
                title: 'Withdrawal Guardrails',
                hint: `Your current target yields $${Math.round(safeWithdrawal)}/mo.`,
                impact: 'Ensure this covers your projected future cost of living.',
                icon: 'account_balance_wallet',
                type: 'info'
            });
        }

        return recs;
    });

    readonly financialHealthScore = computed(() => {
        // Basic mock logic or derived from response
        // In the old code it was updated manually. 
        // We can expose HealthScoreDetails here. 
        // For now returning a score.
        return 50; // default
    });

    constructor(
        private retirementService: RetirementService,
        private toastService: ToastService,
        private injector: Injector
    ) {
        // Effect to trigger API call when key inputs change
        const state$ = toObservable(computed(() => ({
            accounts: this.accounts(),
            currentAge: this.currentAge(),
            targetAge: this.targetRetirementAge(),
            targetValue: this.targetPortfolioValue(),
            monthYear: this.monthYear(),
            additions: this.oneTimeAdditions(),
            taxMode: this.afterTaxMode(),
            taxRates: this.customTaxRates(),
            isLoaded: this.isInitialLoadComplete()
        })), { injector });

        state$.pipe(
            debounceTime(500),
            filter(state => state.isLoaded && state.targetAge > state.currentAge),
            switchMap(state => {
                this.loading.set(true);
                const request = this.getRequestPayload(true); // Keep auto-save for now, but only after load
                return this.retirementService.evaluatePlan(request).pipe(
                    tap(() => this.loadPreviousForMonth(state.monthYear))
                );
            })

        ).subscribe({
            next: (data) => {
                this.response.set(data);
                this.lastSnapshotDate.set(new Date().toISOString());
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Calculation error', err);
                this.error.set('Failed to update plan.');
                this.loading.set(false);
            }
        });
    }

    // --- Actions ---

    updateAccount(index: number, updates: Partial<RetirementAccount>) {
        this.accounts.update(current => {
            const next = [...current];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    }

    setTargetAge(age: number) {
        if (age > this.currentAge()) {
            this.targetRetirementAge.set(age);
        }
    }

    setTargetValue(val: number) {
        this.targetPortfolioValue.set(val);
    }

    setMonthYear(my: string) {
        this.monthYear.set(my);
    }

    triggerManualSave() {
        this.triggerImmediateCalculation(true);
    }

    loadPreviousForMonth(monthYear: string) {
        if (!monthYear) return;
        const parts = monthYear.split('-').map(Number);
        if (parts.length < 2) return;
        const [y, m] = parts;
        const date = new Date(y, m - 1, 1);
        date.setMonth(date.getMonth() - 1); // Previous month
        const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        this.retirementService.getSnapshotByMonth(prevStr).subscribe({
            next: (data) => this.previousSnapshot.set(data),
            error: () => this.previousSnapshot.set(null)
        });
    }

    // --- Monte Carlo Simulation ---

    runSimulation(iterations: number = 250) {
        const resp = this.response();
        if (!resp) return;

        const currentBalance = resp.actualBalance || 0;
        const targetValue = this.targetPortfolioValue();
        const effectiveContrib = this.playgroundContribution() !== null
            ? this.playgroundContribution()!
            : this.totalContributions();

        const effectiveTargetAge = this.playgroundRetirementAge() !== null
            ? this.playgroundRetirementAge()!
            : this.targetRetirementAge();

        const months = (effectiveTargetAge - this.currentAge()) * 12;
        if (months <= 0) return;

        const step = months > 24 ? 12 : 1;
        const numSteps = Math.floor(months / step);

        const allPaths: number[][] = [];
        let successCount = 0;

        // Stats: 7% annual return, 15% annual volatility (rough S&P500)
        const annualReturn = 0.07;
        const annualVol = 0.15;

        // Convert to step rates
        const stepRate = annualReturn * (step / 12);
        const stepVol = annualVol * Math.sqrt(step / 12);

        for (let i = 0; i < iterations; i++) {
            let balance = currentBalance;
            const path: number[] = [balance];

            for (let s = 1; s <= numSteps; s++) {
                // Gaussian Random Walk
                const randomShock = this.gaussianRandom();
                const periodicReturn = stepRate + (stepVol * randomShock);

                balance = balance * (1 + periodicReturn) + (effectiveContrib * step);
                path.push(Math.round(balance));
            }

            allPaths.push(path);
            if (balance >= targetValue) successCount++;
        }

        // Calculate Percentiles per step
        const p10: number[] = [];
        const p50: number[] = [];
        const p90: number[] = [];

        for (let s = 0; s <= numSteps; s++) {
            const stepValues = allPaths.map(p => p[s]).sort((a, b) => a - b);
            p10.push(stepValues[Math.floor(iterations * 0.1)]);
            p50.push(stepValues[Math.floor(iterations * 0.5)]);
            p90.push(stepValues[Math.floor(iterations * 0.9)]);
        }

        this.monteCarloResults.set({
            p10, p50, p90,
            probabilitySuccess: Math.round((successCount / iterations) * 100)
        });
    }

    private gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // --- Helpers (Migrated Logic) ---

    private calculateProjectedBalance(current: number, months: number, contribution: number, monthlyRate: number): number {
        const growthFactor = Math.pow(1 + monthlyRate, months);
        let futureValue = current * growthFactor;
        if (monthlyRate > 0) {
            futureValue += contribution * ((growthFactor - 1) / monthlyRate);
        }
        return Math.round(futureValue);
    }

    // Helper to get chart data. Returns projected (active/playground) and optionally comparison (original).
    getChartDataPoints(contributionOverride?: number) {
        const resp = this.response();
        if (!resp) return { labels: [], projected: [], target: [], comparison: [] };

        const currentBalance = resp.actualBalance || 0;
        const targetValue = this.targetPortfolioValue();
        const monthlyRate = 0.07 / 12;

        // Playground or Override Logic
        const effectiveContrib = this.playgroundContribution() !== null
            ? this.playgroundContribution()!
            : (contributionOverride !== undefined ? contributionOverride : this.totalContributions());

        const effectiveTargetAge = this.playgroundRetirementAge() !== null
            ? this.playgroundRetirementAge()!
            : this.targetRetirementAge();

        const monthsToRetirement = (effectiveTargetAge - this.currentAge()) * 12;

        const labels: string[] = [];
        const projected: number[] = [];
        const targetData: number[] = [];

        const comparison: number[] = [];
        const isPlayground = effectiveContrib !== this.totalContributions() || effectiveTargetAge !== this.targetRetirementAge();

        // Helper
        const projectFn = (months: number, contrib: number) =>
            this.calculateProjectedBalance(currentBalance, months, contrib, monthlyRate);

        const step = monthsToRetirement > 24 ? 12 : 1;

        for (let i = 0; i <= monthsToRetirement; i += step) {
            // Label
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            // Project (Effective/Playground)
            projected.push(projectFn(i, effectiveContrib));

            // Comparison (Base/Original) - only if playground differs
            if (isPlayground) {
                // For comparison, we use the ORIGINAL target age path or just project until the new target age?
                // Visualizing "Current Path" usually implies "What happens if I DON'T change anything?"
                // So we use current contributions and current target age (or just project out to the same timeline).
                comparison.push(projectFn(i, this.totalContributions()));
            }

            // Target (Geometric)
            if (currentBalance > 0 && targetValue > 0) {
                const progress = currentBalance * Math.pow((targetValue / currentBalance), (i / monthsToRetirement));
                targetData.push(Math.round(progress));
            } else {
                targetData.push((targetValue / monthsToRetirement) * i);
            }
        }
        return { labels, projected, target: targetData, comparison };
    }

    // --- MoM Logic ---

    getAccountMoMChange(accountType: string): number {
        const current = this.accounts().find(a => a.accountType === accountType)?.balance || 0;
        const prevObs = this.previousSnapshot();
        const prevAcc = prevObs?.accounts?.find((a: any) => a.accountType === accountType);
        const previous = prevAcc?.balance || 0;
        return current - previous;
    }

    getAccountMoMChangePercent(accountType: string): number {
        const diff = this.getAccountMoMChange(accountType);
        const prevObs = this.previousSnapshot();
        const prevAcc = prevObs?.accounts?.find((a: any) => a.accountType === accountType);
        const previous = prevAcc?.balance || 0;

        if (previous === 0) return 0;
        return (diff / previous) * 100;
    }

    getTotalMoMChange(): number {
        const current = this.totalBalance();
        const prev = this.previousSnapshot()?.totalBalance || 0;
        return current - prev;
    }

    getTotalMoMChangePercent(): number {
        const diff = this.getTotalMoMChange();
        const prev = this.previousSnapshot()?.totalBalance || 0;
        if (prev === 0) return 0;
        return (diff / prev) * 100;
    }

    getRecoveryPlan(accountType: string) {
        // Simplified Migrated Logic using Signals state
        const scorecard = this.response()?.accountScorecard?.find((s: any) => s.accountType === accountType);
        if (!scorecard || scorecard.status === 'Leading' || scorecard.status === 'On Plan') return null;

        const result = { action: 'Boost', monthlyAmount: 0, lumpSumShortfall: 0, targetBalanceToday: 0 };
        const accBal = this.accounts().find(a => a.accountType === accountType)?.balance || 0;

        // 1. Calculate Scientifically Correct Required Contribution
        const months = this.response()?.remainingMonths || 0;
        const targetValue = this.targetPortfolioValue();
        const currentBalance = this.totalBalance();
        const monthlyRate = 0.07 / 12;

        let totalRequiredMonthly = 0;
        if (months > 0) {
            const growthFactor = Math.pow(1 + monthlyRate, months);
            const numerator = (targetValue - (currentBalance * growthFactor)) * monthlyRate;
            const denominator = growthFactor - 1;
            totalRequiredMonthly = Math.max(0, numerator / denominator);
        }

        const currentTotal = this.totalContributions();

        // 1. Monthly Fix (Boost)
        if (totalRequiredMonthly > currentTotal) {
            const totalMonthlyGap = totalRequiredMonthly - currentTotal;
            // Split gap proportionally based on current contribution share
            const totalC = Math.max(1, currentTotal);
            const accC = this.accounts().find(a => a.accountType === accountType)?.contribution || 0;

            // If account has 0 contribution, it gets 25% of the gap by default if others are also low
            const share = accC > 0 ? (accC / totalC) : (1 / this.accounts().length);
            result.monthlyAmount = Math.round(totalMonthlyGap * share);
            result.action = 'Add';
        } else {
            // Plan is theoretically solid, suggest token boost only if we want "Extra Safety"
            result.monthlyAmount = 0;
        }

        // 2. Lump Sum
        const totalGap = this.gapToTarget(); // differenceAmount (negative means behind global)

        if (totalGap < 0) {
            // Global Behind
            const deficit = Math.abs(totalGap);
            const accBal = this.accounts().find(a => a.accountType === accountType)?.balance || 0;
            const totBal = this.totalRetirementBalance();
            const share = totBal > 0 ? (accBal / totBal) : 0.25;
            result.lumpSumShortfall = Math.round(deficit * share);
        } else {
            // Global Ahead/OK, Local Behind (Perf Lag)
            const avgGrowth = this.response()?.ytdSummary?.ytdGrowthPercent || 0;
            const accGrowth = scorecard.ytdGrowthPercent || 0;
            if (accGrowth < avgGrowth) {
                const accBal = this.accounts().find(a => a.accountType === accountType)?.balance || 0;
                const diff = avgGrowth - accGrowth;
                const missed = Math.round(accBal * (diff / 100));
                result.lumpSumShortfall = missed > 0 ? missed : Math.round(accBal * 0.01);
            }
        }

        result.targetBalanceToday = accBal + result.lumpSumShortfall;

        if (result.monthlyAmount <= 0 && result.lumpSumShortfall <= 0) {
            return null;
        }

        return result;
    }
    getScorecard(accountType: string) {
        return this.response()?.accountScorecard?.find((s: any) => s.accountType === accountType);
    }

    getProjectedAccountBalance(accountType: string): number {
        const acc = this.accounts().find(a => a.accountType === accountType);
        if (!acc) return 0;

        const resp = this.response();
        const months = resp?.remainingMonths || 0;
        const monthlyRate = 0.07 / 12; // 7% fixed for now

        // Simple projection for individual account
        // Future: use specific rates if we add them to account model
        return this.calculateProjectedBalance(acc.balance || 0, months, acc.contribution || 0, monthlyRate);
    }

    // --- Loading & Persistence ---

    loadState(monthYear: string) {
        if (!monthYear) return;
        this.loading.set(true);
        this.error.set(null);

        this.retirementService.getSnapshotByMonth(monthYear).subscribe({
            next: (data) => {
                if (data && data.accounts && data.accounts.length > 0) {
                    this.applySnapshotData(data);
                    this.isInitialLoadComplete.set(true);
                    this.loading.set(false);
                    this.triggerImmediateCalculation(false);
                } else {
                    // FALLBACK: If current month is empty, try latest snapshot
                    this.retirementService.getLatestSnapshot().subscribe({
                        next: (latestData) => {
                            if (latestData) {
                                this.applySnapshotData(latestData);
                                // IMPORTANT: Don't set updatedAt/snapshotDate from previous month as current
                                this.lastSnapshotDate.set(new Date().toISOString());
                                // We don't save yet, let the user trigger it or effect handle it
                            }
                            this.isInitialLoadComplete.set(true);
                            this.loading.set(false);
                            this.triggerImmediateCalculation(false);
                        },
                        error: () => {
                            this.isInitialLoadComplete.set(true);
                            this.loading.set(false);
                        }
                    });
                }
            },
            error: (err) => {
                console.error('Failed to load state', err);
                this.isInitialLoadComplete.set(true); // Proceed anyway
                this.loading.set(false);
            }
        });
    }

    private applySnapshotData(data: any) {
        if (data.accounts) {
            this.accounts.set(data.accounts.map((acc: any) => ({
                accountType: acc.accountType,
                goalType: acc.goalType || 'RETIREMENT',
                balance: acc.balance || 0,
                contribution: acc.contribution || 0
            })));
        }

        if (data.currentAge) this.currentAge.set(data.currentAge);
        if (data.targetRetirementAge) this.targetRetirementAge.set(data.targetRetirementAge);
        if (data.targetPortfolioValue) this.targetPortfolioValue.set(data.targetPortfolioValue);
        if (data.oneTimeAdditions !== undefined) this.oneTimeAdditions.set(data.oneTimeAdditions);
        if (data.afterTaxMode) this.afterTaxMode.set(data.afterTaxMode);
        if (data.flatTaxRate) this.flatTaxRate.set(data.flatTaxRate);
        if (data.taxFreeRate !== undefined) this.customTaxRates.update(v => ({ ...v, taxFree: data.taxFreeRate }));
        if (data.taxDeferredRate !== undefined) this.customTaxRates.update(v => ({ ...v, taxDeferred: data.taxDeferredRate }));
        if (data.taxableRate !== undefined) this.customTaxRates.update(v => ({ ...v, taxable: data.taxableRate }));

        this.lastSnapshotDate.set(data.updatedAt || new Date().toISOString());
    }

    private triggerImmediateCalculation(persist: boolean) {
        const req = this.getRequestPayload(persist);
        this.retirementService.evaluatePlan(req).subscribe({
            next: (data) => this.response.set(data),
            error: (err) => console.error('Immediate calculation failed', err)
        });
    }

    private getRequestPayload(persist: boolean): RetirementPlanRequest {
        return {
            currentAge: this.currentAge(),
            monthYear: this.monthYear(),
            currentTotalInvestedBalance: this.totalRetirementBalance(),
            targetPortfolioValue: this.targetPortfolioValue(),
            actualMonthlyContribution: this.totalContributions(),
            oneTimeAdditions: this.oneTimeAdditions(),
            afterTaxMode: this.afterTaxMode(),
            flatTaxRate: this.flatTaxRate(),
            taxFreeRate: this.customTaxRates().taxFree,
            taxDeferredRate: this.customTaxRates().taxDeferred,
            taxableRate: this.customTaxRates().taxable,
            targetRetirementAge: this.targetRetirementAge(),
            persistSnapshot: persist,
            accounts: this.accounts().map(acc => ({
                accountType: acc.accountType,
                goalType: acc.goalType || 'RETIREMENT',
                balance: acc.balance || 0,
                contribution: acc.contribution || 0
            }))
        };
    }
}
