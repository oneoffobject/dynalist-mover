import { Plugin, Editor, MarkdownView } from 'obsidian';
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

export default class DynalistMover extends Plugin {
    async onload() {
        this.registerEditorExtension(lineHighlightField);

        this.addCommand({
            id: 'move-lines-up',
            name: 'Move selected lines UP',
            editorCallback: (editor: Editor) => {
                this.moveLines(editor, -1);
            }
        });

        this.addCommand({
            id: 'move-lines-down',
            name: 'Move selected lines DOWN',
            editorCallback: (editor: Editor) => {
                this.moveLines(editor, 1);
            }
        });
    }

    onunload() {
    }

    moveLines(editor: Editor, direction: number) {
        const selections = editor.listSelections();
        if (selections.length === 0) return;
        
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

        if (direction === -1 && startLine === 0) return;
        if (direction === 1 && endLine === editor.lineCount() - 1) return;

        const linesToMove: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
            linesToMove.push(editor.getLine(i));
        }
        const textToMove = linesToMove.join('\n');

        if (direction === -1) {
            const lineAbove = editor.getLine(startLine - 1);
            editor.replaceRange(
                textToMove + '\n' + lineAbove,
                { line: startLine - 1, ch: 0 },
                { line: endLine, ch: editor.getLine(endLine).length }
            );

        } else if (direction === 1) {
            const lineBelow = editor.getLine(endLine + 1);
            editor.replaceRange(
                lineBelow + '\n' + textToMove,
                { line: startLine, ch: 0 },
                { line: endLine + 1, ch: editor.getLine(endLine + 1).length }
            );
        }

        editor.setSelection(
            { line: selection.anchor.line + direction, ch: selection.anchor.ch },
            { line: selection.head.line + direction, ch: selection.head.ch }
        );
    }
}

const lineHighlightField = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const { state } = view;
        const selection = state.selection.main;
        
        if (selection.empty) {
            return builder.finish();
        }

        const startLine = state.doc.lineAt(selection.from);
        const endLine = state.doc.lineAt(selection.to);

        const lineDeco = Decoration.line({
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
