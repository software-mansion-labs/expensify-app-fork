import fs from 'fs';
import path from 'path';
import type {Compiler} from 'webpack';

interface SvgModule {
    path: string;
    id: string;
}

const SIZE_THRESHOLD = 1024; // 1KB

/**
 * Webpack plugin that collects all imported SVG files
 * - Small SVGs (< 1KB) are inlined as symbols in HTML
 * - Large SVGs (≥ 1KB) are copied to dist/assets/ as separate files
 */
class InlineSvgSymbolsPlugin {
    private svgModules: Map<string, string> = new Map();
    private svgSizeMap: Map<string, number> = new Map();

    apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap('InlineSvgSymbolsPlugin', (compilation) => {
            // Hook into the compilation to collect SVG modules
            compilation.hooks.succeedModule.tap('InlineSvgSymbolsPlugin', (module) => {
                // Check if this is an SVG file that was imported
                const resource = (module as any).resource;
                if (resource && resource.endsWith('.svg') && !resource.includes('node_modules')) {
                    const svgContent = fs.readFileSync(resource, 'utf-8');
                    const relativePath = path.relative(compiler.context, resource);
                    const fileSize = Buffer.byteLength(svgContent, 'utf-8');

                    this.svgModules.set(relativePath, svgContent);
                    this.svgSizeMap.set(relativePath, fileSize);

                    // For large SVGs, emit them as separate assets
                    if (fileSize >= SIZE_THRESHOLD) {
                        const symbolId = this.generateSymbolId(relativePath);
                        const fileName = `assets/svg/${symbolId}.svg`;

                        // Emit the SVG file as an asset
                        compilation.emitAsset(fileName, {
                            source: () => svgContent,
                            size: () => fileSize,
                        } as any);
                    }
                }
            });

            // Hook into HtmlWebpackPlugin to inject SVG symbols
            const HtmlWebpackPlugin = require('html-webpack-plugin');
            if (HtmlWebpackPlugin.getHooks) {
                const hooks = HtmlWebpackPlugin.getHooks(compilation);

                hooks.beforeEmit.tapAsync('InlineSvgSymbolsPlugin', (data: any, cb: any) => {
                    const svgSymbols = this.generateSvgSymbols();

                    // Inject SVG symbols right after opening <body> tag
                    data.html = data.html.replace('<body>', `<body>\n${svgSymbols}\n`);

                    cb(null, data);
                });
            }
        });
    }

    /**
     * Convert collected SVG files to symbol definitions
     * Only small SVGs (< 1KB) are inlined
     */
    private generateSvgSymbols(): string {
        const symbols: string[] = [];

        this.svgModules.forEach((content, filePath) => {
            const fileSize = this.svgSizeMap.get(filePath) || 0;

            // Only inline small SVGs
            if (fileSize < SIZE_THRESHOLD) {
                const symbolId = this.generateSymbolId(filePath);
                const symbolContent = this.svgToSymbol(content, symbolId);
                if (symbolContent) {
                    symbols.push(symbolContent);
                }
            }
        });

        if (symbols.length === 0) {
            return '';
        }

        return `<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg">
  <defs>
${symbols.join('\n')}
  </defs>
</svg>`;
    }

    /**
     * Generate a unique symbol ID from file path
     */
    private generateSymbolId(filePath: string): string {
        // Convert file path to a valid ID: assets/images/icon.svg -> icon-svg
        const fileName = path.basename(filePath, '.svg');
        const dirPath = path
            .dirname(filePath)
            .replace(/[/\\]/g, '-')
            .replace(/^assets-images-?/, '');
        const id = dirPath ? `${dirPath}-${fileName}` : fileName;
        return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    }

    /**
     * Convert SVG content to symbol element
     */
    private svgToSymbol(svgContent: string, symbolId: string): string | null {
        try {
            // Extract viewBox from SVG
            const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
            const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

            // Extract content between <svg> tags
            const contentMatch = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
            if (!contentMatch) {
                return null;
            }

            let innerContent = contentMatch[1].trim();

            // Extract CSS classes and convert to inline styles BEFORE removing <style>
            const styleMatch = innerContent.match(/<style>([\s\S]*?)<\/style>/);
            if (styleMatch) {
                const cssContent = styleMatch[1];
                // Parse CSS rules
                const rules = cssContent.match(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g);
                if (rules) {
                    rules.forEach((rule) => {
                        const classMatch = rule.match(/\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/);
                        if (classMatch) {
                            const className = classMatch[1];
                            const styles = classMatch[2].trim();
                            // Replace class references with inline styles
                            innerContent = innerContent.replace(new RegExp(`class="${className}"`, 'g'), `style="${styles}"`);
                        }
                    });
                }
            }

            // Remove <style> tags (but keep other <defs> content like clipPath, gradients, etc.)
            innerContent = innerContent.replace(/<style>[\s\S]*?<\/style>/g, '');

            // Remove empty <defs></defs> tags if <style> was the only content
            innerContent = innerContent.replace(/<defs>\s*<\/defs>/g, '');

            return `    <symbol id="${symbolId}" viewBox="${viewBox}">
${innerContent
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')}
    </symbol>`;
        } catch (error) {
            console.warn(`Failed to process SVG: ${symbolId}`, error);
            return null;
        }
    }
}

export default InlineSvgSymbolsPlugin;
