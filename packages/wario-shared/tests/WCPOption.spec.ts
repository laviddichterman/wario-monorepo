/**
 * Unit tests for WCPOption pure functions.
 *
 * Tests the modifier visibility logic used by cart item components
 * to determine if modifiers should be displayed.
 */
import { DISPLAY_AS, MODIFIER_CLASS } from '../src/lib/enums';
import { IsModifierTypeVisible } from '../src/lib/objects/WCPOption';

import { createMockOptionType, createMockOptionTypeDisplayFlags } from './mocks';

// =============================================================================
// IsModifierTypeVisible Tests
// =============================================================================

describe('IsModifierTypeVisible', () => {
  describe('when modifierType is null or undefined', () => {
    it('should return true when modifierType is null', () => {
      const result = IsModifierTypeVisible(null, true);
      expect(result).toBe(true);
    });

    it('should return true when modifierType is undefined', () => {
      const result = IsModifierTypeVisible(undefined, false);
      expect(result).toBe(true);
    });
  });

  describe('when modifierType.displayFlags.hidden is true', () => {
    it('should return false regardless of hasSelectable', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: true,
          omit_section_if_no_available_options: false,
        }),
      });

      expect(IsModifierTypeVisible(modifierType, true)).toBe(false);
      expect(IsModifierTypeVisible(modifierType, false)).toBe(false);
    });
  });

  describe('when modifierType.displayFlags.omit_section_if_no_available_options is true', () => {
    it('should return true when hasSelectable is true', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: false,
          omit_section_if_no_available_options: true,
        }),
      });

      const result = IsModifierTypeVisible(modifierType, true);
      expect(result).toBe(true);
    });

    it('should return false when hasSelectable is false', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: false,
          omit_section_if_no_available_options: true,
        }),
      });

      const result = IsModifierTypeVisible(modifierType, false);
      expect(result).toBe(false);
    });
  });

  describe('when modifierType.displayFlags.omit_section_if_no_available_options is false', () => {
    it('should return true when hasSelectable is true and not hidden', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: false,
          omit_section_if_no_available_options: false,
        }),
      });

      const result = IsModifierTypeVisible(modifierType, true);
      expect(result).toBe(true);
    });

    it('should return true when hasSelectable is false and not hidden', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: false,
          omit_section_if_no_available_options: false,
        }),
      });

      const result = IsModifierTypeVisible(modifierType, false);
      expect(result).toBe(true);
    });
  });

  describe('edge cases with various display flag combinations', () => {
    it('should handle hidden + omit_section_if_no_available_options both true', () => {
      const modifierType = createMockOptionType({
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: true,
          omit_section_if_no_available_options: true,
        }),
      });

      // hidden takes precedence - should be false regardless
      expect(IsModifierTypeVisible(modifierType, true)).toBe(false);
      expect(IsModifierTypeVisible(modifierType, false)).toBe(false);
    });

    it('should work with default mock display flags', () => {
      // Default flags: hidden=false, omit_section_if_no_available_options=false
      const modifierType = createMockOptionType();

      expect(IsModifierTypeVisible(modifierType, true)).toBe(true);
      expect(IsModifierTypeVisible(modifierType, false)).toBe(true);
    });

    it('should work with fully configured modifier type', () => {
      const modifierType = createMockOptionType({
        id: 'mt_toppings',
        name: 'Toppings',
        displayName: 'Add Toppings',
        min_selected: 0,
        max_selected: 5,
        options: ['opt1', 'opt2'],
        displayFlags: createMockOptionTypeDisplayFlags({
          hidden: false,
          omit_section_if_no_available_options: true,
          empty_display_as: DISPLAY_AS.OMIT,
          modifier_class: MODIFIER_CLASS.ADD,
        }),
      });

      expect(IsModifierTypeVisible(modifierType, true)).toBe(true);
      expect(IsModifierTypeVisible(modifierType, false)).toBe(false);
    });
  });
});
