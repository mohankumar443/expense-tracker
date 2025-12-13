import { TestBed } from '@angular/core/testing';

import { RecurringExpenseService } from './recurring-expense.service';

describe('RecurringExpenseService', () => {
  let service: RecurringExpenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecurringExpenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
