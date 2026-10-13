
import { EVENT_CHANGE_THEME, CANDIDUS_PRISM_PLACEHOLDER, CANDIDUS_SYNTAX_HIGHLIGHTER } from '../consts';
import { CandidusThemeEvent } from '../modules/theme/ThemeControl';
import { ControlStruct } from '../core/base/Control';
import PluginBase, { SyntaxHighlighterConfiguration } from '../core/base/Plugin';


interface SyntaxHighlighterSelectors {
  stylesheetSelector: string;
  scriptSelector: string;
}

/**
 * @class SyntaxHighlighter
 * @extends PluginBase
 * @implements ControlStruct
 * @description This class manages the syntax highlighting functionality. It initializes
 *              the highlighter based on configuration options and listens for theme changes
 *              to dynamically update the styles.
 */
export default class SyntaxHighlighter extends PluginBase implements ControlStruct {
  constructor({ stylesheetSelector, scriptSelector }: SyntaxHighlighterSelectors) {
    super(stylesheetSelector);
    this.stylesheet = this.$query(stylesheetSelector) as HTMLLinkElement;
    this.script = this.$query(scriptSelector) as HTMLScriptElement;
  }

  /**
   * @desc Initialize the syntax highlighter if the corresponding plugin option is available.
   */
  public init() {
    if (this.hasPluginOption(CANDIDUS_SYNTAX_HIGHLIGHTER)) {
      const options = this.getPluginOption(CANDIDUS_SYNTAX_HIGHLIGHTER) as SyntaxHighlighterConfiguration;
      this.registerSyntaxHighlighter(options);
      this.listenToThemeChanges(options);
    }
  }

  /**
   * @desc Register the syntax highlighter by setting the appropriate stylesheet and script.
   * @param options - Configuration options for the syntax highlighter.
   */
  private registerSyntaxHighlighter(options: SyntaxHighlighterConfiguration) {
    const currentTheme = this.getTheme(options);
    this.$log(`Loading theme stylesheet for ${options.type}-${currentTheme}.css`)
    const path = `${this.stylesheet.dataset['thirdparty_root'].replace(CANDIDUS_PRISM_PLACEHOLDER, `${options.type}-${currentTheme}.css`)}`
    this.script.async = true;
    this.script.src = this.script.dataset['src'];
    this.stylesheet.setAttribute('href', path);
    this.stylesheet.dataset['thirdparty_root'] = null;
  }

  /**
   * @desc Listen for theme change events and update the stylesheet's theme accordingly.
   * @param options - Configuration options for the syntax highlighter.
   */
  private listenToThemeChanges(options: SyntaxHighlighterConfiguration) {
    window.addEventListener(EVENT_CHANGE_THEME, (ev: CandidusThemeEvent) => {
      const oldTheme = ev.detail.theme === "dark-theme" ? 'light' : 'dark';
      const newTheme = ev.detail.theme === "dark-theme" ? 'dark' : 'light';
      const updatedPath = this.stylesheet.getAttribute('href').replace(oldTheme, newTheme);

      this.$log(`Changing theme from ${oldTheme} to ${newTheme} after user preference`)
      this.stylesheet.setAttribute('href', updatedPath);
    })
  }

  /**
   * @desc Determine the current theme based on the HTML class list.
   * @param options - Configuration options for the syntax highlighter.
   * @returns The current theme as a string.
   */
  private getTheme(options: SyntaxHighlighterConfiguration) {
    return this.$query('html').classList.contains('light-theme') ? 'light' : 'dark';
  }
}
