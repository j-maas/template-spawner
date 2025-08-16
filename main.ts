import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

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
			id: "creat-from-template",
			name: "New from template",
			callback: () => {
				// TODO
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
