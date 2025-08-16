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
	openInNewTab: boolean;
}

const DEFAULT_SETTINGS: TemplateSpawnerSettings = {
	templateFolder: "templates",
	openInNewTab: true,
};

export default class TemplateSpawnerPlugin extends Plugin {
	settings: TemplateSpawnerSettings;

	readonly destinationFolderKey = "spawn-destination";
	readonly destinationNameKey = "spawn-name";

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "create-from-template",
			name: "New from template",
			callback: () => {
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
			},
		});

		this.addSettingTab(new TemplateSpawnerSettingTab(this.app, this));
	}

	onunload() {}

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

	async onTemplateSelected(template: TFile) {
		return this.createNewFromTemplate(template);
	}

	async createNewFromTemplate(template: TFile) {
		const destinationPath = await this.getDestinationPath(template);
		const templateContent = await this.app.vault.read(template);

		const newFile = await this.app.vault.create(
			destinationPath.join("/"),
			templateContent,
		);
		await this.removeTemplateFrontmatterFields(newFile);

		await this.openNewFile(newFile);
	}

	async getDestinationPath(template: TFile): Promise<string[]> {
		const templateFrontmatter =
			this.app.metadataCache.getFileCache(template)?.frontmatter;
		const destinationFolderPath =
			this.getDestinationFolderPath(templateFrontmatter);
		const destinationBasename =
			this.getDestinationBasename(templateFrontmatter);

		const destinationPath = destinationFolderPath;
		destinationPath.push(destinationBasename + ".md");

		return destinationPath;
	}

	getDestinationFolderPath(
		templateFrontmatter: FrontMatterCache | undefined,
	): string[] {
		const frontmatterDestinationFolder: string | null =
			parseFrontMatterEntry(
				templateFrontmatter,
				this.destinationFolderKey,
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
	): string {
		const frontmatterBasename: string | null = parseFrontMatterEntry(
			templateFrontmatter,
			this.destinationNameKey,
		);

		let destinationBasename = this.getDefaultDestinationName();
		if (frontmatterBasename !== null) {
			const currentDate = moment();
			destinationBasename = frontmatterBasename.replace(
				/\{\{date(?::(.+))?}}/g,
				(match, formatMatch) => {
					let format = "YYYY-MM-DD";
					if (formatMatch !== undefined) {
						format = formatMatch;
					}
					return currentDate.format(format);
				},
			);
		}

		return destinationBasename + ".md";
	}

	getDefaultDestinationName() {
		const currentDate = moment().format("YYYY-MM-DD");
		return `${currentDate}.md`;
	}

	async removeTemplateFrontmatterFields(newFile: TFile) {
		await this.app.fileManager.processFrontMatter(
			newFile,
			(frontmatter) => {
				delete frontmatter[this.destinationFolderKey];
			},
		);
	}

	async openNewFile(newFile: TFile) {
		const leafType = this.settings.openInNewTab ? "tab" : false;
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
			.setName("Open in new tab")
			.setDesc(
				"If active, will open the note in a new tab after creating it from a template.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInNewTab)
					.onChange(async (value) => {
						this.plugin.settings.openInNewTab = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName("Default name");
	}
}
