import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
    ]),
    transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
    ])
]);

export const slideInUp = trigger('slideInUp', [
    transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
    ])
]);

export const slideInLeft = trigger('slideInLeft', [
    transition(':enter', [
        style({ transform: 'translateX(-20px)', opacity: 0 }),
        animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
    ])
]);

export const scaleIn = trigger('scaleIn', [
    transition(':enter', [
        style({ transform: 'scale(0.95)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.95)', opacity: 0 }))
    ])
]);

export const staggerFadeIn = trigger('staggerFadeIn', [
    transition('* => *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('50ms', [
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ], { optional: true })
    ])
]);

export const listAnimation = trigger('listAnimation', [
    transition('* => *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateX(-10px)' }),
            stagger('30ms', [
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
            ])
        ], { optional: true })
    ])
]);
