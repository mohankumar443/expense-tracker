import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-slider-control',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="slider-control">
      <div class="flex justify-between items-center mb-2">
        <label class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {{ label }}
        </label>
        <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
          {{ displayValue }}
        </span>
      </div>
      
      <div class="relative h-6 flex items-center">
        <input 
          type="range" 
          [min]="min" 
          [max]="max" 
          [step]="step"
          [ngModel]="value" 
          (ngModelChange)="onValueChange($event)"
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
      </div>
      
      <div class="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
        <span>{{ formatMinMax(min) }}</span>
        <span>{{ formatMinMax(max) }}</span>
      </div>
    </div>
  `,
    styles: [`
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: #4f46e5;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      transition: transform 0.1s;
      margin-top: -6px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
    }
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: transparent;
      border-radius: 2px;
    }
    input[type=range]:active::-webkit-slider-thumb {
        transform: scale(1.2);
    }
  `]
})
export class SliderControlComponent {
    @Input() label: string = '';
    @Input() value: number = 0;
    @Input() min: number = 0;
    @Input() max: number = 100;
    @Input() step: number = 1;
    @Input() formatFn: (v: number) => string = (v) => v.toString(); // Default to string

    @Output() valueChange = new EventEmitter<number>();

    onValueChange(val: number) {
        this.value = val;
        this.valueChange.emit(val);
    }

    get displayValue(): string {
        return this.formatFn(this.value);
    }

    formatMinMax(val: number): string {
        // Simple abbreviation for very large numbers if needed, or just standard
        if (val >= 1000000) return (val / 1000000).toFixed(0) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
        return val.toString();
    }
}
