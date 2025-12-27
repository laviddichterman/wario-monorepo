/**
 * Product customizer module for wario-ux-shared.
 *
 * Provides hooks and components for editing product modifier selections.
 *
 * Note: useHasSelectableModifiers was moved to '@wcp/wario-ux-shared/query'
 * to reduce coupling between cart and customizer modules.
 */
export * from './components';
export * from './context';
export * from './hooks/useModifierEditor';
export * from './hooks/useOrderModifierEditor';
