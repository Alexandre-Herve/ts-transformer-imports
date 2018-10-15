"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var nodePath = require("path");
var tsconfig = require("tsconfig-extends");
var tsconfig_paths_1 = require("tsconfig-paths");
// use `tsconfig-extends` module cause it can recursively apply "extends" field
var compilerOptions = tsconfig.load_file_sync('./tsconfig.json');
// ugly hack because passing TSCONFIG_PATH_EXTENSIONS to tsconfig-path doens't really work?
require.extensions['.ts'] = require.extensions['.js'];
require.extensions['.tsx'] = require.extensions['.js'];
var TSCONFIG_PATH_EXTENSIONS = ['.ts', '.tsx'];
var absoluteBaseUrl = nodePath.join(process.cwd(), compilerOptions.baseUrl || '.');
var matchPathFunc = tsconfig_paths_1.createMatchPath(absoluteBaseUrl, compilerOptions.paths || {});
// force extra extensions onto matchPath
// this doesn't resolve the supplied extensions, for some reason
// import { fileExistsSync, readJsonFromDiskSync } from 'tsconfig-paths/lib/filesystem';
// const matchPath = (value: string) => matchPathFunc(value, readJsonFromDiskSync, fileExistsSync, TSCONFIG_PATH_EXTENSIONS)
var transform = function (program) { return transformerFactory; };
var transformerFactory = function (context) {
    return function (file) { return visitSourceFile(file, context); };
};
function visitSourceFile(sourceFile, context) {
    return visitNodeAndChildren(sourceFile);
    function visitNodeAndChildren(node) {
        if (node == null) {
            return node;
        }
        node = visitNode(node);
        return ts.visitEachChild(node, function (childNode) { return visitNodeAndChildren(childNode); }, context);
    }
    function visitNode(node) {
        if (ts.isExportDeclaration(node) || ts.isImportDeclaration(node)) {
            return visitImportExportNode(node);
        }
        return node;
    }
    function visitImportExportNode(node) {
        if (!node.moduleSpecifier || isImportExportSpecifierRelative(node)) {
            return node;
        }
        // const sourceFilePath = sourceFile.fileName
        var sourceFilePath = nodePath.dirname(sourceFile.fileName);
        return relativizeImportExportNode(node, sourceFilePath);
    }
    function isImportExportSpecifierRelative(node) {
        if (node.moduleSpecifier && node.moduleSpecifier.getSourceFile()) {
            return isPathRelative(getModuleSpecifierValue(node.moduleSpecifier));
        }
        return false;
    }
    function getModuleSpecifierValue(specifier) {
        // it's hard, so we'll just assume leading width is the length of the trailing width
        var value = specifier.getText().substr(specifier.getLeadingTriviaWidth(), specifier.getWidth() - specifier.getLeadingTriviaWidth() * 2);
        return value;
    }
    function isPathRelative(path) {
        return (path.startsWith('./') || path.startsWith('../'));
    }
    function relativizeImportExportNode(node, sourceFilePath) {
        if (!node.moduleSpecifier || !node.moduleSpecifier.getSourceFile()) {
            return node;
        }
        var specifierValue = getModuleSpecifierValue(node.moduleSpecifier);
        var matchedPath = matchPathFunc(specifierValue);
        if (matchedPath) {
            var replacePath = nodePath.relative(sourceFilePath, matchedPath);
            // replace the module specifier
            node.moduleSpecifier = ts.createLiteral(isPathRelative(replacePath) ? replacePath : "./" + replacePath);
        }
        return node;
    }
}
exports.default = transform;
