import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	TFile,
} from "obsidian";

interface TemplateSpawnerSettings {
	templateFolder: string;
}

const DEFAULT_SETTINGS: TemplateSpawnerSettings = {
	templateFolder: "templates",
};

export default class TemplateSpawnerPlugin extends Plugin {
	settings: TemplateSpawnerSettings;

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
				new TemplateChooserModal(this.app, allTemplates).open();
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
}

export class TemplateChooserModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		private allTemplates: TFile[],
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
		new Notice(`Selected ${template.basename}`);
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
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
