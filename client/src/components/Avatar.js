import React, { useState, useEffect } from 'react';

/**
 * Reusable Avatar component for GoogleMe.
 * When a photo URL is provided, renders a smooth 3D hover-to-flip avatar:
 * - Front face: profile photo with object-fit: cover
 * - Back face: letter 'A' with Google styling
 * If no photo is configured (or image fails to load), renders the original
 * static letter 'A' circular design.
 */
export default function Avatar({
  url,
  name = 'Anurag',
  alt,
  size = 'sm',
  className = '',
  ringClassName = '',
  bgClassName = 'bg-[#1a73e8]',
  textClassName = '',
  letter,
  as = 'div',
  onClick,
  ariaLabel,
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  const sizeClass = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-16 h-16' : size;
  const textClass = textClassName || (size === 'lg' ? 'text-2xl font-semibold' : 'text-sm font-medium');
  const displayLetter = letter || name?.charAt(0) || 'A';
  const effectiveAlt = alt || `${name}'s profile photo`;
  const defaultAriaLabel = ariaLabel || (name ? `${name}'s account` : 'Account');

  const hasPhoto = Boolean(url && typeof url === 'string' && url.trim() && !imgError);

  if (!hasPhoto) {
    return React.createElement(
      as === 'button' ? 'button' : 'div',
      {
        type: as === 'button' ? 'button' : undefined,
        onClick,
        'aria-label': as === 'button' ? defaultAriaLabel : undefined,
        className: `rounded-full flex items-center justify-center text-white select-none ${bgClassName} ${sizeClass} ${textClass} ${ringClassName} ${className}`.trim(),
      },
      displayLetter
    );
  }

  const frontFace = React.createElement(
    'div',
    { className: 'avatar-flip-front' },
    React.createElement('img', {
      src: url.trim(),
      alt: effectiveAlt,
      className: 'w-full h-full object-cover',
      onError: () => setImgError(true),
    })
  );

  const backFace = React.createElement(
    'div',
    {
      className: `avatar-flip-back flex items-center justify-center text-white select-none ${bgClassName} ${textClass}`,
      'aria-hidden': 'true',
    },
    React.createElement('span', null, displayLetter)
  );

  const innerContent = React.createElement(
    'div',
    { className: 'avatar-flip-inner' },
    frontFace,
    backFace
  );

  return React.createElement(
    as === 'button' ? 'button' : 'div',
    {
      type: as === 'button' ? 'button' : undefined,
      onClick,
      'aria-label': as === 'button' ? defaultAriaLabel : undefined,
      className: `avatar-flip-container relative rounded-full ${sizeClass} ${ringClassName} ${className}`.trim(),
    },
    innerContent
  );
}
