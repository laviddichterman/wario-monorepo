import { describe, expect, it } from '@jest/globals';

import type {
  AbstractOrderExpression,
  WOrderInstancePartial,
} from '../src/lib/derived-types';
import {
  ConstLiteralDiscriminator,
  LogicalFunctionOperator,
  OptionPlacement,
  OptionQualifier,
  OrderInstanceFunctionType,
} from '../src/lib/enums';
import { OrderFunctional } from '../src/lib/objects/OrderFunctional';

import { createMockCatalogSelectorsFromArrays } from './mocks';

// Helper function to create a mock order
const createMockOrder = (): WOrderInstancePartial => ({
  cart: [],
} as unknown as WOrderInstancePartial);

describe('OrderFunctional.ProcessConstLiteralStatement', () => {
  it('should return the value for a boolean literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.BOOLEAN as const, value: true };
    expect(OrderFunctional.ProcessConstLiteralStatement(stmt)).toBe(true);
  });

  it('should return the value for a number literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.NUMBER as const, value: 42 };
    expect(OrderFunctional.ProcessConstLiteralStatement(stmt)).toBe(42);
  });

  it('should return the value for a string literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.STRING as const, value: 'hello' };
    expect(OrderFunctional.ProcessConstLiteralStatement(stmt)).toBe('hello');
  });

  it('should return the value for a modifier placement literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT as const, value: OptionPlacement.LEFT };
    expect(OrderFunctional.ProcessConstLiteralStatement(stmt)).toBe(OptionPlacement.LEFT);
  });

  it('should return the value for a modifier qualifier literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.MODIFIER_QUALIFIER as const, value: OptionQualifier.HEAVY };
    expect(OrderFunctional.ProcessConstLiteralStatement(stmt)).toBe(OptionQualifier.HEAVY);
  });
});

describe('OrderFunctional.ProcessLogicalOperatorStatement', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});
  const mockOrder = createMockOrder();

  const createConstBoolExpr = (value: boolean): AbstractOrderExpression => ({
    discriminator: OrderInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value },
  });

  const createConstNumExpr = (value: number): AbstractOrderExpression => ({
    discriminator: OrderInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value },
  });

  it('should process AND operator correctly (true && true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.AND,
      operandA: createConstBoolExpr(true),
      operandB: createConstBoolExpr(true),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process AND operator correctly (true && false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.AND,
      operandA: createConstBoolExpr(true),
      operandB: createConstBoolExpr(false),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(false);
  });

  it('should process OR operator correctly (false || true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.OR,
      operandA: createConstBoolExpr(false),
      operandB: createConstBoolExpr(true),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process OR operator correctly (false || false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.OR,
      operandA: createConstBoolExpr(false),
      operandB: createConstBoolExpr(false),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(false);
  });

  it('should process NOT operator correctly (!true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NOT,
      operandA: createConstBoolExpr(true),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(false);
  });

  it('should process NOT operator correctly (!false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NOT,
      operandA: createConstBoolExpr(false),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process EQ operator correctly (5 === 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.EQ,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process EQ operator correctly (5 === 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.EQ,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(false);
  });

  it('should process NE operator correctly (5 !== 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process GT operator correctly (5 > 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.GT,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process GE operator correctly (5 >= 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.GE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process LT operator correctly (3 < 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.LT,
      operandA: createConstNumExpr(3),
      operandB: createConstNumExpr(5),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });

  it('should process LE operator correctly (5 <= 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.LE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(OrderFunctional.ProcessLogicalOperatorStatement(mockOrder, stmt, mockSelectors)).toBe(true);
  });
});

describe('OrderFunctional.ProcessIfElseStatement', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});
  const mockOrder = createMockOrder();

  const createConstBoolExpr = (value: boolean): AbstractOrderExpression => ({
    discriminator: OrderInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value },
  });

  const createConstStrExpr = (value: string): AbstractOrderExpression => ({
    discriminator: OrderInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.STRING, value },
  });

  it('should return true_branch when test is true', () => {
    const stmt = {
      test: createConstBoolExpr(true),
      true_branch: createConstStrExpr('yes'),
      false_branch: createConstStrExpr('no'),
    };
    expect(OrderFunctional.ProcessIfElseStatement(mockOrder, stmt, mockSelectors)).toBe('yes');
  });

  it('should return false_branch when test is false', () => {
    const stmt = {
      test: createConstBoolExpr(false),
      true_branch: createConstStrExpr('yes'),
      false_branch: createConstStrExpr('no'),
    };
    expect(OrderFunctional.ProcessIfElseStatement(mockOrder, stmt, mockSelectors)).toBe('no');
  });
});

describe('OrderFunctional.ProcessAbstractOrderExpressionStatement', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});
  const mockOrder = createMockOrder();

  it('should process ConstLiteral expression', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 42 },
    };
    expect(OrderFunctional.ProcessAbstractOrderExpressionStatement(mockOrder, expr, mockSelectors)).toBe(42);
  });

  it('should process IfElse expression', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.IfElse,
      expr: {
        test: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        true_branch: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'yes' } },
        false_branch: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'no' } },
      },
    };
    expect(OrderFunctional.ProcessAbstractOrderExpressionStatement(mockOrder, expr, mockSelectors)).toBe('yes');
  });

  it('should process Logical expression', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        operandB: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
      },
    };
    expect(OrderFunctional.ProcessAbstractOrderExpressionStatement(mockOrder, expr, mockSelectors)).toBe(true);
  });
});

describe('OrderFunctional.ProcessOrderInstanceFunction', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});
  const mockOrder = createMockOrder();

  it('should process an order instance function', () => {
    const func = {
      id: 'func1',
      name: 'Test Function',
      expression: {
        discriminator: OrderInstanceFunctionType.ConstLiteral as const,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN as const, value: true },
      },
    };
    expect(OrderFunctional.ProcessOrderInstanceFunction(mockOrder, func, mockSelectors)).toBe(true);
  });
});

describe('OrderFunctional.AbstractOrderExpressionStatementToString', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});

  it('should convert boolean literal to string (true)', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('True');
  });

  it('should convert boolean literal to string (false)', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('False');
  });

  it('should convert number literal to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 42 },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('42');
  });

  it('should convert string literal to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'hello' },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('hello');
  });

  it('should convert modifier placement literal to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT, value: OptionPlacement.WHOLE },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('WHOLE');
  });

  it('should convert modifier qualifier literal to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_QUALIFIER, value: OptionQualifier.HEAVY },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors)).toBe('HEAVY');
  });

  it('should convert IfElse expression to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.IfElse,
      expr: {
        test: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        true_branch: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'yes' } },
        false_branch: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'no' } },
      },
    };
    const result = OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors);
    expect(result).toContain('IF');
    expect(result).toContain('ELSE');
  });

  it('should convert Logical NOT expression to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.NOT,
        operandA: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
      },
    };
    const result = OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors);
    expect(result).toContain('NOT');
  });

  it('should convert Logical AND expression to string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        operandB: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false } },
      },
    };
    const result = OrderFunctional.AbstractOrderExpressionStatementToString(expr, mockSelectors);
    expect(result).toContain('AND');
  });
});

describe('OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString', () => {
  const mockSelectors = createMockCatalogSelectorsFromArrays({});

  it('should convert boolean literal to human readable string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString(expr, mockSelectors)).toBe('True');
  });

  it('should convert number literal to human readable string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 42 },
    };
    expect(OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString(expr, mockSelectors)).toBe('42');
  });

  it('should convert modifier placement to human readable string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT, value: OptionPlacement.WHOLE },
    };
    // startCase(snakeCase('WHOLE')) = 'Whole'
    expect(OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString(expr, mockSelectors)).toBe('Whole');
  });

  it('should convert Logical NOT expression to human readable string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.NOT,
        operandA: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
      },
    };
    const result = OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString(expr, mockSelectors);
    expect(result).toContain('not');
  });

  it('should convert Logical AND expression to human readable string', () => {
    const expr: AbstractOrderExpression = {
      discriminator: OrderInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        operandB: { discriminator: OrderInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false } },
      },
    };
    const result = OrderFunctional.AbstractOrderExpressionStatementToHumanReadableString(expr, mockSelectors);
    expect(result).toContain('and');
  });
});
