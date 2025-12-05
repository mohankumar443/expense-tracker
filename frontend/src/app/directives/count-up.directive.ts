import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appCountUp]'
})
export class CountUpDirective implements OnChanges {
    @Input('appCountUp') endValue: number = 0;
    @Input() duration: number = 2000;
    @Input() prefix: string = '';
    @Input() suffix: string = '';
    @Input() decimals: number = 0;

    private animationFrameId: number | null = null;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['endValue']) {
            this.animate();
        }
    }

    private animate() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        const startValue = 0;
        const startTime = performance.now();
        const change = this.endValue - startValue;

        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = startValue + change * ease;
            this.renderer.setProperty(this.el.nativeElement, 'innerText', this.formatNumber(current));

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(step);
            }
        };

        this.animationFrameId = requestAnimationFrame(step);
    }

    private formatNumber(value: number): string {
        return this.prefix + value.toLocaleString('en-US', {
            minimumFractionDigits: this.decimals,
            maximumFractionDigits: this.decimals
        }) + this.suffix;
    }
}
