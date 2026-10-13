/**
 * Include all controls and styles used throughout the theme
 * Injected in 'default.hbs'
 *
 * Should include stuff like fonts, styles and controls that
 * appead across the theme and are not specific to one site.
 */

declare global {
	interface Window {
		CANDIDUS: InjectedPluginOptions;
		umami: any
	}
}

import { InjectedPluginOptions } from './scripts/core/base/Plugin';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inconsolata';

import './images/user.png';

import ThemeControl from './scripts/modules/theme/ThemeControl';
import FooterSocialIconsPlugin from './scripts/plugins/FooterSocialIcons';
import SidebarControl from './scripts/modules/sidebar/SidebarControl';
import PortalControl from './scripts/plugins/PortalControl';

const themeButton = new ThemeControl();
themeButton.init();

const footerSocialIconsPlugin = new FooterSocialIconsPlugin('#footer-social');
const sidebarControl = new SidebarControl({
	toggleButton: '#menubutton',
	sidebarElement: '#sidebar',
});
const portalControl = new PortalControl();

footerSocialIconsPlugin.init();
sidebarControl.init();
portalControl.init();
