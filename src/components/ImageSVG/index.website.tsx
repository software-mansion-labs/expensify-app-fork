import React from 'react';
import type ImageSVGProps from './types';

/**
 * Web-specific version of ImageSVG that handles both inline symbols and external SVG files
 * - Small SVGs (< 1KB): Use symbol ID with <use href="#id" />
 * - Large SVGs (≥ 1KB): Load as external file via <img> tag
 *
 * Note: fill, stroke work with inline symbols but not with <img> tags
 */
function ImageSVG({src, width = '100%', height = '100%', fill, style, pointerEvents, preserveAspectRatio, testID}: ImageSVGProps) {
    // Extract URI from source - webpack loader returns {uri: string} object
    const srcString = typeof src === 'string' ? src : typeof src === 'object' && src && 'uri' in src ? String(src.uri) : '';

    // Determine if src is a URL (large SVG) or symbol ID (small SVG)
    const isExternalUrl = srcString.startsWith('/');

    if (!src || !srcString) {
        return null;
    }

    // Large SVG - render as external image
    if (isExternalUrl) {
        return (
            <img
                src={srcString}
                width={width}
                height={height}
                style={style as React.CSSProperties}
                alt=""
                data-testid={testID}
            />
        );
    }

    // Small SVG - render using inline symbol
    // Note: viewBox is inherited from the <symbol> element
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            style={style as React.CSSProperties}
            pointerEvents={pointerEvents}
            preserveAspectRatio={preserveAspectRatio}
            data-testid={testID}
        >
            <use
                href={`#${srcString}`}
                {...(fill ? {fill} : {})}
            />
        </svg>
    );
}

ImageSVG.displayName = 'ImageSVG';
export default ImageSVG;
