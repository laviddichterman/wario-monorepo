import type { SxProps, Theme } from '@mui/material/styles';

type InferSystemStyleObject<S, T = object> =
  S extends ReadonlyArray<unknown> ? never
  : S extends (theme: T) => unknown ? never
  : S;

export type SystemStyleObject<T extends object> = InferSystemStyleObject<
  SxProps<T>,
  T
>;

export type SxArray<TTheme extends Theme = Theme> = ReadonlyArray<
  SystemStyleObject<TTheme> | ((theme: TTheme) => SystemStyleObject<TTheme>)
>;

export type InferSlotsFromSlotProps<TSlotProps extends object> = {
  [key in keyof TSlotProps]: React.FC<Exclude<TSlotProps[key], undefined>>;
};

export const isSxArray = <TTheme extends Theme = Theme>(
  sx: SxProps<TTheme> | undefined,
): sx is SxArray<TTheme> => {
  return Array.isArray(sx);
};

/**
 * You cannot spread `sx` directly because `SxProps` (typeof sx) can be an array.
 * https://mui.com/system/getting-started/the-sx-prop/#passing-the-sx-prop
 * tracked via https://github.com/mui/material-ui/issues/37730
 */
export const spreadSx = <TTheme extends Theme = Theme>(
  sx: SxProps<TTheme> | undefined,
): SxArray<TTheme> => {
  if (sx == null) {
    return [];
  }

  if (isSxArray(sx)) {
    return sx;
  }

  return [sx] as SxArray<TTheme>;
};