import type { SxProps, Theme } from '@mui/material/styles';

type InferSystemStyleObject<S, T = object> =
  S extends ReadonlyArray<unknown> ? never : S extends (theme: T) => unknown ? never : S;

export type SystemStyleObject<T extends object> = InferSystemStyleObject<SxProps<T>, T>;

export type SxArray<TTheme extends Theme = Theme> = ReadonlyArray<
  SystemStyleObject<TTheme> | ((theme: TTheme) => SystemStyleObject<TTheme>)
>;

export type InferSlotsFromSlotProps<TSlotProps extends object> = {
  [key in keyof TSlotProps]: React.FC<Exclude<TSlotProps[key], undefined>>;
};

/**
 * Extracts the object type from MUI slot props which can be:
 * - An object
 * - A function that returns an object
 * - null or undefined
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtractSlotPropsObject<T> = T extends (ownerState: any) => infer R ? R : T extends object ? T : never;

/**
 * Helper to safely spread slot props that can be null, undefined, or a function.
 * Returns an empty object if the props are null, undefined, or a function.
 * Otherwise returns the props object.
 *
 * MUI slot props can be functions with specific ownerState types (e.g., BaseTextFieldProps).
 * We use `any` here to accept all possible ownerState types since we filter out functions at runtime.
 *
 * @example
 * // In MUI components with slotProps
 * slotProps={{
 *   textField: {
 *     ...normalizeSlotProps(slotProps?.textField),
 *     error: !!error,
 *   }
 * }}
 */
export const normalizeSlotProps = <T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: T | ((ownerState: any) => T) | null | undefined,
): ExtractSlotPropsObject<T> | Record<string, never> => {
  return props === null || props === undefined || typeof props === 'function'
    ? ({} as Record<string, never>)
    : (props as ExtractSlotPropsObject<T>);
};

export const isSxArray = <TTheme extends Theme = Theme>(sx: SxProps<TTheme> | undefined): sx is SxArray<TTheme> => {
  return Array.isArray(sx);
};

/**
 * You cannot spread `sx` directly because `SxProps` (typeof sx) can be an array.
 * https://mui.com/system/getting-started/the-sx-prop/#passing-the-sx-prop
 * tracked via https://github.com/mui/material-ui/issues/37730
 */
export const spreadSx = <TTheme extends Theme = Theme>(sx: SxProps<TTheme> | undefined): SxArray<TTheme> => {
  if (sx == null) {
    return [];
  }

  if (isSxArray(sx)) {
    return sx;
  }

  return [sx] as SxArray<TTheme>;
};
