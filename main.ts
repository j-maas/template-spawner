import {
	App,
	Notice,
	parseFrontMatterEntry,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	moment,
	TFile,
	FrontMatterCache,
} from "obsidian";

interface TemplateSpawnerSettings {
	templateFolder: string;
	afterCreation: "nothing" | "openInActive" | "openInNew";
}

const DEFAULT_SETTINGS: TemplateSpawnerSettings = {
	templateFolder: "templates",
	afterCreation: "openInNew",
};

export default class TemplateSpawnerPlugin extends Plugin {
	settings: TemplateSpawnerSettings;

	static readonly destinationFolderKey = "spawn-folder";
	static readonly destinationNameKey = "spawn-name";

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "create-from-template",
			name: "Create new note from template",
			callback: () => {
				this.startCreation();
			},
		});

		this.addRibbonIcon('list-plus', "Create new note from template", () => {
			this.startCreation();
		})

		this.addSettingTab(new TemplateSpawnerSettingTab(this.app, this));
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	startCreation() {
		const templateFolder = this.app.vault.getFolderByPath(
			this.settings.templateFolder,
		);
		if (templateFolder === null) {
			new Notice(
				`Could not find the template folder at ${this.settings.templateFolder}. Please update the settings.`,
			);
			return;
		}
		const allTemplates = templateFolder.children.filter(
			(entry): entry is TFile => entry instanceof TFile,
		);
		new TemplateChooserModal(this.app, allTemplates, (template) =>
			this.onTemplateSelected(template),
		).open();
	}

	async onTemplateSelected(template: TFile) {
		return this.createNewFromTemplate(template);
	}

	async createNewFromTemplate(template: TFile) {
		const destination = await this.getDestination(template);
		const templateContent = await this.app.vault.read(template);

		const newFile = await this.createFile(
			destination.folder,
			destination.basename,
			".md",
			templateContent,
		);
		await this.removeTemplateFrontmatterFields(newFile);

		await this.afterCreation(newFile);
	}

	async getDestination(
		template: TFile,
	): Promise<{ folder: string[]; basename: string }> {
		const templateFrontmatter =
			this.app.metadataCache.getFileCache(template)?.frontmatter;
		const folder = this.getDestinationFolderPath(templateFrontmatter);
		const basename = this.getDestinationBasename(templateFrontmatter, template.basename);

		return { folder, basename };
	}

	getDestinationFolderPath(
		templateFrontmatter: FrontMatterCache | undefined,
	): string[] {
		const frontmatterDestinationFolder: string | null =
			parseFrontMatterEntry(
				templateFrontmatter,
				TemplateSpawnerPlugin.destinationFolderKey,
			);
		const destinationFolderPath =
			frontmatterDestinationFolder !== null
				? frontmatterDestinationFolder
					.split("/")
					.filter((part) => part.trim().length !== 0)
				: [];

		return destinationFolderPath;
	}

	getDestinationBasename(
		templateFrontmatter: FrontMatterCache | undefined,
		templateBasename: string
	): string {
		const frontmatterBasename: string | null = parseFrontMatterEntry(
			templateFrontmatter,
			TemplateSpawnerPlugin.destinationNameKey,
		);

		let destinationBasename = templateBasename
		if (frontmatterBasename !== null) {
			destinationBasename = frontmatterBasename
		}

		const currentDate = moment();
		destinationBasename = destinationBasename.replace(
			/\{\{date(?::(.+))?}}/g,
			(match, formatMatch) => {
				let format = "YYYY-MM-DD";
				if (formatMatch !== undefined) {
					format = formatMatch;
				}
				return currentDate.format(format);
			},
		);

		return destinationBasename;
	}

	async createFile(
		folder: string[],
		basename: string,
		extension: string,
		content: string,
	): Promise<TFile> {
		const maxTries = 100;
		let triesLeft = maxTries;
		while (triesLeft > 0) {
			const path = [...folder, basename + extension];

			const result = await this.tryCreatingFile(path, content);
			if (result !== null) {
				return result;
			}

			basename = this.incrementBasename(basename)

			triesLeft -= 1;
		}
		const errorMessage = `There are too many existing files with confliting names. Abandoned after ${maxTries} tries, last try was: ${folder.join("/")}/${basename}`
		new Notice(errorMessage)
		throw new Error(errorMessage)
	}

	async tryCreatingFile(
		path: string[],
		content: string,
	): Promise<TFile | null> {
		try {
			return await this.app.vault.create(path.join("/"), content);
		} catch (e) {
			if (e instanceof Error) {
				return null;
			} else {
				throw e;
			}
		}
	}

	incrementBasename(basename: string): string {
		const match = /(.*\s+)(\d+)$/.exec(basename);

		if (match !== null) {
			const numberMatch = match[2];
			const previousNumber = parseInt(numberMatch);

			const newNumber = previousNumber + 1;
			const prefix = match[1];
			return prefix + newNumber;
		} else {
			return basename.trimEnd() + " 2"
		}
	}

	async removeTemplateFrontmatterFields(newFile: TFile) {
		await this.app.fileManager.processFrontMatter(
			newFile,
			(frontmatter) => {
				delete frontmatter[TemplateSpawnerPlugin.destinationFolderKey];
				delete frontmatter[TemplateSpawnerPlugin.destinationNameKey]
			},
		);
	}

	async afterCreation(newFile: TFile) {
		if (this.settings.afterCreation === "nothing") {
			new Notice(`Created '${newFile.path}'.`)
			return
		}

		const leafType = this.settings.afterCreation === "openInNew" ? "tab" : false;
		const leaf = this.app.workspace.getLeaf(leafType);
		await leaf.openFile(newFile);
	}
}

export class TemplateChooserModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		private allTemplates: TFile[],
		private onSelected: (template: TFile) => void,
	) {
		super(app);
	}

	// Returns all available suggestions.
	getSuggestions(query: string): TFile[] {
		return this.allTemplates.filter((template) =>
			template.basename
				.toLocaleLowerCase()
				.includes(query.toLocaleLowerCase()),
		);
	}

	// Renders each suggestion item.
	renderSuggestion(template: TFile, el: HTMLElement) {
		el.createEl("div", { text: template.basename });
		el.createEl("small", { text: template.path });
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(template: TFile, evt: MouseEvent | KeyboardEvent) {
		this.onSelected(template);
	}
}

class TemplateSpawnerSettingTab extends PluginSettingTab {
	plugin: TemplateSpawnerPlugin;

	constructor(app: App, plugin: TemplateSpawnerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Template folder")
			.setDesc("Path to the folder containing your templates.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('After creation')
			.setDesc('Choose what to do with new notes after they were created.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('openInNew', 'Open in new tab')
					.addOption('openInActive', 'Open in active editor')
					.addOption('nothing', "Don't open, only notify")
					.setValue(this.plugin.settings.afterCreation)
					.onChange(async (value) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						this.plugin.settings.afterCreation = value as any;
						await this.plugin.saveSettings();
					})
			);
	}
}
