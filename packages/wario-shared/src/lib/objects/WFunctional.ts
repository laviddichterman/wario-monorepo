/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { startCase, snakeCase } from "es-toolkit/compat";

import { GetPlacementFromMIDOID } from "../common";
import {
  MetadataField,
  OptionPlacement,
  OptionQualifier,
  PRODUCT_LOCATION,
  LogicalFunctionOperator,
  ConstLiteralDiscriminator,
  ProductInstanceFunctionType,
} from '../types';

import type {
  WCPProduct,
  IIfElseExpression,
  ILogicalExpression,
  IAbstractExpression,
  IConstLiteralExpression,
  IProductInstanceFunction,
  ProductMetadataExpression,
  ICatalogModifierSelectors,
  IHasAnyOfModifierExpression,
  IModifierPlacementExpression,
  ConstModifierPlacementLiteralExpression
} from '../types';


export const LogicalFunctionOperatorToHumanString = function (op: LogicalFunctionOperator) {
  switch (op) {
    case LogicalFunctionOperator.AND: return 'and';
    case LogicalFunctionOperator.EQ: return 'equals';
    case LogicalFunctionOperator.GE: return 'is greater than or equal to';
    case LogicalFunctionOperator.GT: return 'is greater than';
    case LogicalFunctionOperator.LE: return 'is less than or equal to';
    case LogicalFunctionOperator.LT: return 'is less than';
    case LogicalFunctionOperator.NE: return 'does not equal';
    case LogicalFunctionOperator.NOT: return 'is not';
    case LogicalFunctionOperator.OR: return 'or';
  }
}

export const FindModifierPlacementExpressionsForMTID = function (expr: IAbstractExpression, mtid: string): IAbstractExpression[] {
  switch (expr.discriminator) {
    case ProductInstanceFunctionType.IfElse:
      return FindModifierPlacementExpressionsForMTID(expr.expr.true_branch, mtid).concat(
        FindModifierPlacementExpressionsForMTID(expr.expr.false_branch, mtid)).concat(
          FindModifierPlacementExpressionsForMTID(expr.expr.test, mtid));
    case ProductInstanceFunctionType.Logical:
      const operandA_expressions = FindModifierPlacementExpressionsForMTID(expr.expr.operandA, mtid);
      const operandB_expressions = expr.expr.operandB !== undefined ? FindModifierPlacementExpressionsForMTID(expr.expr.operandB, mtid) : [];
      return operandA_expressions.concat(operandB_expressions);
    case ProductInstanceFunctionType.ModifierPlacement:
      return expr.expr.mtid === mtid ? [expr] : [];
    case ProductInstanceFunctionType.HasAnyOfModifierType:
    case ProductInstanceFunctionType.ConstLiteral:
    case ProductInstanceFunctionType.ProductMetadata:
      return [];
  }
}

export const FindHasAnyModifierExpressionsForMTID = function (expr: IAbstractExpression, mtid: string): IAbstractExpression[] {
  switch (expr.discriminator) {
    case ProductInstanceFunctionType.IfElse:
      return FindHasAnyModifierExpressionsForMTID(expr.expr.true_branch, mtid).concat(
        FindHasAnyModifierExpressionsForMTID(expr.expr.false_branch, mtid)).concat(
          FindHasAnyModifierExpressionsForMTID(expr.expr.test, mtid));
    case ProductInstanceFunctionType.Logical:
      const operandA_expressions = FindHasAnyModifierExpressionsForMTID(expr.expr.operandA, mtid);
      const operandB_expressions = expr.expr.operandB !== undefined ? FindHasAnyModifierExpressionsForMTID(expr.expr.operandB, mtid) : [];
      return operandA_expressions.concat(operandB_expressions);
    case ProductInstanceFunctionType.HasAnyOfModifierType:
      return expr.expr.mtid === mtid ? [expr] : [];
    case ProductInstanceFunctionType.ModifierPlacement:
    case ProductInstanceFunctionType.ConstLiteral:
    case ProductInstanceFunctionType.ProductMetadata:
      return [];
  }
}

const ModifierPlacementCompareToPlacementHumanReadable = function (placementExtraction: string, placementLiteral: ConstModifierPlacementLiteralExpression, required: boolean) {
  switch (placementLiteral.value) {
    case OptionPlacement.LEFT: return `${placementExtraction} is ${required ? "not " : ""} on the left`;
    case OptionPlacement.RIGHT: return `${placementExtraction} is ${required ? "not " : ""} on the right`;
    case OptionPlacement.NONE: return `${placementExtraction} is ${required ? "not " : ""} selected`;
    case OptionPlacement.WHOLE: return `${placementExtraction} is ${required ? "" : "not "} selected`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class WFunctional {
  static ProcessIfElseStatement(prodModifers: WCPProduct['modifiers'], stmt: IIfElseExpression<IAbstractExpression>, catModSelectors: ICatalogModifierSelectors) {
    const branch_test = WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.test, catModSelectors);
    if (branch_test) {
      return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.true_branch, catModSelectors);
    }
    return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.false_branch, catModSelectors);
  }

  static ProcessIfElseStatementWithTracking(prodModifers: WCPProduct['modifiers'], stmt: IIfElseExpression<IAbstractExpression>, catModSelectors: ICatalogModifierSelectors): [string | number | boolean | OptionPlacement, IAbstractExpression[]] {
    const branchTestResult = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.test, catModSelectors);
    const branchResult = branchTestResult[0] ?
      WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.true_branch, catModSelectors) :
      WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.false_branch, catModSelectors);
    return branchResult[0] === true ? branchResult : [false, [<IAbstractExpression>{
      discriminator: ProductInstanceFunctionType.Logical,
      expr: {
        operator: LogicalFunctionOperator.AND,
        operandA: branchTestResult[1][0],
        operandB: branchResult[1][0]
      }
    }]];
  }

  static ProcessConstLiteralStatement(stmt: IConstLiteralExpression) {
    return stmt.value;
  }

  static ProcessLogicalOperatorStatement(prodModifers: WCPProduct['modifiers'], stmt: ILogicalExpression<IAbstractExpression>, catModSelectors: ICatalogModifierSelectors): boolean {
    switch (stmt.operator) {
      case LogicalFunctionOperator.AND:
        return Boolean(WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors)) &&
          Boolean(WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors));
      case LogicalFunctionOperator.OR:
        return Boolean(WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors)) ||
          Boolean(WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors));
      case LogicalFunctionOperator.NOT:
        return !WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors);
      case LogicalFunctionOperator.EQ:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) ===
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
      case LogicalFunctionOperator.NE:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) !==
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
      case LogicalFunctionOperator.GT:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) >
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
      case LogicalFunctionOperator.GE:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) >=
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
      case LogicalFunctionOperator.LT:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) <
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
      case LogicalFunctionOperator.LE:
        return WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandA, catModSelectors) <=
          WFunctional.ProcessAbstractExpressionStatement(prodModifers, stmt.operandB!, catModSelectors);
    }
  }

  static ProcessLogicalOperatorStatementWithTracking(prodModifers: WCPProduct['modifiers'], stmt: ILogicalExpression<IAbstractExpression>, catModSelectors: ICatalogModifierSelectors): [boolean, IAbstractExpression[]] {
    switch (stmt.operator) {
      case LogicalFunctionOperator.AND:
        const andResultA = <[boolean, IAbstractExpression[]]>WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        if (andResultA[0]) {
          return <[boolean, IAbstractExpression[]]>WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        }
        return andResultA;
      case LogicalFunctionOperator.OR:
        const orResultA = <[boolean, IAbstractExpression[]]>WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        if (orResultA[0]) {
          return orResultA;
        }
        const orResultB = <[boolean, IAbstractExpression[]]>WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return orResultB[0] == orResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.NOT:
        const notResult = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        return !notResult[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.EQ:
        const eqResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const eqResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return eqResultA[0] == eqResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.NE:
        const neqResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const neqResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return neqResultA[0] != neqResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.GT:
        const gtResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const gtResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return gtResultA[0] > gtResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.GE:
        const geResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const geResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return geResultA[0] >= geResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.LT:
        const ltResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const ltResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return ltResultA[0] < ltResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
      case LogicalFunctionOperator.LE:
        const leResultA = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandA, catModSelectors);
        const leResultB = WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifers, stmt.operandB!, catModSelectors);
        return leResultA[0] <= leResultB[0] ? [true, []] : [false, [<IAbstractExpression>{ discriminator: ProductInstanceFunctionType.Logical, expr: stmt }]];
    }
  }

  static ProcessModifierPlacementExtractionOperatorStatement(prodModifiers: WCPProduct['modifiers'], stmt: IModifierPlacementExpression) {
    return GetPlacementFromMIDOID(prodModifiers, stmt.mtid, stmt.moid).placement;
  }

  static ProcessHasAnyOfModifierTypeExtractionOperatorStatement(prodModifiers: WCPProduct['modifiers'], stmt: IHasAnyOfModifierExpression) {
    const foundModifier = prodModifiers.find(x => x.modifierTypeId === stmt.mtid);
    return foundModifier ? foundModifier.options.filter(x => x.placement !== OptionPlacement.NONE).length > 0 : false;
  }

  static ProcessProductMetadataExpression(prodModifiers: WCPProduct['modifiers'], stmt: ProductMetadataExpression, catModSelectors: ICatalogModifierSelectors) {
    return prodModifiers.reduce((acc, modifier) => {
      return (acc + modifier.options.reduce((acc2, optInstance) => {
        const option = catModSelectors.option(optInstance.optionId);
        if (!option) {
          console.error(`Unexpectedly missing modifier option ${JSON.stringify(optInstance)}`);
          return acc2;
        }
        const metadataTypeMultiplier = stmt.field === MetadataField.FLAVOR ? option.metadata.flavor_factor : option.metadata.bake_factor;
        switch (stmt.location) {
          case PRODUCT_LOCATION.LEFT:
            return acc2 + (metadataTypeMultiplier * (optInstance.placement === OptionPlacement.LEFT || optInstance.placement === OptionPlacement.WHOLE ? 1 : 0));
          case PRODUCT_LOCATION.RIGHT:
            return acc2 + (metadataTypeMultiplier * (optInstance.placement === OptionPlacement.RIGHT || optInstance.placement === OptionPlacement.WHOLE ? 1 : 0));
        }
      }, 0));
    }, 0)
  }

  static ProcessAbstractExpressionStatement(prodModifiers: WCPProduct['modifiers'], stmt: IAbstractExpression, catModSelectors: ICatalogModifierSelectors): string | number | boolean | OptionPlacement {
    switch (stmt.discriminator) {
      case ProductInstanceFunctionType.ConstLiteral:
        return WFunctional.ProcessConstLiteralStatement(stmt.expr);
      case ProductInstanceFunctionType.IfElse:
        return WFunctional.ProcessIfElseStatement(prodModifiers, stmt.expr, catModSelectors);
      case ProductInstanceFunctionType.Logical:
        return WFunctional.ProcessLogicalOperatorStatement(prodModifiers, stmt.expr, catModSelectors);
      case ProductInstanceFunctionType.ModifierPlacement:
        return WFunctional.ProcessModifierPlacementExtractionOperatorStatement(prodModifiers, stmt.expr);
      case ProductInstanceFunctionType.HasAnyOfModifierType:
        return WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(prodModifiers, stmt.expr);
      case ProductInstanceFunctionType.ProductMetadata:
        return WFunctional.ProcessProductMetadataExpression(prodModifiers, stmt.expr, catModSelectors);
    }
  }

  static ProcessAbstractExpressionStatementWithTracking(prodModifiers: WCPProduct['modifiers'], stmt: IAbstractExpression, catModSelectors: ICatalogModifierSelectors): [string | number | boolean | OptionPlacement, IAbstractExpression[]] {
    switch (stmt.discriminator) {
      case ProductInstanceFunctionType.ConstLiteral:
        return [WFunctional.ProcessConstLiteralStatement(stmt.expr), []];
      case ProductInstanceFunctionType.IfElse:
        return WFunctional.ProcessIfElseStatementWithTracking(prodModifiers, stmt.expr, catModSelectors);
      case ProductInstanceFunctionType.Logical:
        return WFunctional.ProcessLogicalOperatorStatementWithTracking(prodModifiers, stmt.expr, catModSelectors);
      case ProductInstanceFunctionType.ModifierPlacement:
        return [WFunctional.ProcessModifierPlacementExtractionOperatorStatement(prodModifiers, stmt.expr), []];
      case ProductInstanceFunctionType.HasAnyOfModifierType:
        const result = WFunctional.ProcessHasAnyOfModifierTypeExtractionOperatorStatement(prodModifiers, stmt.expr);
        return [result, result ? [] : [stmt]];
      case ProductInstanceFunctionType.ProductMetadata:
        return [WFunctional.ProcessProductMetadataExpression(prodModifiers, stmt.expr, catModSelectors), []];
    }
  }

  static ProcessProductInstanceFunction(prodModifiers: WCPProduct['modifiers'], func: IProductInstanceFunction, catModSelectors: ICatalogModifierSelectors) {
    return WFunctional.ProcessAbstractExpressionStatement(prodModifiers, func.expression, catModSelectors);
  }

  static ProcessProductInstanceFunctionWithTracking(prodModifiers: WCPProduct['modifiers'], func: IProductInstanceFunction, catModSelectors: ICatalogModifierSelectors) {
    return WFunctional.ProcessAbstractExpressionStatementWithTracking(prodModifiers, func.expression, catModSelectors);
  }

  static AbstractExpressionStatementToString(stmt: IAbstractExpression, catModSelectors: ICatalogModifierSelectors): string {
    function logical(expr: ILogicalExpression<IAbstractExpression>) {
      const operandAString = WFunctional.AbstractExpressionStatementToString(expr.operandA, catModSelectors);
      return expr.operator === LogicalFunctionOperator.NOT || !expr.operandB ? `NOT (${operandAString})` : `(${operandAString} ${expr.operator} ${WFunctional.AbstractExpressionStatementToString(expr.operandB, catModSelectors)})`;
    }
    function modifierPlacement(expr: IModifierPlacementExpression) {
      const modEntry = catModSelectors.modifierEntry(expr.mtid);
      const opt = catModSelectors.option(expr.moid);
      if (!modEntry || !opt) {
        return "";
      }
      return `${modEntry.modifierType.name}.${opt.displayName}`;
    }
    switch (stmt.discriminator) {
      case ProductInstanceFunctionType.ConstLiteral:
        switch (stmt.expr.discriminator) {
          case ConstLiteralDiscriminator.BOOLEAN:
            return stmt.expr.value ? "True" : "False";
          case ConstLiteralDiscriminator.NUMBER:
            return stmt.expr.value.toString();
          case ConstLiteralDiscriminator.STRING:
            return stmt.expr.value;
          case ConstLiteralDiscriminator.MODIFIER_PLACEMENT:
            return OptionPlacement[stmt.expr.value];
          case ConstLiteralDiscriminator.MODIFIER_QUALIFIER:
            return OptionQualifier[stmt.expr.value];
        }
      case ProductInstanceFunctionType.IfElse:
        return `IF(${WFunctional.AbstractExpressionStatementToString(stmt.expr.test, catModSelectors)}) { ${WFunctional.AbstractExpressionStatementToString(stmt.expr.true_branch, catModSelectors)} } ELSE { ${WFunctional.AbstractExpressionStatementToString(stmt.expr.false_branch, catModSelectors)} }`;
      case ProductInstanceFunctionType.Logical:
        return logical(stmt.expr);
      case ProductInstanceFunctionType.ModifierPlacement:
        return modifierPlacement(stmt.expr);
      case ProductInstanceFunctionType.HasAnyOfModifierType:
        return `ANY ${catModSelectors.modifierEntry((stmt.expr).mtid)?.modifierType.name ?? "UNDEFINED"}`;
      case ProductInstanceFunctionType.ProductMetadata:
        return `:${MetadataField[stmt.expr.field]}@${PRODUCT_LOCATION[stmt.expr.location]}`;
    }
  }

  static AbstractExpressionStatementToHumanReadableString(stmt: IAbstractExpression, catModSelectors: ICatalogModifierSelectors): string {
    function logical(expr: ILogicalExpression<IAbstractExpression>) {
      const operandAString = WFunctional.AbstractExpressionStatementToHumanReadableString(expr.operandA, catModSelectors);
      if (expr.operator === LogicalFunctionOperator.NOT || !expr.operandB) {
        if (expr.operandA.discriminator === ProductInstanceFunctionType.HasAnyOfModifierType) {
          return `no ${catModSelectors.modifierEntry(expr.operandA.expr.mtid)?.modifierType.name ?? "UNDEFINED"} modifiers are selected`
        }
        return `not ${operandAString}`;
      }
      const operandBString = WFunctional.AbstractExpressionStatementToHumanReadableString(expr.operandB, catModSelectors);
      if (expr.operandA.discriminator === ProductInstanceFunctionType.ModifierPlacement &&
        expr.operandB.discriminator === ProductInstanceFunctionType.ConstLiteral &&
        expr.operandB.expr.discriminator === ConstLiteralDiscriminator.MODIFIER_PLACEMENT) {
        if (expr.operator === LogicalFunctionOperator.EQ) {
          return ModifierPlacementCompareToPlacementHumanReadable(operandAString, expr.operandB.expr, true);
        } else if (expr.operator === LogicalFunctionOperator.NE) {
          return ModifierPlacementCompareToPlacementHumanReadable(operandAString, expr.operandB.expr, false);
        }
      } else if (expr.operandB.discriminator === ProductInstanceFunctionType.ModifierPlacement &&
        expr.operandA.discriminator === ProductInstanceFunctionType.ConstLiteral &&
        expr.operandA.expr.discriminator === ConstLiteralDiscriminator.MODIFIER_PLACEMENT) {
        if (expr.operator === LogicalFunctionOperator.EQ) {
          return ModifierPlacementCompareToPlacementHumanReadable(operandBString, expr.operandA.expr, true);
        } else if (expr.operator === LogicalFunctionOperator.NE) {
          return ModifierPlacementCompareToPlacementHumanReadable(operandBString, expr.operandA.expr, false);
        }
      }
      return `${operandAString} ${LogicalFunctionOperatorToHumanString(expr.operator)} ${operandBString}`;
    }
    function modifierPlacement(expr: IModifierPlacementExpression) {
      const opt = catModSelectors.option(expr.moid);
      if (!opt) {
        return "UNDEFINED";
      }
      return opt.displayName;
    }
    switch (stmt.discriminator) {
      case ProductInstanceFunctionType.ConstLiteral:
        switch (stmt.expr.discriminator) {
          case ConstLiteralDiscriminator.BOOLEAN:
            return stmt.expr.value ? "True" : "False";
          case ConstLiteralDiscriminator.NUMBER:
            return stmt.expr.value.toString();
          case ConstLiteralDiscriminator.STRING:
            return stmt.expr.value;
          case ConstLiteralDiscriminator.MODIFIER_PLACEMENT:
            return startCase(snakeCase((OptionPlacement[stmt.expr.value])));
          case ConstLiteralDiscriminator.MODIFIER_QUALIFIER:
            return startCase(snakeCase((OptionQualifier[stmt.expr.value])));
        }
      case ProductInstanceFunctionType.IfElse:
        return `if ${WFunctional.AbstractExpressionStatementToHumanReadableString(stmt.expr.test, catModSelectors)} then ${WFunctional.AbstractExpressionStatementToHumanReadableString(stmt.expr.true_branch, catModSelectors)}, otherwise ${WFunctional.AbstractExpressionStatementToHumanReadableString(stmt.expr.false_branch, catModSelectors)}`;
      case ProductInstanceFunctionType.Logical:
        return logical(stmt.expr);
      case ProductInstanceFunctionType.ModifierPlacement:
        return modifierPlacement(stmt.expr);
      case ProductInstanceFunctionType.HasAnyOfModifierType:
        return `any ${catModSelectors.modifierEntry((stmt.expr).mtid)?.modifierType.name ?? "UNDEFINED"} modifiers selected`;
      case ProductInstanceFunctionType.ProductMetadata:
        return `:${MetadataField[stmt.expr.field]}@${PRODUCT_LOCATION[stmt.expr.location]}`;
    }
  }
}
