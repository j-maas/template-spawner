import { AbstractInputSuggest, App } from "obsidian";

type Suggestion = {
	before?: string;
	match: string;
	after?: string;
};

export class FolderSuggest extends AbstractInputSuggest<Suggestion> {
	constructor(
		public app: App,
		private inputEl: HTMLInputElement,
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): Suggestion[] {
		const allFolders = this.app.vault.getAllFolders(true);
		const suggestions = allFolders
			.filter((folder) => folder.path.includes(query))
			.map((folder) => {
				const matchStart = folder.path.indexOf(query);
				// This should not happen, since we filtered to those that match.
				if (matchStart === -1) {
					return { match: folder.path };
				} else {
					const matchEnd = matchStart + query.length;
					return {
						before:
							matchStart > 0
								? folder.path.substring(0, matchStart)
								: undefined,
						match: query,
						after:
							matchEnd < folder.path.length
								? folder.path.substring(matchEnd)
								: undefined,
					};
				}
			});
		return suggestions;
	}

	renderSuggestion(suggestion: Suggestion, el: HTMLElement): void {
		const match = document.createElement("span");
		match.style.fontWeight = "bold";
		match.setText(suggestion.match);

		const children = [suggestion.before, match, suggestion.after].filter(
			(child): child is string | HTMLSpanElement => child !== undefined,
		);
		el.replaceChildren(...children);
	}

	selectSuggestion(suggestion: Suggestion): void {
		let value = "";
		if (suggestion.before !== undefined) {
			value += suggestion.before;
		}
		value += suggestion.match;
		if (suggestion.after !== undefined) {
			value += suggestion.after;
		}
		this.inputEl.value = value;

		this.inputEl.dispatchEvent(new Event("input"));
		this.close();
	}
}
