"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const view_1 = require("@codemirror/view");
const state_1 = require("@codemirror/state");
const DEFAULT_SETTINGS = {
    moveChildrenWithParent: true
};
class DynalistMover extends obsidian_1.Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new DynalistMoverSettingTab(this.app, this));
        this.registerEditorExtension(lineHighlightField);
        this.addCommand({
            id: 'move-lines-up',
            name: 'Move selected lines up',
            repeatable: true,
            editorCallback: (editor) => {
                this.moveLines(editor, -1);
            }
        });
        this.addCommand({
            id: 'move-lines-down',
            name: 'Move selected lines down',
            repeatable: true,
            editorCallback: (editor) => {
                this.moveLines(editor, 1);
            }
        });
    }
    onunload() {
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    getIndentLength(str) {
        const match = str.match(/^[ \t]*/);
        if (!match)
            return 0;
        const indentStr = match[0];
        let length = 0;
        for (let i = 0; i < indentStr.length; i++) {
            if (indentStr[i] === '\t') {
                length += 4;
            }
            else {
                length += 1;
            }
        }
        return length;
    }
    moveLines(editor, direction) {
        const selections = editor.listSelections();
        if (selections.length === 0)
            return;
        const selection = selections[0];
        // Normalize selection to startLine and endLine
        let from = selection.anchor.line < selection.head.line ? selection.anchor : selection.head;
        let to = selection.anchor.line < selection.head.line ? selection.head : selection.anchor;
        if (selection.anchor.line === selection.head.line && selection.anchor.ch > selection.head.ch) {
            from = selection.head;
            to = selection.anchor;
        }
        let startLine = from.line;
        let endLine = to.line;
        // If the selection ends at character 0 of the next line, don't include that line.
        if (startLine !== endLine && to.ch === 0) {
            endLine--;
        }
        // 1. Expand selection to include all children if moveChildrenWithParent is enabled
        if (this.settings.moveChildrenWithParent) {
            const lastLineIndent = this.getIndentLength(editor.getLine(endLine));
            for (let i = endLine + 1; i < editor.lineCount(); i++) {
                const lineStr = editor.getLine(i);
                if (lineStr.trim().length === 0)
                    break;
                if (this.getIndentLength(lineStr) > lastLineIndent) {
                    endLine = i;
                }
                else {
                    break;
                }
            }
        }
        const baseIndent = this.getIndentLength(editor.getLine(startLine));
        if (direction === -1) { // MOVE UP
            if (startLine === 0)
                return;
            let targetLine = startLine - 1;
            // Skip over children of the previous sibling block
            if (this.settings.moveChildrenWithParent) {
                while (targetLine > 0 && this.getIndentLength(editor.getLine(targetLine)) > baseIndent) {
                    targetLine--;
                }
            }
            const blockToJumpOver = [];
            for (let i = targetLine; i < startLine; i++) {
                blockToJumpOver.push(editor.getLine(i));
            }
            const blockToMove = [];
            for (let i = startLine; i <= endLine; i++) {
                blockToMove.push(editor.getLine(i));
            }
            const replacement = blockToMove.join('\n') + '\n' + blockToJumpOver.join('\n');
            const offset = startLine - targetLine;
            editor.transaction({
                changes: [{
                        text: replacement,
                        from: { line: targetLine, ch: 0 },
                        to: { line: endLine, ch: editor.getLine(endLine).length }
                    }],
                selections: [{
                        from: { line: selection.anchor.line - offset, ch: selection.anchor.ch },
                        to: { line: selection.head.line - offset, ch: selection.head.ch }
                    }]
            });
        }
        else if (direction === 1) { // MOVE DOWN
            if (endLine === editor.lineCount() - 1)
                return;
            let nextLine = endLine + 1;
            let targetLine = nextLine;
            // Skip over children of the next sibling block
            if (this.settings.moveChildrenWithParent) {
                const nextIndent = this.getIndentLength(editor.getLine(nextLine));
                if (nextIndent >= baseIndent) {
                    for (let i = nextLine + 1; i < editor.lineCount(); i++) {
                        const lineStr = editor.getLine(i);
                        if (lineStr.trim().length === 0)
                            break;
                        if (this.getIndentLength(lineStr) > nextIndent) {
                            targetLine = i;
                        }
                        else {
                            break;
                        }
                    }
                }
                else {
                    targetLine = nextLine;
                }
            }
            const blockToMove = [];
            for (let i = startLine; i <= endLine; i++) {
                blockToMove.push(editor.getLine(i));
            }
            const blockToJumpOver = [];
            for (let i = endLine + 1; i <= targetLine; i++) {
                blockToJumpOver.push(editor.getLine(i));
            }
            const replacement = blockToJumpOver.join('\n') + '\n' + blockToMove.join('\n');
            const offset = targetLine - endLine;
            editor.transaction({
                changes: [{
                        text: replacement,
                        from: { line: startLine, ch: 0 },
                        to: { line: targetLine, ch: editor.getLine(targetLine).length }
                    }],
                selections: [{
                        from: { line: selection.anchor.line + offset, ch: selection.anchor.ch },
                        to: { line: selection.head.line + offset, ch: selection.head.ch }
                    }]
            });
        }
    }
}
exports.default = DynalistMover;
class DynalistMoverSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        new obsidian_1.Setting(containerEl)
            .setName('Move children with parent')
            .setDesc('When enabled, moving a parent list item will also move its indented child items.')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.moveChildrenWithParent)
            .onChange(async (value) => {
            this.plugin.settings.moveChildrenWithParent = value;
            await this.plugin.saveSettings();
        }));
    }
}
const lineHighlightField = view_1.ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = this.buildDecorations(view);
    }
    update(update) {
        if (update.docChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view);
        }
    }
    buildDecorations(view) {
        const builder = new state_1.RangeSetBuilder();
        const { state } = view;
        const selection = state.selection.main;
        if (selection.empty) {
            return builder.finish();
        }
        const startLine = state.doc.lineAt(selection.from);
        const endLine = state.doc.lineAt(selection.to);
        const lineDeco = view_1.Decoration.line({
            attributes: { class: "dynalist-highlight-line" }
        });
        for (let i = startLine.number; i <= endLine.number; i++) {
            const line = state.doc.line(i);
            if (i === endLine.number && selection.to === line.from && startLine.number !== endLine.number) {
                continue;
            }
            builder.add(line.from, line.from, lineDeco);
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});
