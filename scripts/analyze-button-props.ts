import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

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

const EVENT_HANDLER_PROPS = new Set(['onPress', 'onLongPress', 'onPressIn', 'onPressOut', 'onMouseDown', 'onLayout']);

function isEventHandlerProp(name: string): boolean {
    return EVENT_HANDLER_PROPS.has(name) || name.startsWith('on');
}

const BUTTON_DIR = path.join(PROJECT_ROOT, 'src', 'components', 'Button');

function isButtonModulePath(modulePath: string, filePath: string): boolean {
    if (modulePath === '@components/Button' || modulePath.endsWith('components/Button') || modulePath.endsWith('components/Button/index')) {
        return true;
    }
    if (modulePath.startsWith('.')) {
        const resolved = path.resolve(path.dirname(filePath), modulePath);
        return resolved === BUTTON_DIR || resolved === path.join(BUTTON_DIR, 'index');
    }
    return false;
}

function resolveSpreadObject(expr: ts.Expression, sourceFile: ts.SourceFile, checker: ts.TypeChecker | undefined): PropUsage[] {
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

function extractPropsFromObjectLiteral(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile, checker: ts.TypeChecker | undefined): PropUsage[] {
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

function classifyValue(initializer: ts.Expression, sourceFile: ts.SourceFile, propName: string): PropUsage {
    if (isEventHandlerProp(propName)) {
        return {prop: propName, value: 'handler', type: 'handler'};
    }

    // String literals
    if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
        return {prop: propName, value: `"${initializer.text}"`, type: 'static'};
    }

    // Numeric literals
    if (ts.isNumericLiteral(initializer)) {
        return {prop: propName, value: initializer.text, type: 'static'};
    }

    // Boolean: true/false
    if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
        return {prop: propName, value: 'true', type: 'static'};
    }
    if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return {prop: propName, value: 'false', type: 'static'};
    }

    // undefined / null
    if (initializer.kind === ts.SyntaxKind.UndefinedKeyword) {
        return {prop: propName, value: 'undefined', type: 'static'};
    }
    if (initializer.kind === ts.SyntaxKind.NullKeyword) {
        return {prop: propName, value: 'null', type: 'static'};
    }

    // JSX expression with simple values
    const text = initializer.getText(sourceFile).trim();

    // Property access like CONST.SOMETHING or styles.something
    if (ts.isPropertyAccessExpression(initializer)) {
        return {prop: propName, value: text, type: 'static'};
    }

    // Template literals are dynamic
    if (ts.isTemplateExpression(initializer)) {
        return {prop: propName, value: `dynamic (template: ${text.substring(0, 60)})`, type: 'dynamic'};
    }

    // Conditional / ternary expressions
    if (ts.isConditionalExpression(initializer)) {
        return {prop: propName, value: `dynamic (conditional)`, type: 'dynamic'};
    }

    // Binary expressions (&&, ||, ??)
    if (ts.isBinaryExpression(initializer)) {
        return {prop: propName, value: `dynamic (binary expression)`, type: 'dynamic'};
    }

    // Call expressions
    if (ts.isCallExpression(initializer)) {
        const callee = initializer.expression.getText(sourceFile);
        return {prop: propName, value: `dynamic (call: ${callee})`, type: 'dynamic'};
    }

    // Arrow functions / function expressions
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return {prop: propName, value: 'handler', type: 'handler'};
    }

    // Array literal (e.g., style arrays)
    if (ts.isArrayLiteralExpression(initializer)) {
        return {prop: propName, value: `[${text.substring(0, 80)}]`, type: 'static'};
    }

    // Object literal
    if (ts.isObjectLiteralExpression(initializer)) {
        return {prop: propName, value: `{${text.substring(0, 80)}}`, type: 'static'};
    }

    // Identifier reference (variable)
    if (ts.isIdentifier(initializer)) {
        return {prop: propName, value: `dynamic (variable: ${text})`, type: 'dynamic'};
    }

    // Prefix unary (e.g., !something)
    if (ts.isPrefixUnaryExpression(initializer)) {
        return {prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic'};
    }

    // Non-null assertion
    if (ts.isNonNullExpression(initializer)) {
        return {prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic'};
    }

    // Element access (e.g., obj[key])
    if (ts.isElementAccessExpression(initializer)) {
        return {prop: propName, value: `dynamic (element access: ${text.substring(0, 60)})`, type: 'dynamic'};
    }

    // As expression (type assertion)
    if (ts.isAsExpression(initializer)) {
        return classifyValue((initializer as ts.AsExpression).expression, sourceFile, propName);
    }

    // Parenthesized
    if (ts.isParenthesizedExpression(initializer)) {
        return classifyValue(initializer.expression, sourceFile, propName);
    }

    return {prop: propName, value: `dynamic (${text.substring(0, 60)})`, type: 'dynamic'};
}

function extractJsxAttributeValue(attr: ts.JsxAttribute, sourceFile: ts.SourceFile): PropUsage {
    const propName = attr.name.getText(sourceFile);

    // Boolean shorthand: <Button success />
    if (!attr.initializer) {
        return {prop: propName, value: 'true', type: 'boolean-shorthand'};
    }

    // String literal: <Button text="hello" />
    if (ts.isStringLiteral(attr.initializer)) {
        if (isEventHandlerProp(propName)) {
            return {prop: propName, value: 'handler', type: 'handler'};
        }
        return {prop: propName, value: `"${attr.initializer.text}"`, type: 'static'};
    }

    // JSX expression: <Button text={something} />
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
        return classifyValue(attr.initializer.expression, sourceFile, propName);
    }

    return {prop: propName, value: 'unknown', type: 'dynamic'};
}

function findButtonUsagesInFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker | undefined, filePath: string): ButtonUsage[] {
    const usages: ButtonUsage[] = [];

    // Find the local name of the Button import
    let buttonLocalName: string | undefined;
    for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
            if (isButtonModulePath(stmt.moduleSpecifier.text, filePath)) {
                if (stmt.importClause?.name) {
                    buttonLocalName = stmt.importClause.name.text;
                }
            }
        }
    }

    if (!buttonLocalName) return usages;

    function visit(node: ts.Node) {
        // Check for JSX opening elements and self-closing elements
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === buttonLocalName) {
            const props: PropUsage[] = [];
            const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

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
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, PROJECT_ROOT);

    // Find all tsx/ts files that might use Button
    const allFiles: string[] = [];

    function walkDir(dir: string) {
        const entries = fs.readdirSync(dir, {withFileTypes: true});
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
    const simpleRelativePattern = /from\s+['"]\.\.?\/Button['"]/;
    const relevantFiles = allFiles.filter((f) => {
        const content = fs.readFileSync(f, 'utf8');
        return buttonImportPattern.test(content) || relativeImportPattern.test(content) || simpleRelativePattern.test(content);
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

    // === PHASE 2: Wrapper Component Analysis ===
    // Only include wrappers that forward at least one prop to Button.
    // Props are remapped from wrapper param names to Button prop names.
    console.error('Phase 2: Analyzing wrapper components...');

    interface PropMapping {
        buttonProp: string;
        wrapperParam: string;
    }

    interface WrapperUsageSite {
        file: string;
        line: number;
        props: PropUsage[];
    }

    interface WrapperInfo {
        name: string;
        file: string;
        directButtonUsages: number;
        propForwarding: PropMapping[];
        wrapperUsageCount: number;
        wrapperUsages: WrapperUsageSite[];
    }

    function findDefaultExportName(sf: ts.SourceFile): string | undefined {
        for (const stmt of sf.statements) {
            if (ts.isFunctionDeclaration(stmt)) {
                const hasExport = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
                const hasDefault = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
                if (hasExport && hasDefault && stmt.name) {
                    return stmt.name.text;
                }
            }
            if (ts.isExportAssignment(stmt) && !stmt.isExportEquals && ts.isIdentifier(stmt.expression)) {
                return stmt.expression.text;
            }
        }
        return undefined;
    }

    function getComponentParams(sf: ts.SourceFile): Set<string> | undefined {
        for (const stmt of sf.statements) {
            if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.parameters.length > 0) {
                const firstParam = stmt.parameters[0];
                if (ts.isObjectBindingPattern(firstParam.name)) {
                    const params = new Set<string>();
                    for (const elem of firstParam.name.elements) {
                        if (ts.isIdentifier(elem.name)) {
                            params.add(elem.name.text);
                        }
                    }
                    return params;
                }
            }
            if (ts.isVariableStatement(stmt)) {
                for (const decl of stmt.declarationList.declarations) {
                    if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
                        if (decl.initializer.parameters.length > 0) {
                            const firstParam = decl.initializer.parameters[0];
                            if (ts.isObjectBindingPattern(firstParam.name)) {
                                const params = new Set<string>();
                                for (const elem of firstParam.name.elements) {
                                    if (ts.isIdentifier(elem.name)) {
                                        params.add(elem.name.text);
                                    }
                                }
                                return params;
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    }

    function collectReferencedParams(node: ts.Node, paramNames: Set<string>): Set<string> {
        const found = new Set<string>();
        function visit(n: ts.Node) {
            if (ts.isIdentifier(n) && paramNames.has(n.text)) {
                found.add(n.text);
            }
            ts.forEachChild(n, visit);
        }
        visit(node);
        return found;
    }

    function analyzeButtonPropForwarding(sf: ts.SourceFile, buttonLocalName: string, wrapperParams: Set<string>): PropMapping[] {
        const mappings: PropMapping[] = [];
        const seen = new Set<string>();

        function visit(node: ts.Node) {
            if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === buttonLocalName) {
                for (const attr of node.attributes.properties) {
                    if (ts.isJsxAttribute(attr)) {
                        const propName = attr.name.getText(sf);

                        if (!attr.initializer) {
                            // Boolean shorthand: <Button success /> — only forwarded if prop name is a wrapper param
                            if (wrapperParams.has(propName) && !seen.has(propName)) {
                                seen.add(propName);
                                mappings.push({buttonProp: propName, wrapperParam: propName});
                            }
                            continue;
                        }

                        if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                            const refs = collectReferencedParams(attr.initializer.expression, wrapperParams);
                            if (refs.size === 1) {
                                const wrapperParam = [...refs][0];
                                const key = `${propName}:${wrapperParam}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    mappings.push({buttonProp: propName, wrapperParam});
                                }
                            } else if (refs.size > 1) {
                                // Multiple params referenced — record each mapping
                                for (const wrapperParam of refs) {
                                    const key = `${propName}:${wrapperParam}`;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        mappings.push({buttonProp: propName, wrapperParam});
                                    }
                                }
                            }
                        }
                    } else if (ts.isJsxSpreadAttribute(attr)) {
                        const refs = collectReferencedParams(attr.expression, wrapperParams);
                        for (const param of refs) {
                            const key = `spread:${param}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                mappings.push({buttonProp: '{...spread}', wrapperParam: param});
                            }
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        }

        visit(sf);
        return mappings;
    }

    // Pre-read all file contents for wrapper detection
    const fileContents = new Map<string, string>();
    for (const f of allFiles) {
        fileContents.set(f, fs.readFileSync(f, 'utf8'));
    }

    const filesWithButtonUsages = [...new Set(allUsages.map((u) => u.file))];
    const wrappers: WrapperInfo[] = [];

    for (const relFile of filesWithButtonUsages) {
        if (relFile.includes('components/Button/')) continue;

        const absFile = path.join(PROJECT_ROOT, relFile);
        const sf = program.getSourceFile(absFile);
        if (!sf) continue;

        const exportName = findDefaultExportName(sf);
        if (!exportName) continue;

        const componentParams = getComponentParams(sf);
        if (!componentParams || componentParams.size === 0) continue;

        // Find Button import name in this file
        let buttonName: string | undefined;
        for (const stmt of sf.statements) {
            if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
                if (isButtonModulePath(stmt.moduleSpecifier.text, absFile)) {
                    if (stmt.importClause?.name) {
                        buttonName = stmt.importClause.name.text;
                    }
                }
            }
        }
        if (!buttonName) continue;

        // Analyze which wrapper props are forwarded to Button
        const propForwarding = analyzeButtonPropForwarding(sf, buttonName, componentParams);
        if (propForwarding.length === 0) continue;

        // Build mapping: wrapperParam → buttonPropName
        const paramToButtonProp = new Map<string, string>();
        for (const pf of propForwarding) {
            if (pf.buttonProp !== '{...spread}') {
                paramToButtonProp.set(pf.wrapperParam, pf.buttonProp);
            }
        }
        const forwardedParams = new Set(propForwarding.map((pf) => pf.wrapperParam));

        const fileBaseName = path.basename(relFile, path.extname(relFile));
        const importableName = fileBaseName === 'index' ? path.basename(path.dirname(relFile)) : fileBaseName;
        if (importableName === 'index') continue;

        const importPattern = new RegExp(`from\\s+['"].*\\b${importableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);

        const wrapperUsages: WrapperUsageSite[] = [];

        for (const candidateFile of allFiles) {
            if (candidateFile === absFile) continue;

            const content = fileContents.get(candidateFile);
            if (!content || !importPattern.test(content)) continue;

            const candidateSf = ts.createSourceFile(candidateFile, content, ts.ScriptTarget.Latest, true, candidateFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

            let localName: string | undefined;
            for (const stmt of candidateSf.statements) {
                if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
                    const spec = stmt.moduleSpecifier.text;
                    if (spec.includes(importableName) && stmt.importClause?.name) {
                        localName = stmt.importClause.name.text;
                        break;
                    }
                }
            }
            if (!localName) continue;

            const foundLocalName = localName;
            function visitWrapper(node: ts.Node) {
                if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === foundLocalName) {
                    const props: PropUsage[] = [];
                    const {line} = candidateSf.getLineAndCharacterOfPosition(node.getStart(candidateSf));

                    for (const attr of node.attributes.properties) {
                        if (ts.isJsxAttribute(attr)) {
                            const propName = attr.name.getText(candidateSf);
                            // Only include props that are forwarded to Button
                            if (!forwardedParams.has(propName)) continue;

                            const classified = extractJsxAttributeValue(attr, candidateSf);
                            // Remap wrapper param name → Button prop name
                            const buttonPropName = paramToButtonProp.get(propName);
                            if (buttonPropName) {
                                classified.prop = buttonPropName;
                            }
                            props.push(classified);
                        } else if (ts.isJsxSpreadAttribute(attr)) {
                            const spreadText = attr.expression.getText(candidateSf);
                            props.push({
                                prop: `{...${spreadText.substring(0, 80)}}`,
                                value: 'spread',
                                type: 'spread',
                            });
                        }
                    }

                    if (props.length > 0) {
                        wrapperUsages.push({
                            file: path.relative(PROJECT_ROOT, candidateFile),
                            line: line + 1,
                            props,
                        });
                    }
                }
                ts.forEachChild(node, visitWrapper);
            }

            visitWrapper(candidateSf);
        }

        if (wrapperUsages.length === 0) continue;

        const buttonUsagesInFile = allUsages.filter((u) => u.file === relFile);

        wrappers.push({
            name: exportName,
            file: relFile,
            directButtonUsages: buttonUsagesInFile.length,
            propForwarding,
            wrapperUsageCount: wrapperUsages.length,
            wrapperUsages,
        });
    }

    wrappers.sort((a, b) => b.wrapperUsageCount - a.wrapperUsageCount);
    console.error(`Found ${wrappers.length} wrapper components with ${wrappers.reduce((sum, w) => sum + w.wrapperUsageCount, 0)} total wrapper usages`);

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
                .map(([value, count]) => ({value, count})),
        }));

    const finalOutput = {
        summary: {
            totalButtonUsages: allUsages.length,
            totalFiles: new Set(allUsages.map((u) => u.file)).size,
            totalWrapperComponents: wrappers.length,
            totalWrapperUsages: wrappers.reduce((sum, w) => sum + w.wrapperUsageCount, 0),
        },
        propStatistics: sortedProps,
        detailedUsages: allUsages,
        wrapperComponents: wrappers,
    };

    const outputPath = path.join(PROJECT_ROOT, 'button-props-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.error(`Analysis written to ${outputPath}`);

    // Also print a readable summary to stdout
    console.log('=== BUTTON COMPONENT PROP USAGE ANALYSIS ===\n');
    console.log(`Total Button usages: ${allUsages.length}`);
    console.log(`Total files with Button: ${new Set(allUsages.map((u) => u.file)).size}\n`);
    console.log('=== PROP STATISTICS (sorted by frequency) ===\n');

    for (const {prop, count, values} of sortedProps) {
        console.log(`${prop}: ${count} usages`);
        for (const {value, count: vCount} of values) {
            console.log(`  ${value}: ${vCount}`);
        }
        console.log();
    }

    // Print wrapper summary
    console.log('=== WRAPPER COMPONENTS (only those forwarding props to Button) ===\n');
    console.log(`Total wrapper components: ${wrappers.length}`);
    console.log(`Total wrapper usages: ${wrappers.reduce((sum, w) => sum + w.wrapperUsageCount, 0)}\n`);
    for (const w of wrappers) {
        console.log(`${w.name} (${w.file})`);
        console.log(`  Button usages inside: ${w.directButtonUsages}, wrapper used: ${w.wrapperUsageCount}x`);
        console.log(`  Forwarded props: ${w.propForwarding.map((pf) => `${pf.wrapperParam}→${pf.buttonProp}`).join(', ')}`);
        for (const u of w.wrapperUsages) {
            const propsStr = u.props.map((p) => `${p.prop}=${p.value}`).join(', ');
            console.log(`    ${u.file}:${u.line} [${propsStr}]`);
        }
        console.log();
    }
}

main();
