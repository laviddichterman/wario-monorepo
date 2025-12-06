import { describe, expect, it } from '@jest/globals';

import type {
  IAbstractExpression,
  IOption,
  ProductModifierEntry,
} from '../src/lib/derived-types';
import {
  ConstLiteralDiscriminator,
  LogicalFunctionOperator,
  MetadataField,
  OptionPlacement,
  OptionQualifier,
  PRODUCT_LOCATION,
  ProductInstanceFunctionType,
} from '../src/lib/enums';
import {
  FindHasAnyModifierExpressionsForMTID,
  FindModifierPlacementExpressionsForMTID,
  LogicalFunctionOperatorToHumanString,
  WFunctional,
} from '../src/lib/objects/WFunctional';
import type { ICatalogModifierSelectors, WCPProduct } from '../src/lib/types';

// Mock catalog selectors for testing
const createMockCatModSelectors = (
  options: Record<string, Partial<IOption>> = {},
  modifierEntries: Record<string, { modifierType: { name: string }; options: string[] }> = {}
): ICatalogModifierSelectors => ({
  option: (id: string) => options[id] as IOption | undefined,
  modifierEntry: (id: string) => modifierEntries[id] as ReturnType<ICatalogModifierSelectors['modifierEntry']>,
});

describe('LogicalFunctionOperatorToHumanString', () => {
  it('should return "and" for AND operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.AND)).toBe('and');
  });

  it('should return "or" for OR operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.OR)).toBe('or');
  });

  it('should return "is not" for NOT operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.NOT)).toBe('is not');
  });

  it('should return "equals" for EQ operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.EQ)).toBe('equals');
  });

  it('should return "does not equal" for NE operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.NE)).toBe('does not equal');
  });

  it('should return "is greater than" for GT operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.GT)).toBe('is greater than');
  });

  it('should return "is greater than or equal to" for GE operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.GE)).toBe('is greater than or equal to');
  });

  it('should return "is less than" for LT operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.LT)).toBe('is less than');
  });

  it('should return "is less than or equal to" for LE operator', () => {
    expect(LogicalFunctionOperatorToHumanString(LogicalFunctionOperator.LE)).toBe('is less than or equal to');
  });
});

describe('WFunctional.ProcessConstLiteralStatement', () => {
  it('should return the value for a boolean literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.BOOLEAN as const, value: true };
    expect(WFunctional.ProcessConstLiteralStatement(stmt)).toBe(true);
  });

  it('should return the value for a number literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.NUMBER as const, value: 42 };
    expect(WFunctional.ProcessConstLiteralStatement(stmt)).toBe(42);
  });

  it('should return the value for a string literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.STRING as const, value: 'hello' };
    expect(WFunctional.ProcessConstLiteralStatement(stmt)).toBe('hello');
  });

  it('should return the value for a modifier placement literal', () => {
    const stmt = { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT as const, value: OptionPlacement.LEFT };
    expect(WFunctional.ProcessConstLiteralStatement(stmt)).toBe(OptionPlacement.LEFT);
  });
});

describe('WFunctional.ProcessLogicalOperatorStatement', () => {
  const mockSelectors = createMockCatModSelectors();
  const emptyModifiers: WCPProduct['modifiers'] = [];

  const createConstBoolExpr = (value: boolean): IAbstractExpression => ({
    discriminator: ProductInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN as const, value },
  });

  const createConstNumExpr = (value: number): IAbstractExpression => ({
    discriminator: ProductInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.NUMBER as const, value },
  });

  it('should process AND operator correctly (true && true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.AND,
      operandA: createConstBoolExpr(true),
      operandB: createConstBoolExpr(true),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process AND operator correctly (true && false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.AND,
      operandA: createConstBoolExpr(true),
      operandB: createConstBoolExpr(false),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(false);
  });

  it('should process OR operator correctly (false || true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.OR,
      operandA: createConstBoolExpr(false),
      operandB: createConstBoolExpr(true),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process OR operator correctly (false || false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.OR,
      operandA: createConstBoolExpr(false),
      operandB: createConstBoolExpr(false),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(false);
  });

  it('should process NOT operator correctly (!true)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NOT,
      operandA: createConstBoolExpr(true),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(false);
  });

  it('should process NOT operator correctly (!false)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NOT,
      operandA: createConstBoolExpr(false),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process EQ operator correctly (5 === 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.EQ,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process EQ operator correctly (5 === 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.EQ,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(false);
  });

  it('should process NE operator correctly (5 !== 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.NE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process GT operator correctly (5 > 3)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.GT,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(3),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process GE operator correctly (5 >= 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.GE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process LT operator correctly (3 < 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.LT,
      operandA: createConstNumExpr(3),
      operandB: createConstNumExpr(5),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });

  it('should process LE operator correctly (5 <= 5)', () => {
    const stmt = {
      operator: LogicalFunctionOperator.LE,
      operandA: createConstNumExpr(5),
      operandB: createConstNumExpr(5),
    };
    expect(WFunctional.ProcessLogicalOperatorStatement(emptyModifiers, stmt, mockSelectors)).toBe(true);
  });
});

describe('WFunctional.ProcessIfElseStatement', () => {
  const mockSelectors = createMockCatModSelectors();
  const emptyModifiers: WCPProduct['modifiers'] = [];

  const createConstBoolExpr = (value: boolean): IAbstractExpression => ({
    discriminator: ProductInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value },
  });

  const createConstStrExpr = (value: string): IAbstractExpression => ({
    discriminator: ProductInstanceFunctionType.ConstLiteral,
    expr: { discriminator: ConstLiteralDiscriminator.STRING, value },
  });

  it('should return true_branch when test is true', () => {
    const stmt = {
      test: createConstBoolExpr(true),
      true_branch: createConstStrExpr('yes'),
      false_branch: createConstStrExpr('no'),
    };
    expect(WFunctional.ProcessIfElseStatement(emptyModifiers, stmt, mockSelectors)).toBe('yes');
  });

  it('should return false_branch when test is false', () => {
    const stmt = {
      test: createConstBoolExpr(false),
      true_branch: createConstStrExpr('yes'),
      false_branch: createConstStrExpr('no'),
    };
    expect(WFunctional.ProcessIfElseStatement(emptyModifiers, stmt, mockSelectors)).toBe('no');
  });
});

describe('WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement', () => {
  it('should return false when modifier type is not found', () => {
    const modifiers: ProductModifierEntry[] = [];
    const stmt = { mtid: 'mt1' };
    expect(WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(modifiers, stmt)).toBe(false);
  });

  it('should return false when modifier type has no selected options', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [] },
    ];
    const stmt = { mtid: 'mt1' };
    expect(WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(modifiers, stmt)).toBe(false);
  });

  it('should return false when all options have placement NONE', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const stmt = { mtid: 'mt1' };
    expect(WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(modifiers, stmt)).toBe(false);
  });

  it('should return true when at least one option has non-NONE placement', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const stmt = { mtid: 'mt1' };
    expect(WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(modifiers, stmt)).toBe(true);
  });
});

describe('WFunctional.ProcessModifierPlacementExtractionOperatorStatement', () => {
  it('should return NONE when modifier type is not found', () => {
    const modifiers: ProductModifierEntry[] = [];
    const stmt = { mtid: 'mt1', moid: 'opt1' };
    expect(WFunctional.ProcessModifierPlacementExtractionOperatorStatement(modifiers, stmt)).toBe(OptionPlacement.NONE);
  });

  it('should return NONE when option is not found in modifier', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [] },
    ];
    const stmt = { mtid: 'mt1', moid: 'opt1' };
    expect(WFunctional.ProcessModifierPlacementExtractionOperatorStatement(modifiers, stmt)).toBe(OptionPlacement.NONE);
  });

  it('should return the correct placement when option is found', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.LEFT, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const stmt = { mtid: 'mt1', moid: 'opt1' };
    expect(WFunctional.ProcessModifierPlacementExtractionOperatorStatement(modifiers, stmt)).toBe(OptionPlacement.LEFT);
  });
});

describe('WFunctional.ProcessProductMetadataExpression', () => {
  it('should return 0 when no modifiers are provided', () => {
    const modifiers: ProductModifierEntry[] = [];
    const mockSelectors = createMockCatModSelectors();
    const stmt = { field: MetadataField.FLAVOR, location: PRODUCT_LOCATION.LEFT };
    expect(WFunctional.ProcessProductMetadataExpression(modifiers, stmt, mockSelectors)).toBe(0);
  });

  it('should sum flavor factors for LEFT placement', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.LEFT, qualifier: OptionQualifier.REGULAR },
          { optionId: 'opt2', placement: OptionPlacement.RIGHT, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const mockSelectors = createMockCatModSelectors({
      opt1: { metadata: { flavor_factor: 2, bake_factor: 1, can_split: true } },
      opt2: { metadata: { flavor_factor: 3, bake_factor: 1, can_split: true } },
    });
    const stmt = { field: MetadataField.FLAVOR, location: PRODUCT_LOCATION.LEFT };
    expect(WFunctional.ProcessProductMetadataExpression(modifiers, stmt, mockSelectors)).toBe(2);
  });

  it('should sum flavor factors for WHOLE placement on LEFT location', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const mockSelectors = createMockCatModSelectors({
      opt1: { metadata: { flavor_factor: 2, bake_factor: 1, can_split: true } },
    });
    const stmt = { field: MetadataField.FLAVOR, location: PRODUCT_LOCATION.LEFT };
    expect(WFunctional.ProcessProductMetadataExpression(modifiers, stmt, mockSelectors)).toBe(2);
  });

  it('should sum bake factors for RIGHT placement', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          { optionId: 'opt1', placement: OptionPlacement.RIGHT, qualifier: OptionQualifier.REGULAR },
        ],
      },
    ];
    const mockSelectors = createMockCatModSelectors({
      opt1: { metadata: { flavor_factor: 2, bake_factor: 3, can_split: true } },
    });
    const stmt = { field: MetadataField.WEIGHT, location: PRODUCT_LOCATION.RIGHT };
    expect(WFunctional.ProcessProductMetadataExpression(modifiers, stmt, mockSelectors)).toBe(3);
  });
});

describe('FindModifierPlacementExpressionsForMTID', () => {
  it('should return empty array for ConstLiteral expression', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
    };
    expect(FindModifierPlacementExpressionsForMTID(expr, 'mt1')).toEqual([]);
  });

  it('should return the expression when ModifierPlacement matches mtid', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt1' },
    };
    const result = FindModifierPlacementExpressionsForMTID(expr, 'mt1');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(expr);
  });

  it('should return empty array when ModifierPlacement does not match mtid', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt2', moid: 'opt1' },
    };
    expect(FindModifierPlacementExpressionsForMTID(expr, 'mt1')).toEqual([]);
  });

  it('should find nested expressions in IfElse', () => {
    const matchingExpr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt1' },
    };
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.IfElse,
      expr: {
        test: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        true_branch: matchingExpr,
        false_branch: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false } },
      },
    };
    const result = FindModifierPlacementExpressionsForMTID(expr, 'mt1');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(matchingExpr);
  });

  it('should find nested expressions in Logical operator', () => {
    const matchingExprA: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt1' },
    };
    const matchingExprB: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt2' },
    };
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: matchingExprA,
        operandB: matchingExprB,
      },
    };
    const result = FindModifierPlacementExpressionsForMTID(expr, 'mt1');
    expect(result).toHaveLength(2);
  });
});

describe('FindHasAnyModifierExpressionsForMTID', () => {
  it('should return empty array for ConstLiteral expression', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
    };
    expect(FindHasAnyModifierExpressionsForMTID(expr, 'mt1')).toEqual([]);
  });

  it('should return the expression when HasAnyOfModifierType matches mtid', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.HasAnyOfModifierType,
      expr: { mtid: 'mt1' },
    };
    const result = FindHasAnyModifierExpressionsForMTID(expr, 'mt1');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(expr);
  });

  it('should return empty array when HasAnyOfModifierType does not match mtid', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.HasAnyOfModifierType,
      expr: { mtid: 'mt2' },
    };
    expect(FindHasAnyModifierExpressionsForMTID(expr, 'mt1')).toEqual([]);
  });
});

describe('WFunctional.ProcessAbstractExpressionStatement', () => {
  const mockSelectors = createMockCatModSelectors();
  const emptyModifiers: WCPProduct['modifiers'] = [];

  it('should process ConstLiteral expression', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 42 },
    };
    expect(WFunctional.ProcessAbstractExpressionStatement(emptyModifiers, expr, mockSelectors)).toBe(42);
  });

  it('should process IfElse expression', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.IfElse,
      expr: {
        test: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        true_branch: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'yes' } },
        false_branch: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'no' } },
      },
    };
    expect(WFunctional.ProcessAbstractExpressionStatement(emptyModifiers, expr, mockSelectors)).toBe('yes');
  });

  it('should process Logical expression', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
        operandB: { discriminator: ProductInstanceFunctionType.ConstLiteral, expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true } },
      },
    };
    expect(WFunctional.ProcessAbstractExpressionStatement(emptyModifiers, expr, mockSelectors)).toBe(true);
  });

  it('should process ModifierPlacement expression', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
      },
    ];
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt1' },
    };
    expect(WFunctional.ProcessAbstractExpressionStatement(modifiers, expr, mockSelectors)).toBe(OptionPlacement.WHOLE);
  });

  it('should process HasAnyOfModifierType expression', () => {
    const modifiers: ProductModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
      },
    ];
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.HasAnyOfModifierType,
      expr: { mtid: 'mt1' },
    };
    expect(WFunctional.ProcessAbstractExpressionStatement(modifiers, expr, mockSelectors)).toBe(true);
  });
});

describe('WFunctional.ProcessProductInstanceFunction', () => {
  const mockSelectors = createMockCatModSelectors();
  const emptyModifiers: WCPProduct['modifiers'] = [];

  it('should process a product instance function', () => {
    const func = {
      id: 'func1',
      name: 'Test Function',
      expression: {
        discriminator: ProductInstanceFunctionType.ConstLiteral as const,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN as const, value: true },
      },
    };
    expect(WFunctional.ProcessProductInstanceFunction(emptyModifiers, func, mockSelectors)).toBe(true);
  });
});

describe('WFunctional.AbstractExpressionStatementToString', () => {
  const mockSelectors = createMockCatModSelectors(
    { opt1: { displayName: 'Extra Cheese' } as IOption },
    { mt1: { modifierType: { name: 'Toppings' }, options: ['opt1'] } }
  );

  it('should convert boolean literal to string', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
    };
    expect(WFunctional.AbstractExpressionStatementToString(expr, mockSelectors)).toBe('True');
  });

  it('should convert number literal to string', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 42 },
    };
    expect(WFunctional.AbstractExpressionStatementToString(expr, mockSelectors)).toBe('42');
  });

  it('should convert modifier placement literal to string', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT, value: OptionPlacement.WHOLE },
    };
    expect(WFunctional.AbstractExpressionStatementToString(expr, mockSelectors)).toBe('WHOLE');
  });

  it('should convert ModifierPlacement expression to string', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.ModifierPlacement,
      expr: { mtid: 'mt1', moid: 'opt1' },
    };
    expect(WFunctional.AbstractExpressionStatementToString(expr, mockSelectors)).toBe('Toppings.Extra Cheese');
  });

  it('should convert HasAnyOfModifierType expression to string', () => {
    const expr: IAbstractExpression = {
      discriminator: ProductInstanceFunctionType.HasAnyOfModifierType,
      expr: { mtid: 'mt1' },
    };
    expect(WFunctional.AbstractExpressionStatementToString(expr, mockSelectors)).toBe('ANY Toppings');
  });
});
