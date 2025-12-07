import { useInView, type UseInViewOptions } from 'motion/react';
import { startTransition, useCallback, useRef, useState } from 'react';

import type { Breakpoint } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { mergeClasses, mergeRefs } from '@/utils';

import { imageClasses } from './classes';
import type { EffectsType } from './styles';
import { ImageImg, ImageOverlay, ImagePlaceholder, ImageRoot } from './styles';

// ----------------------------------------------------------------------

type PredefinedAspectRatio = '2/3' | '3/2' | '4/3' | '3/4' | '6/4' | '4/6' | '16/9' | '9/16' | '21/9' | '9/21' | '1/1';

type AspectRatioType = PredefinedAspectRatio;

export type ImageProps = React.ComponentProps<typeof ImageRoot> &
  Pick<React.ComponentProps<typeof ImageImg>, 'src' | 'alt'> & {
    delayTime?: number;
    onLoad?: () => void;
    effect?: EffectsType;
    visibleByDefault?: boolean;
    disablePlaceholder?: boolean;
    viewportOptions?: UseInViewOptions;
    ratio?: AspectRatioType | Partial<Record<Breakpoint, AspectRatioType>>;
    slotProps?: {
      img?: Omit<React.ComponentProps<typeof ImageImg>, 'src' | 'alt'>;
      overlay?: React.ComponentProps<typeof ImageOverlay>;
      placeholder?: React.ComponentProps<typeof ImagePlaceholder>;
    };
  };

const DEFAULT_DELAY = 0;
const DEFAULT_EFFECT: EffectsType = {
  style: 'blur',
  duration: 300,
  disabled: false,
};

export function Image({
  sx,
  src,
  ref,
  ratio,
  onLoad,
  effect,
  alt = '',
  slotProps,
  className,
  viewportOptions,
  disablePlaceholder,
  visibleByDefault = false,
  delayTime = DEFAULT_DELAY,
  ...other
}: ImageProps) {
  const localRef = useRef<HTMLSpanElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const isInView = useInView(localRef, {
    once: true,
    ...viewportOptions,
  });

  const handleImageLoad = useCallback(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setIsLoaded(true);
        onLoad?.();
      });
    }, delayTime);

    return () => {
      clearTimeout(timer);
    };
  }, [delayTime, onLoad]);

  const finalEffect = {
    ...DEFAULT_EFFECT,
    ...effect,
  };

  const shouldRenderImage = visibleByDefault || isInView;
  const showPlaceholder = !visibleByDefault && !isLoaded && !disablePlaceholder;

  const renderComponents = {
    overlay: () => slotProps?.overlay && <ImageOverlay className={imageClasses.overlay} {...slotProps.overlay} />,
    placeholder: () =>
      showPlaceholder && <ImagePlaceholder className={imageClasses.placeholder} {...slotProps?.placeholder} />,
    image: () => (
      <ImageImg src={src} alt={alt} onLoad={handleImageLoad} className={imageClasses.img} {...slotProps?.img} />
    ),
  };

  return (
    <ImageRoot
      ref={mergeRefs([localRef, ref])}
      effect={visibleByDefault || finalEffect.disabled ? undefined : finalEffect}
      className={mergeClasses([imageClasses.root, className], {
        [imageClasses.state.loaded]: !visibleByDefault && isLoaded,
      })}
      sx={[
        {
          '--aspect-ratio': ratio,
          ...(!!ratio && { width: 1 }),
        },
        ...spreadSx(sx),
      ]}
      {...other}
    >
      {renderComponents.overlay()}
      {renderComponents.placeholder()}
      {shouldRenderImage && renderComponents.image()}
    </ImageRoot>
  );
}
