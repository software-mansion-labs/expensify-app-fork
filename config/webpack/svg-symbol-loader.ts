import path from 'path';
import type {LoaderContext} from 'webpack';

const SIZE_THRESHOLD = 1024; // 1KB

/**
 * Webpack loader that converts SVG imports to symbol IDs or URLs
 * - Small SVGs (< 1KB): Returns symbol ID for use with <use href="#id" />
 * - Large SVGs (≥ 1KB): Returns URL to asset file
 *
 * Example:
 *   import SmallIcon from './small.svg'  // Returns: 'small-icon'
 *   import LargeIcon from './large.svg'  // Returns: '/assets/svg/large-icon.svg'
 */
function svgSymbolLoader(this: LoaderContext<unknown>, source: string | Buffer) {
    const filePath = this.resourcePath;
    const projectRoot = this.rootContext;

    // Generate relative path and symbol ID
    const relativePath = path.relative(projectRoot, filePath);
    const symbolId = generateSymbolId(relativePath);

    // Check file size to determine if it should be inlined or external
    const fileSize = Buffer.byteLength(source, 'utf-8');

    if (fileSize >= SIZE_THRESHOLD) {
        // Large SVG - return URL as ImageSourcePropType object
        const svgUrl = `/assets/svg/${symbolId}.svg`;
        return `module.exports = {uri: '${svgUrl}'};`;
    } else {
        // Small SVG - return symbol ID as ImageSourcePropType object
        // Using object instead of string so Avatar component uses Icon instead of Image
        return `module.exports = {uri: '${symbolId}'};`;
    }
}

/**
 * Generate a unique symbol ID from file path
 * Must match the logic in InlineSvgSymbolsPlugin for consistency
 */
function generateSymbolId(filePath: string): string {
    const fileName = path.basename(filePath, '.svg');
    const dirPath = path
        .dirname(filePath)
        .replace(/[/\\]/g, '-')
        .replace(/^assets-images-?/, '');

    const id = dirPath ? `${dirPath}-${fileName}` : fileName;
    return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

export default svgSymbolLoader;
