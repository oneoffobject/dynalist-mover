# Dynalist Mover

Dynalist Mover is an Obsidian plugin that allows you to select multiple lines of text and move them up or down together, bringing a Dynalist-like smooth editing experience to your Obsidian vault.

## Features

- **Move Multiple Lines at Once**: Select any number of lines in the editor and move them up or down. The selection is maintained after the move, allowing you to easily adjust positioning with repeated key presses.
    
- **Works with Any Text**: It's not limited to bullet lists; you can move standard paragraphs, Markdown elements, or any text block.
    
- **Visual Highlight**: Selected lines are visually highlighted with a light blue background, similar to Dynalist, making it perfectly clear exactly which block of text you are moving.
    
- **Move Children with Parent**: When moving a parent list item, all its indented child items automatically move with it as a single block, perfectly mimicking Dynalist's outliner behavior.


## Usage

1. Select one or more lines of text in your editor.
    
2. Open the Command Palette (`Ctrl/Cmd + P`) and search for:
    
    - `Move selected lines up`
        
    - `Move selected lines down`
        
3. **Recommended Setup**: For the best experience, assign hotkeys to these commands. Go to Settings > Hotkeys, search for "Dynalist Mover", and assign shortcut keys such as `Ctrl + Up` and `Ctrl + Down` (or `Option + Up` / `Option + Down` on Mac).

> [!TIP]
> If you are using the **Outliner plugin** simultaneously, the default hotkeys may conflict. We recommend assigning unique hotkeys to Dynalist Mover to avoid double-triggering.


## Settings

- **Move children with parent** (Default: ON) We highly recommend keeping this setting enabled for the authentic Dynalist experience. However, if you have a specific reason to move only the parent line while leaving its children behind, you can easily toggle this off in the plugin settings.


## Installation

1. Open Obsidian **Settings**.
2. Go to **Community plugins** and turn off Safe Mode.
3. Click on **Browse** and search for "Dynalist Mover".
4. Click **Install** and then enable it in your plugin list.
