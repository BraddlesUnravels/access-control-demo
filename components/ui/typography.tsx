import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  ReactNode,
} from 'react';

type Variant =
  | 'display'
  | 'page-title'
  | 'section-title'
  | 'component-title'
  | 'body-large'
  | 'body'
  | 'body-small'
  | 'label'
  | 'action'
  | 'caption';

type TypographyOwnProps<T extends ElementType> = {
  variant?: Variant;
  as?: T;
  children?: ReactNode;
  className?: string;
  ref?: ComponentPropsWithRef<T>['ref'];
};

type TypographyProps<T extends ElementType = ElementType> =
  TypographyOwnProps<T> &
    Omit<ComponentPropsWithoutRef<T>, keyof TypographyOwnProps<T>>;

const variantStyles: Record<Variant, string> = {
  display: 'text-display',
  'page-title': 'text-page-title',
  'section-title': 'text-section-title',
  'component-title': 'text-component-title',
  'body-large': 'text-body-large',
  body: 'text-body',
  'body-small': 'text-body-small',
  label: 'text-label',
  action: 'text-action',
  caption: 'text-caption',
};

const defaultTag: Record<Variant, ElementType> = {
  display: 'h1',
  'page-title': 'h1',
  'section-title': 'h2',
  'component-title': 'h3',
  'body-large': 'p',
  body: 'p',
  'body-small': 'p',
  label: 'span',
  action: 'span',
  caption: 'span',
};

export const Typography = <T extends ElementType = ElementType>({
  variant = 'body',
  as,
  children,
  className = '',
  ref,
  ...rest
}: TypographyProps<T>) => {
  const Component = as ?? defaultTag[variant];

  return (
    <Component
      {...rest}
      ref={ref}
      className={`${variantStyles[variant]} ${className}`.trim()}
    >
      {children}
    </Component>
  );
};
