"use client";

import * as React from "react";

function cx(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="avatar"
      className={cx(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

function AvatarImage({
  className,
  src,
  alt,
  onLoadingStatusChange,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}) {
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');

  React.useEffect(() => {
    onLoadingStatusChange?.(status);
  }, [status, onLoadingStatusChange]);

  if (!src || status === 'error') {
    return null;
  }

  return (
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      className={cx("aspect-square size-full", className)}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cx(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
