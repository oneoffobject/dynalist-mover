"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const view_1 = require("@codemirror/view");
const state_1 = require("@codemirror/state");
const DEFAULT_SETTINGS = {
    moveChildrenWithParent: false
};
class DynalistMover extends obsidian_1.Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new DynalistMoverSettingTab(this.app, this));
        this.registerEditorExtension(lineHighlightField);
        this.addCommand({
            id: 'move-lines-up',
            name: 'Move selected lines UP',
            editorCallback: (editor) => {
                this.moveLines(editor, -1);
            }
        });
        this.addCommand({
            id: 'move-lines-down',
            name: 'Move selected lines DOWN',
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
    moveLines(editor, direction) {
        const selections = editor.listSelections();
        if (selections.length === 0)
            return;
        const selection = selections[0];
        let from = selection.anchor;
        let to = selection.head;
        if (from.line > to.line || (from.line === to.line && from.ch > to.ch)) {
            from = selection.head;
            to = selection.anchor;
        }
        let startLine = from.line;
        let endLine = to.line;
        if (startLine !== endLine && to.ch === 0) {
            endLine--;
        }
        let finalEndLine = endLine;
        if (this.settings.moveChildrenWithParent) {
            const lastLineStr = editor.getLine(endLine);
            const getIndentLength = (str) => {
                const match = str.match(/^[ \t]*/);
                return match ? match[0].length : 0;
            };
            const parentIndent = getIndentLength(lastLineStr);
            if (lastLineStr.trim().length > 0) {
                for (let i = endLine + 1; i < editor.lineCount(); i++) {
                    const lineStr = editor.getLine(i);
                    const childIndent = getIndentLength(lineStr);
                    if (lineStr.trim().length === 0) {
                        break;
                    }
                    if (childIndent > parentIndent) {
                        finalEndLine = i;
                    }
                    else {
                        break;
                    }
                }
            }
        }
        endLine = finalEndLine;
        const getIndentLength = (str) => {
            const match = str.match(/^[ \t]*/);
            return match ? match[0].length : 0;
        };
        if (direction === -1) {
            if (startLine === 0)
                return;
            let targetStart = startLine - 1;
            if (this.settings.moveChildrenWithParent) {
                const baseIndent = getIndentLength(editor.getLine(startLine));
                while (targetStart > 0) {
                    const lineStr = editor.getLine(targetStart);
                    if (lineStr.trim().length === 0)
                        break;
                    if (getIndentLength(lineStr) > baseIndent) {
                        targetStart--;
                    }
                    else {
                        break;
                    }
                }
            }
            const blockFrom = [];
            for (let i = targetStart; i < startLine; i++) {
                blockFrom.push(editor.getLine(i));
            }
            const blockToMove = [];
            for (let i = startLine; i <= endLine; i++) {
                blockToMove.push(editor.getLine(i));
            }
            editor.replaceRange(blockToMove.join('\n') + '\n' + blockFrom.join('\n'), { line: targetStart, ch: 0 }, { line: endLine, ch: editor.getLine(endLine).length });
            const linesMoved = startLine - targetStart;
            editor.setSelection({ line: selection.anchor.line - linesMoved, ch: selection.anchor.ch }, { line: selection.head.line - linesMoved, ch: selection.head.ch });
        }
        else if (direction === 1) {
            if (endLine === editor.lineCount() - 1)
                return;
            let targetEnd = endLine + 1;
            if (this.settings.moveChildrenWithParent) {
                const baseIndent = getIndentLength(editor.getLine(startLine));
                const targetBaseIndent = getIndentLength(editor.getLine(targetEnd));
                if (targetBaseIndent >= baseIndent) {
                    while (targetEnd < editor.lineCount() - 1) {
                        const lineStr = editor.getLine(targetEnd + 1);
                        if (lineStr.trim().length === 0)
                            break;
                        if (getIndentLength(lineStr) > targetBaseIndent) {
                            targetEnd++;
                        }
                        else {
                            break;
                        }
                    }
                }
            }
            const blockToMove = [];
            for (let i = startLine; i <= endLine; i++) {
                blockToMove.push(editor.getLine(i));
            }
            const blockTo = [];
            for (let i = endLine + 1; i <= targetEnd; i++) {
                blockTo.push(editor.getLine(i));
            }
            editor.replaceRange(blockTo.join('\n') + '\n' + blockToMove.join('\n'), { line: startLine, ch: 0 }, { line: targetEnd, ch: editor.getLine(targetEnd).length });
            const linesMoved = targetEnd - endLine;
            editor.setSelection({ line: selection.anchor.line + linesMoved, ch: selection.anchor.ch }, { line: selection.head.line + linesMoved, ch: selection.head.ch });
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
