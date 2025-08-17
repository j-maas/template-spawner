# Template spawner

Create a new [Obsidian]() note from a template that defines the folder and name of the new note.

## What is the problem?

I have different templates that should be created in different folders. For example, my literature notes should be created in my `literature` folder.

This plugin allows you to create a new file based on a template. The template can specify where the file should be created and what the name should be.

Why a new plugin? The existing plugins either do not allow to create a note in a specific folder (like the core [Templates](https://help.obsidian.md/plugins/templates) plugin), are much more complex than I need and slow down loading on mobile (like [QuickAdd](https://github.com/chhoumann/quickadd)), or are outdated and incompatible with mobile (like [metatemplates](https://github.com/avirut/obsidian-metatemplates)).

## Getting started

1. [Install](https://help.obsidian.md/community-plugins) the plugin.
2. In the plugin settings, specify what folder your templates are in. Your templates are normal notes which will be copied, similar to the core Templates plugin.
3. Use the ribbon icon or the "Create new note from template" command to start creating a new note.
4. Choose the template to use.
5. The new note will open in new tab. (You can change this in the settings.)

## Examples

### Default settings

Template at `templates/recipe.md`:

```
## Ingredients

## Steps

```

Creates note at `recipe.md`:

```
## Ingredients

## Steps

```

### Custom folder

Template at `templates/literature.md`:

```
---
spawn-folder: literature/
title:
authors:
---

## Notes


```

Creates note at `literature/literature.md`:

```
---
title:
authors:
---

## Notes


```

### Custom folder and name

Template at `templates/dailyNote.md`:

```
---
spawn-folder: dailyNotes/
spawn-name: Day {{date}}
---

## Todos

## Thoughts


```

Creates note at `dailyNotes/Day 2025-08-16.md`:

```
## Todos

## Thoughts

```


## Set the folder

By default, notes are created at the root of your vault.

To specify the folder where the new note should be created, add the `spawn-folder` field to the frontmatter of the template. This field will be removed in the created note.

## Set the name

By default, the name of the template is used as the name of the new note.

To set a different name, add the `spawn-name` field to the frontmatter of the template. This field will be removed in the created note.

You can use `{{date}}` to insert the current date. By default, it uses the format `YYYY-MM-DD` (e.g. `2025-08-16`). To specify a custom [Moment.js format](https://momentjs.com/docs/#/displaying/format/), use `{{date:<your-format>}}`, e.g. `{{date:MMMM Do YYYY}}` for `August 16th 2025`. Beware that you cannot have `:` in file names.

### Naming conflicts

If you create a new note and there is already a note with the same name, the plugin will rename the new note as follows:

- If the note's name ends with a whole number with a space before it, it will increase that number. Example: If `Day 1.md` and `Day 2.md` exist, it will create the new note at `Day 3.md`.
- Otherwise it will add a number to the name, starting at two. Example: If `2025-08-16.md` exists, it will create `2025-08-16 2.md`. (There is no space before `16`, so the previous rule does not apply.)

This allows you to choose whether you would like to always have a number (`Day 1.md`, `Day 2.md`, `Day 3.md`, ...) or only when necessary (`Note.md`, `Note 2.md`, `Note 3.md`, ...).
