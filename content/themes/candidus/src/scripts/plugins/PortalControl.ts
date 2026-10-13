import { EVENT_CHANGE_THEME } from '../consts';
import Control, { ControlStruct } from '../core/base/Control';

/**
 * @class PortalControl
 * @implements ControlStruct
 * @description Ghost renders its members "Portal" (signup, login, account) and
 *              its search modal inside same-origin iframes. Out of the box
 *              they are light-themed and use the publication accent color,
 *              which clashes with this theme. This control injects the design
 *              system's colors and fonts into both documents whenever they
 *              are opened, and re-syncs them when the user toggles between
 *              light- and dark theme.
 */
export default class PortalControl extends Control implements ControlStruct {
	private static readonly GHOST_FRAME_SELECTOR =
		'iframe[data-testid="portal-popup-frame"], iframe[searchdir], iframe[title="comments-frame"]';
	private static readonly STYLE_ID = 'candidus-ghost-frame-theme';

	private observer: MutationObserver | null = null;
	private framesWithListener: WeakSet<HTMLIFrameElement> = new WeakSet();

	constructor() {
		super('body');
	}

	/**
	 * @desc Watch for Ghost's modal iframes and theme changes
	 */
	public init() {
		if (!this.valid) {
			return;
		}
		this.observer = new MutationObserver(() => this.applyToAllFrames());
		this.observer.observe(document.body, { childList: true, subtree: true });

		window.addEventListener(EVENT_CHANGE_THEME, () => this.applyToAllFrames());
	}

	/**
	 * @desc Inject the theme stylesheet into every open Ghost modal document
	 */
	private applyToAllFrames() {
		const frames = document.querySelectorAll<HTMLIFrameElement>(PortalControl.GHOST_FRAME_SELECTOR);
		frames.forEach((frame) => this.applyToFrame(frame));
	}

	/**
	 * @desc Inject (or refresh) the theme stylesheet of a single Ghost modal
	 *       document. The modals embed their document via "srcdoc", which
	 *       replaces the initial blank document once it has loaded. Styling
	 *       is therefore deferred to the iframe's load event.
	 */
	private applyToFrame(frame: HTMLIFrameElement) {
		if (!this.framesWithListener.has(frame)) {
			this.framesWithListener.add(frame);
			frame.addEventListener('load', () => this.applyToFrame(frame));
		}

		try {
			const frameDocument = frame.contentDocument;
			if (!frameDocument || !frameDocument.head || !frameDocument.body) {
				return;
			}

			let styleElement = frameDocument.getElementById(PortalControl.STYLE_ID) as HTMLStyleElement;
			if (!styleElement) {
				styleElement = frameDocument.createElement('style');
				styleElement.id = PortalControl.STYLE_ID;
				frameDocument.head.appendChild(styleElement);
			}

			if (frame.title === 'comments-frame') {
				this.syncCommentsTheme(frameDocument);
				styleElement.textContent = this.buildCommentsStylesheet();
			} else {
				styleElement.textContent = frame.hasAttribute('searchdir')
					? this.buildSearchStylesheet()
					: this.buildPortalStylesheet();
			}
		} catch (error) {
			// The modal document may be inaccessible if Ghost changes the way
			// the iframe is embedded. In that case, keep the default look.
			this.$log(`PortalControl could not style a Ghost iframe: ${error}`);
		}
	}

	/**
	 * @desc The comments section renders in the "dark" Tailwind variant when
	 *       its root element carries the "dark" class. Sync it with the site
	 *       theme instead of relying on the helper's static mode attribute.
	 */
	private syncCommentsTheme(frameDocument: Document) {
		const isDarkTheme = !document.documentElement.classList.contains('light-theme');
		frameDocument.querySelectorAll('section.ghost-display').forEach((section) => {
			section.classList.toggle('dark', isDarkTheme);
		});
	}

	/**
	 * @desc Build the comments stylesheet. The comments section inherits the
	 *       publication accent color, which is remapped onto the design
	 *       system's primary color.
	 */
	private buildCommentsStylesheet(): string {
		const isDarkTheme = !document.documentElement.classList.contains('light-theme');
		const fontBody = `'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;

		return `
			html,
			body {
				background: transparent !important;
			}
			body {
				font-family: ${fontBody};
			}
			.ghost-display {
				--gh-accent-color: ${isDarkTheme ? '#409CFF' : '#2563EB'} !important;
			}
		`;
	}

	/**
	 * @desc Build the members Portal stylesheet for the currently active site
	 *       theme. The Portal defines its colors via custom properties
	 *       ("--brandcolor", "--grey0"-"--grey14") that are remapped onto the
	 *       design system.
	 */
	private buildPortalStylesheet(): string {
		const isDarkTheme = !document.documentElement.classList.contains('light-theme');

		const brandColor = isDarkTheme ? '#409CFF' : '#2563EB';
		const fontBody = `'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;
		const fontHeading = `'Space Grotesk', 'Inter', system-ui, sans-serif`;

		let stylesheet = `
			html,
			body {
				background: transparent !important;
			}
			:root {
				--brandcolor: ${brandColor};
			}
			body {
				font-family: ${fontBody};
			}
			h1, h2, h3, h4, h5, h6,
			.gh-portal-btn,
			.gh-portal-sitetitle,
			.gh-portal-setuprecheck {
				font-family: ${fontHeading};
			}

			/* The Portal places the publication accent color in inline styles,
			   which is remapped onto the design system's call-to-action gradient */
			.gh-portal-btn-main,
			.gh-portal-btn-primary {
				background: linear-gradient(135deg, ${brandColor} 0%, ${isDarkTheme ? '#B27AFF' : '#7C3AED'} 100%) !important;
				color: #fff !important;
			}
			.gh-portal-link {
				color: ${brandColor} !important;
			}
		`;

		if (isDarkTheme) {
			// Remap the Portal's grey ramp onto the design system's dark palette.
			// grey0 - grey5 carry text, grey9 - grey14 carry borders and backgrounds.
			stylesheet += `
				:root {
					--grey0: #EEF3FA;
					--grey1: #E7EDF6;
					--grey1rgb: 238, 243, 250;
					--grey2: #C9D3E2;
					--grey3: #AEBBD0;
					--grey4: #96A2B5;
					--grey5: #7E8CA3;
					--grey6: #67748C;
					--grey7: #566278;
					--grey8: #45506B;
					--grey9: #3A455C;
					--grey10: #2E3A50;
					--grey11: #232C40;
					--grey12: #1B2537;
					--grey13: #0F1626;
					--grey13rgb: 15, 22, 38;
					--grey14: #0B101B;
				}

				/* Surfaces that hardcode "var(--white)" as a background are
				   moved onto the design system's surface colors. Rules that use
				   "var(--white)" as a text color on accent backgrounds stay valid. */
				.gh-portal-popup-wrapper,
				.gh-portal-popup-container {
					background: #0B101B !important;
				}
				.gh-portal-list,
				.gh-portal-product-card,
				.gh-portal-powered,
				.gh-portal-btn-inbox-link,
				.gh-portal-gift-checkout-tier-item {
					background: #111827 !important;
				}
				.gh-portal-gift-duration-switch .gh-portal-btn.active {
					background: #111827 !important;
					color: #EEF3FA !important;
				}
			`;
		}

		return stylesheet;
	}

	/**
	 * @desc Build the search modal stylesheet for the currently active site
	 *       theme. The search modal is styled with utility classes, which are
	 *       overridden towards the design system where necessary.
	 */
	private buildSearchStylesheet(): string {
		const isDarkTheme = !document.documentElement.classList.contains('light-theme');
		const fontBody = `'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;

		let stylesheet = `
			html,
			body {
				background: transparent !important;
			}
			body {
				font-family: ${fontBody};
			}
		`;

		if (isDarkTheme) {
			stylesheet += `
				input {
					background-color: transparent !important;
					color: #EEF3FA !important;
					caret-color: #EEF3FA !important;
				}
				.bg-white {
					background-color: #0B101B !important;
				}
				.bg-gray-100,
				.bg-gray-50 {
					background-color: #111827 !important;
				}
				.text-neutral-900,
				.text-neutral-800,
				.text-neutral-700 {
					color: #EEF3FA !important;
				}
				.text-neutral-600,
				.text-neutral-500 {
					color: #96A2B5 !important;
				}
				.placeholder\\:text-gray-400::placeholder {
					color: #96A2B5 !important;
				}
				.hover\\:bg-gray-50:hover,
				.hover\\:bg-gray-100:hover {
					background-color: rgba(64, 156, 255, 0.08) !important;
				}
				.border-gray-200,
				.divide-gray-200 > :not([hidden]) ~ :not([hidden]) {
					border-color: #232C40 !important;
				}
			`;
		}

		return stylesheet;
	}
}
