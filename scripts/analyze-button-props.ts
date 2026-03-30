import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '..');

interface PropUsage {
    prop: string;
    value: string;
    type: 'static' | 'dynamic' | 'handler' | 'spread' | 'boolean-shorthand';
}

interface ButtonUsage {
    file: string;
    line: number;
    props: PropUsage[];
}

const EVENT_HANDLER_PROPS = new Set([
    'onPress', 'onLongPress', 'onPressIn', 'onPressOut',
    'onMouseDown', 'onLayout',
]);

function isEventHandlerProp(name: string): boolean {
    return EVENT_HANDLER_PROPS.has(name) || name.startsWith('on');
}

function resolveSpreadObject(
    expr: ts.Expression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker | undefined,
): PropUsage[] {
    const results: PropUsage[] = [];

    // If it's an identifier, try to find its declaration
    if (ts.isIdentifier(expr)) {
        const symbol = checker?.getSymbolAtLocation(expr);
        if (symbol) {
            const declarations = symbol.getDeclarations();
            if (declarations && declarations.length > 0) {
                for (const decl of declarations) {
                    if (ts.isVariableDeclaration(decl) && decl.initializer) {
                        if (ts.isObjectLiteralExpression(decl.initializer)) {
                            return extractPropsFromObjectLiteral(decl.initializer, sourceFile, checker);
                        }
                    }
                    // Check for parameter destructuring or function params
                    if (ts.isParameter(decl) || ts.isBindingElement(decl)) {
                        // This is a function parameter - values are dynamic
                        const type = checker?.getTypeAtLocation(decl);
                        if (type) {
                            const properties = type.getProperties();
                            for (const prop of properties) {
                                results.push({
                                    prop: prop.getName(),
                                    value: 'dynamic (from spread of parameter)',
                                    type: 'dynamic',
                                });
                            }
                            return results;
                        }
                    }
                }
            }
        }
        // Could not resolve - mark as spread with unknown contents
        results.push({
            prop: `{...${expr.getText(sourceFile)}}`,
            value: 'unresolved spread',
            type: 'spread',
        });
        return results;
    }

    if (ts.isObjectLiteralExpression(expr)) {
        return extractPropsFromObjectLiteral(expr, sourceFile, checker);
    }

    // For other expressions (function calls, conditional, etc.)
    results.push({
        prop: `{...${expr.getText(sourceFile).substring(0, 80)}}`,
        value: 'dynamic spread expression',
        type: 'spread',
    });
    return results;
}

function extractPropsFromObjectLiteral(
    obj: ts.ObjectLiteralExpression,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker | undefined,
): PropUsage[] {
    const results: PropUsage[] = [];
    for (const prop of obj.properties) {
        if (ts.isPropertyAssignment(prop) && prop.name) {
            const name = prop.name.getText(sourceFile);
            const value = classifyValue(prop.initializer, sourceFile, name);
            results.push(value);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
            const name = prop.name.getText(sourceFile);
            results.push({
                prop: name,
                value: 'dynamic (shorthand)',
                type: isEventHandlerProp(name) ? 'handler' : 'dynamic',
            });
        } else if (ts.isSpreadAssignment(prop)) {
            results.push(...resolveSpreadObject(prop.expression, sourceFile, checker));
        }
    }
    return results;
}

function classifyValue(
    initializer: ts.Expression,
    sourceFile: ts.SourceFile,
    propName: string,
): PropUsage {
    if (isEventHandlerProp(propName)) {
        return { prop: propName, value: 'handler', type: 'handler' };
    }

    // String literals
    if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
        return { prop: propName, value: `"${initializer.text}"`, type: 'static' };
    }

    // Numeric literals
    if (ts.isNumericLiteral(initializer)) {
        return { prop: propName, value: initializer.text, type: 'static' };
    }

    // Boolean: true/false
    if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
        return { prop: propName, value: 'true', type: 'static' };
    }
    if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return { prop: propName, value: 'false', type: 'static' };
    }

    // undefined / null
    if (initializer.kind === ts.SyntaxKind.UndefinedKeyword) {
        return { prop: propName, value: 'undefined', type: 'static' };
    }
    if (initializer.kind === ts.SyntaxKind.NullKeyword) {
        return { prop: propName, value: 'null', type: 'static' };
    }

    // JSX expression with simple values
    const text = initializer.getText(sourceFile).trim();

    // Property access like CONST.SOMETHING or styles.something
    if (ts.isPropertyAccessExpression(initializer)) {
        return { prop: propName, value: text, type: 'static' };
    }

    // Template literals are dynamic
    if (ts.isTemplateExpression(initializer)) {
        return { prop: propName, value: `dynamic (template: ${text.substring(0, 60)})`, type: 'dynamic' };
    }

    // Conditional / ternary expressions
    if (ts.isConditionalExpression(initializer)) {
        return { prop: propName, value: `dynamic (conditional)`, type: 'dynamic' };
    }

    // Binary expressions (&&, ||, ??)
    if (ts.isBinaryExpression(initializer)) {
        return { prop: propName, value: `dynamic (binary expression)`, type: 'dynamic' };
    }

    // Call expressions
    if (ts.isCallExpression(initializer)) {
        const callee = initializer.expression.getText(sourceFile);
        return { prop: propName, value: `dynamic (call: ${callee})`, type: 'dynamic' };
    }

    // Arrow functions / function expressions
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return { prop: propName, value: 'handler', type: 'handler' };
    }

    // Array literal (e.g., style arrays)
    if (ts.isArrayLiteralExpression(initializer)) {
        return { prop: propName, value: `[${text.substring(0, 80)}]`, type: 'static' };
    }

    // Object literal
    if (ts.isObjectLiteralExpression(initializer)) {
        return { prop: propName, value: `{${text.substring(0, 80)}}`, type: 'static' };
    }

    // Identifier reference (variable)
    if (ts.isIdentifier(initializer)) {
        return { prop: propName, value: `dynamic (variable: ${text})`, type: 'dynamic' };
    }

    // Prefix unary (e.g., !something)
    if (ts.isPrefixUnaryExpression(initializer)) {
        return { prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic' };
    }

    // Non-null assertion
    if (ts.isNonNullExpression(initializer)) {
        return { prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic' };
    }

    // Element access (e.g., obj[key])
    if (ts.isElementAccessExpression(initializer)) {
        return { prop: propName, value: `dynamic (element access: ${text.substring(0, 60)})`, type: 'dynamic' };
    }

    // As expression (type assertion)
    if (ts.isAsExpression(initializer)) {
        return classifyValue((initializer as ts.AsExpression).expression, sourceFile, propName);
    }

    // Parenthesized
    if (ts.isParenthesizedExpression(initializer)) {
        return classifyValue(initializer.expression, sourceFile, propName);
    }

    return { prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic' };
}

function extractJsxAttributeValue(
    attr: ts.JsxAttribute,
    sourceFile: ts.SourceFile,
): PropUsage {
    const propName = attr.name.getText(sourceFile);

    // Boolean shorthand: <Button success />
    if (!attr.initializer) {
        return { prop: propName, value: 'true', type: 'boolean-shorthand' };
    }

    // String literal: <Button text="hello" />
    if (ts.isStringLiteral(attr.initializer)) {
        if (isEventHandlerProp(propName)) {
            return { prop: propName, value: 'handler', type: 'handler' };
        }
        return { prop: propName, value: `"${attr.initializer.text}"`, type: 'static' };
    }

    // JSX expression: <Button text={something} />
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
        return classifyValue(attr.initializer.expression, sourceFile, propName);
    }

    return { prop: propName, value: 'unknown', type: 'dynamic' };
}

function findButtonUsagesInFile(
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker | undefined,
    filePath: string,
): ButtonUsage[] {
    const usages: ButtonUsage[] = [];

    function isButtonImport(node: ts.Node): boolean {
        // Check if the file imports Button from @components/Button
        const importDecls = sourceFile.statements.filter(ts.isImportDeclaration);
        for (const imp of importDecls) {
            const moduleSpec = imp.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpec)) {
                const modulePath = moduleSpec.text;
                if (
                    modulePath === '@components/Button' ||
                    modulePath.endsWith('components/Button') ||
                    modulePath.endsWith('components/Button/index')
                ) {
                    if (imp.importClause?.name) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Find the local name of the Button import
    let buttonLocalName: string | undefined;
    for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
            const modulePath = stmt.moduleSpecifier.text;
            if (
                modulePath === '@components/Button' ||
                modulePath.endsWith('components/Button') ||
                modulePath.endsWith('components/Button/index')
            ) {
                if (stmt.importClause?.name) {
                    buttonLocalName = stmt.importClause.name.text;
                }
            }
        }
    }

    if (!buttonLocalName) return usages;

    function visit(node: ts.Node) {
        // Check for JSX opening elements and self-closing elements
        if (
            (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
            ts.isIdentifier(node.tagName) &&
            node.tagName.text === buttonLocalName
        ) {
            const props: PropUsage[] = [];
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

            for (const attr of node.attributes.properties) {
                if (ts.isJsxAttribute(attr)) {
                    props.push(extractJsxAttributeValue(attr, sourceFile));
                } else if (ts.isJsxSpreadAttribute(attr)) {
                    props.push(...resolveSpreadObject(attr.expression, sourceFile, checker));
                }
            }

            usages.push({
                file: path.relative(PROJECT_ROOT, filePath),
                line: line + 1,
                props,
            });
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return usages;
}

function main() {
    const tsConfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        PROJECT_ROOT,
    );

    // Find all tsx/ts files that might use Button
    const allFiles: string[] = [];

    function walkDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
                walkDir(fullPath);
            } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
                allFiles.push(fullPath);
            }
        }
    }

    walkDir(path.join(PROJECT_ROOT, 'src'));
    walkDir(path.join(PROJECT_ROOT, 'tests'));

    // Pre-filter files that import Button
    const buttonImportPattern = /from\s+['"]@components\/Button['"]/;
    const relativeImportPattern = /from\s+['"]\.\.?\/.*components\/Button['"]/;
    const relevantFiles = allFiles.filter(f => {
        const content = fs.readFileSync(f, 'utf8');
        return buttonImportPattern.test(content) || relativeImportPattern.test(content);
    });

    console.error(`Found ${relevantFiles.length} files importing Button`);

    // Create a program with just the relevant files for type checking
    const program = ts.createProgram(relevantFiles, {
        ...parsedConfig.options,
        noEmit: true,
    });
    const checker = program.getTypeChecker();

    const allUsages: ButtonUsage[] = [];

    for (const filePath of relevantFiles) {
        const sourceFile = program.getSourceFile(filePath);
        if (!sourceFile) continue;

        const usages = findButtonUsagesInFile(sourceFile, checker, filePath);
        allUsages.push(...usages);
    }

    // Output results
    const output = {
        totalUsages: allUsages.length,
        totalFiles: new Set(allUsages.map(u => u.file)).size,
        usages: allUsages,
    };

    // Also compute prop statistics
    const propCounts: Record<string, number> = {};
    const propValueCounts: Record<string, Record<string, number>> = {};

    for (const usage of allUsages) {
        for (const prop of usage.props) {
            propCounts[prop.prop] = (propCounts[prop.prop] || 0) + 1;
            if (!propValueCounts[prop.prop]) {
                propValueCounts[prop.prop] = {};
            }
            const valueKey = prop.type === 'handler' ? 'handler' : prop.value;
            propValueCounts[prop.prop][valueKey] = (propValueCounts[prop.prop][valueKey] || 0) + 1;
        }
    }

    // Sort props by usage count
    const sortedProps = Object.entries(propCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([prop, count]) => ({
            prop,
            count,
            values: Object.entries(propValueCounts[prop])
                .sort(([, a], [, b]) => b - a)
                .map(([value, count]) => ({ value, count })),
        }));

    const finalOutput = {
        summary: {
            totalButtonUsages: allUsages.length,
            totalFiles: new Set(allUsages.map(u => u.file)).size,
        },
        propStatistics: sortedProps,
        detailedUsages: allUsages,
    };

    const outputPath = path.join(PROJECT_ROOT, 'button-props-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.error(`Analysis written to ${outputPath}`);

    // Also print a readable summary to stdout
    console.log('=== BUTTON COMPONENT PROP USAGE ANALYSIS ===\n');
    console.log(`Total Button usages: ${allUsages.length}`);
    console.log(`Total files with Button: ${new Set(allUsages.map(u => u.file)).size}\n`);
    console.log('=== PROP STATISTICS (sorted by frequency) ===\n');

    for (const { prop, count, values } of sortedProps) {
        console.log(`${prop}: ${count} usages`);
        for (const { value, count: vCount } of values) {
            console.log(`  ${value}: ${vCount}`);
        }
        console.log();
    }
}

main();
