/* prefs.js - Preferences window for the extension with window controls */
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

export default class DynamicPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        console.log('Dynamic Panel: Loading preferences window');
        
        // Create settings object - defensive programming
        const settings = this.getSettings('org.gnome.shell.extensions.dynamic-panel');
        if (!settings) {
            console.error('Dynamic Panel: Failed to load settings');
            this._showErrorMessage(window, 'Failed to load extension settings. Please ensure the extension is properly installed.');
            return;
        }
        
        console.log('Dynamic Panel: Settings loaded successfully');
        
        // Add window controls (minimize, maximize, close)
        this._addWindowControls(window);
        
        // Create a scrolled window
        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        });
        
        // Create main box
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
            spacing: 18,
        });
        
        scrolled.set_child(mainBox);
        window.set_content(scrolled);

        // Title with version info
        const titleLabel = new Gtk.Label({
            label: '<b>Dynamic Panel Transparency Settings</b>\n<small>v1.0.0 - Intelligently adjusts panel transparency</small>',
            use_markup: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.CENTER,
        });
        mainBox.append(titleLabel);

        // Add separator
        const separator1 = new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 6,
            margin_bottom: 6,
        });
        mainBox.append(separator1);

        // Transparency Settings Group
        const transparencyGroup = this._createGroup(
            'Panel Transparency Settings', 
            'Configure how the panel appears in different window states'
        );
        mainBox.append(transparencyGroup);

        // Transparent opacity setting (no windows)
        const transparentBox = this._createSpinSetting(
            'Transparent Opacity',
            'Panel opacity when no windows are present (0 = fully transparent, 100 = opaque)',
            settings,
            'transparent-opacity',
            0, 100, 5
        );
        if (transparentBox) transparencyGroup.append(transparentBox);

        // Semi-opaque opacity setting (windows present)
        const semiOpaqueBox = this._createSpinSetting(
            'Semi-Opaque Opacity', 
            'Panel opacity when windows are present but not fullscreen',
            settings,
            'semi-opaque-opacity',
            0, 100, 5
        );
        if (semiOpaqueBox) transparencyGroup.append(semiOpaqueBox);

        // Opaque opacity setting (fullscreen/overview)
        const opaqueBox = this._createSpinSetting(
            'Opaque Opacity',
            'Panel opacity in fullscreen mode or activities overview',
            settings,
            'opaque-opacity', 
            0, 100, 5
        );
        if (opaqueBox) transparencyGroup.append(opaqueBox);

        // Animation duration setting
        const animationBox = this._createSpinSetting(
            'Animation Duration',
            'Duration of transparency transitions in milliseconds (0 = instant)',
            settings,
            'animation-duration',
            0, 1000, 50
        );
        if (animationBox) transparencyGroup.append(animationBox);

        // Add separator
        const separator2 = new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 12,
            margin_bottom: 6,
        });
        mainBox.append(separator2);

        // Behavior Settings Group
        const behaviorGroup = this._createGroup(
            'Behavior Settings', 
            'Configure how the extension responds to different window states'
        );
        mainBox.append(behaviorGroup);

        // Maximized windows make panel opaque
        const maximizedBox = this._createSwitchSetting(
            'Maximized Windows Make Panel Opaque',
            'When enabled, maximized windows will make the panel fully opaque (like fullscreen mode)',
            settings,
            'maximized-opaque'
        );
        if (maximizedBox) behaviorGroup.append(maximizedBox);

        // Enable debug logging
        const debugBox = this._createSwitchSetting(
            'Enable Debug Logging',
            'Show detailed console output in system logs for troubleshooting issues',
            settings,
            'debug-logging'
        );
        if (debugBox) behaviorGroup.append(debugBox);

        // Add separator
        const separator3 = new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 12,
            margin_bottom: 6,
        });
        mainBox.append(separator3);

        // Help and info section
        const infoGroup = this._createInfoSection();
        mainBox.append(infoGroup);

        console.log('Dynamic Panel: Preferences window setup completed');
    }

    _addWindowControls(window) {
        // Create headerbar with window controls
        const headerBar = new Gtk.HeaderBar({
            show_title_buttons: true,
            title_widget: new Gtk.Label({
                label: 'Dynamic Panel Transparency',
                css_classes: ['title'],
            }),
        });

        // Create minimize button
        const minimizeButton = new Gtk.Button({
            icon_name: 'window-minimize-symbolic',
            tooltip_text: 'Minimize',
            css_classes: ['suggested-action'],
        });
        minimizeButton.connect('clicked', () => {
            if (window && typeof window.minimize === 'function') {
                window.minimize();
            }
        });

        // Create maximize/restore button
        const maximizeButton = new Gtk.Button({
            icon_name: window.maximized ? 'window-restore-symbolic' : 'window-maximize-symbolic',
            tooltip_text: window.maximized ? 'Restore' : 'Maximize',
            css_classes: ['suggested-action'],
        });
        maximizeButton.connect('clicked', () => {
            if (!window) return;
            
            if (window.maximized) {
                if (typeof window.unmaximize === 'function') {
                    window.unmaximize();
                    maximizeButton.icon_name = 'window-maximize-symbolic';
                    maximizeButton.tooltip_text = 'Maximize';
                }
            } else {
                if (typeof window.maximize === 'function') {
                    window.maximize();
                    maximizeButton.icon_name = 'window-restore-symbolic';
                    maximizeButton.tooltip_text = 'Restore';
                }
            }
        });

        // Create close button
        const closeButton = new Gtk.Button({
            icon_name: 'window-close-symbolic',
            tooltip_text: 'Close',
            css_classes: ['destructive-action'],
        });
        closeButton.connect('clicked', () => {
            if (window && typeof window.close === 'function') {
                window.close();
            }
        });

        // Add buttons to headerbar
        headerBar.pack_start(minimizeButton);
        headerBar.pack_start(maximizeButton);
        headerBar.pack_end(closeButton);

        // Set the headerbar
        if (typeof window.set_titlebar === 'function') {
            window.set_titlebar(headerBar);
        }

        // Connect to window state changes to update maximize button
        const stateHandler = () => {
            maximizeButton.icon_name = window.maximized ? 'window-restore-symbolic' : 'window-maximize-symbolic';
            maximizeButton.tooltip_text = window.maximized ? 'Restore' : 'Maximize';
        };
        
        if (window && typeof window.connect === 'function') {
            window.connect('notify::maximized', stateHandler);
        }
    }

    _createGroup(title, subtitle) {
        const group = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
            margin_start: 6,
            margin_end: 6,
            margin_top: 6,
            margin_bottom: 6,
        });

        // Group title
        const titleLabel = new Gtk.Label({
            label: `<b>${title}</b>`,
            use_markup: true,
            halign: Gtk.Align.START,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
        });
        group.append(titleLabel);

        // Group subtitle
        if (subtitle) {
            const subtitleLabel = new Gtk.Label({
                label: subtitle,
                halign: Gtk.Align.START,
                wrap: true,
                css_classes: ['dim-label'],
                margin_start: 12,
                margin_end: 12,
                margin_bottom: 6,
            });
            group.append(subtitleLabel);
        }

        return group;
    }

    _createSpinSetting(title, subtitle, settings, key, min, max, step) {
        // Defensive check for settings and required methods
        if (!settings || typeof settings.get_int !== 'function') {
            console.error(`Dynamic Panel: Cannot create spin setting ${key} - settings not available`);
            return null;
        }

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 18,
            margin_end: 18,
            margin_top: 6,
            margin_bottom: 6,
        });

        const labelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });

        const titleLabel = new Gtk.Label({
            label: title,
            halign: Gtk.Align.START,
            css_classes: ['heading'],
        });
        labelBox.append(titleLabel);

        if (subtitle) {
            const subtitleLabel = new Gtk.Label({
                label: subtitle,
                halign: Gtk.Align.START,
                wrap: true,
                css_classes: ['dim-label', 'caption'],
            });
            labelBox.append(subtitleLabel);
        }

        // Get current value with fallback
        let currentValue = min;
        const getValue = settings.get_int(key);
        if (typeof getValue === 'number' && getValue >= min && getValue <= max) {
            currentValue = getValue;
        }

        const spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: min,
                upper: max,
                step_increment: step,
                page_increment: step * 2,
                value: currentValue,
            }),
            valign: Gtk.Align.CENTER,
            width_chars: 5,
        });

        // Bind settings - defensive programming
        if (typeof settings.bind === 'function') {
            settings.bind(key, spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);
        } else {
            console.error(`Dynamic Panel: Failed to bind setting ${key} - bind method not available`);
            return null;
        }

        box.append(labelBox);
        box.append(spinButton);

        return box;
    }

    _createSwitchSetting(title, subtitle, settings, key) {
        // Defensive check for settings and required methods
        if (!settings || typeof settings.get_boolean !== 'function') {
            console.error(`Dynamic Panel: Cannot create switch setting ${key} - settings not available`);
            return null;
        }

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 18,
            margin_end: 18,
            margin_top: 6,
            margin_bottom: 6,
        });

        const labelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });

        const titleLabel = new Gtk.Label({
            label: title,
            halign: Gtk.Align.START,
            css_classes: ['heading'],
        });
        labelBox.append(titleLabel);

        if (subtitle) {
            const subtitleLabel = new Gtk.Label({
                label: subtitle,
                halign: Gtk.Align.START,
                wrap: true,
                css_classes: ['dim-label', 'caption'],
            });
            labelBox.append(subtitleLabel);
        }

        // Get current value with fallback
        const currentValue = settings.get_boolean(key) || false;

        const switchWidget = new Gtk.Switch({
            active: currentValue,
            valign: Gtk.Align.CENTER,
        });

        // Bind settings - defensive programming
        if (typeof settings.bind === 'function') {
            settings.bind(key, switchWidget, 'active', Gio.SettingsBindFlags.DEFAULT);
        } else {
            console.error(`Dynamic Panel: Failed to bind setting ${key} - bind method not available`);
            return null;
        }

        box.append(labelBox);
        box.append(switchWidget);

        return box;
    }

    _createInfoSection() {
        const infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
            margin_start: 6,
            margin_end: 6,
        });

        // Info title
        const titleLabel = new Gtk.Label({
            label: '<b>About & Help</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            margin_start: 12,
            margin_top: 12,
        });
        infoBox.append(titleLabel);

        // Info content
        const infoLabel = new Gtk.Label({
            label: 'This extension automatically adjusts the panel transparency based on window activity:\n\n' +
                   '• <b>Transparent</b>: No windows open\n' +
                   '• <b>Semi-opaque</b>: Windows present\n' +
                   '• <b>Opaque</b>: Fullscreen or overview mode\n\n' +
                   'Enable debug logging to troubleshoot issues via system logs.',
            use_markup: true,
            halign: Gtk.Align.START,
            wrap: true,
            css_classes: ['dim-label'],
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 12,
        });
        infoBox.append(infoLabel);

        return infoBox;
    }

    _showErrorMessage(window, message) {
        const errorBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });

        const errorLabel = new Gtk.Label({
            label: `<b>Extension Error</b>\n\n${message}`,
            use_markup: true,
            halign: Gtk.Align.CENTER,
            wrap: true,
            css_classes: ['dim-label'],
        });
        errorBox.append(errorLabel);

        if (window && typeof window.set_content === 'function') {
            window.set_content(errorBox);
        }
    }
}
