import { EVENT_CHANGE_THEME } from "../../consts";

type ThemeType = 'light-theme' | 'dark-theme';
type ThemeElement = 'button' | 'sun' | 'moon';

export interface CandidusThemeEvent extends CustomEvent {
	detail: {
		theme: ThemeType
	}
}

/**
 * Class that handles light- and dark theme on all pages
 */
export default class ThemeControl {
	themeButtons: NodeListOf<HTMLElement>;
	themeIconsSun: NodeListOf<HTMLSpanElement>;
	themeIconsMoon: NodeListOf<HTMLSpanElement>;
	constructor() {
		this.themeButtons = this.getThemeElement('button');
		this.themeIconsSun = this.getThemeElement('sun');
		this.themeIconsMoon = this.getThemeElement('moon');
	}

	/**
	 * @desc Initialize the current user theme and bind event listeners to buttons
	 */
	public init() {
		const activeTheme: ThemeType = this.getUserTheme();
		this.setTheme(activeTheme);
		this.themeButtons.forEach((button) => {
			return button.addEventListener('click', () => this.toggleThemes());
		});
	}

	/**
	 * @desc Activate whatever theme is currently inactive
	 */
	private toggleThemes() {
		const activeTheme: ThemeType = this.getUserTheme();
		if (activeTheme === 'dark-theme') {
			this.setTheme('light-theme');
		} else {
			this.setTheme('dark-theme');
		}
		const onChangeTheme = new CustomEvent(EVENT_CHANGE_THEME, { detail: { theme: this.getUserTheme() } });
		window.dispatchEvent(onChangeTheme);
	}

	/**
	 * @desc Manually activate a theme by its name `dark-theme` or `light-theme`
	 */
	private setTheme(theme: ThemeType): ThemeType {
		localStorage.setItem('user-theme', theme);
		this.setIconVisibility(theme);
		document.documentElement.className = theme;
		return theme;
	}

	/**
	 * @desc Get the current user theme from local storage. The design
	 *       system's default look is the dark theme, so it is used
	 *       until a user preference has been stored.
	 */
	private getUserTheme(): ThemeType {
		const activeTheme: ThemeType = localStorage.getItem('user-theme') as ThemeType;
		if (activeTheme) {
			return activeTheme;
		}
		return 'dark-theme';
	}

	/**
	 * @desc Show or hide the icon that does not display the currently active
	 *       user theme.
	 */
	private setIconVisibility(theme: ThemeType) {
		if (theme === 'dark-theme') {
			this.getThemeElement('moon').forEach((moon) => moon.classList.remove('hidden'));
			this.getThemeElement('sun').forEach((moon) => moon.classList.add('hidden'));
		} else {
			this.getThemeElement('moon').forEach((moon) => moon.classList.add('hidden'));
			this.getThemeElement('sun').forEach((moon) => moon.classList.remove('hidden'));
		}
	}

	private getThemeElement(themeElement: ThemeElement): NodeListOf<HTMLElement> {
		return document.querySelectorAll(`[data-user-theme='${themeElement}']`);
	}
}
