/* prefs.js - Preferences window for GNOME Shell 46 with animation duration setting removed */
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';

export default class DynamicPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        console.log('Dynamic Panel: Loading preferences window');
        
        // Set up the window properly for GNOME 46
        window.set_default_size(600, 650); // Reduced height since we removed one setting
        window.set_title('Dynamic Panel Transparency');
        
        // Create settings object - defensive programming
        const settings = this.getSettings('org.gnome.shell.extensions.dynamic-panel');
        if (!settings) {
            console.error('Dynamic Panel: Failed to load settings');
            this._showErrorMessage(window, 'Failed to load extension settings. Please ensure the extension is properly installed.');
            return;
        }
        
        console.log('Dynamic Panel: Settings loaded successfully');
        
        // Create main page using Adw.PreferencesPage (GNOME 46 standard)
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        
        // Add transparency settings group
        const transparencyGroup = new Adw.PreferencesGroup({
            title: 'Panel Transparency Settings',
            description: 'Configure how the panel appears in different window states',
        });
        page.add(transparencyGroup);

        // Transparent opacity setting (no windows)
        const transparentRow = new Adw.SpinRow({
            title: 'Transparent Opacity',
            subtitle: 'Panel opacity when no windows are present (0 = fully transparent, 100 = opaque)',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 5,
                page_increment: 10,
                value: settings.get_int('transparent-opacity'),
            }),
        });
        settings.bind('transparent-opacity', transparentRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        transparencyGroup.add(transparentRow);

        // Semi-opaque opacity setting (windows present)
        const semiOpaqueRow = new Adw.SpinRow({
            title: 'Semi-Opaque Opacity',
            subtitle: 'Panel opacity when windows are present but not fullscreen',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 5,
                page_increment: 10,
                value: settings.get_int('semi-opaque-opacity'),
            }),
        });
        settings.bind('semi-opaque-opacity', semiOpaqueRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        transparencyGroup.add(semiOpaqueRow);

        // Opaque opacity setting (fullscreen/overview)
        const opaqueRow = new Adw.SpinRow({
            title: 'Opaque Opacity',
            subtitle: 'Panel opacity in fullscreen mode or activities overview',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 5,
                page_increment: 10,
                value: settings.get_int('opaque-opacity'),
            }),
        });
        settings.bind('opaque-opacity', opaqueRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        transparencyGroup.add(opaqueRow);

        // Behavior Settings Group
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior Settings',
            description: 'Configure how the extension responds to different window states',
        });
        page.add(behaviorGroup);

        // Maximized windows make panel opaque
        const maximizedRow = new Adw.SwitchRow({
            title: 'Maximized Windows Make Panel Opaque',
            subtitle: 'When enabled, maximized windows will make the panel fully opaque (like fullscreen mode)',
            active: settings.get_boolean('maximized-opaque'),
        });
        settings.bind('maximized-opaque', maximizedRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(maximizedRow);

        // Enable debug logging
        const debugRow = new Adw.SwitchRow({
            title: 'Enable Debug Logging',
            subtitle: 'Show detailed console output in system logs for troubleshooting issues',
            active: settings.get_boolean('debug-logging'),
        });
        settings.bind('debug-logging', debugRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(debugRow);

        // Help and info section
        const infoGroup = new Adw.PreferencesGroup({
            title: 'About & Help',
        });
        page.add(infoGroup);

        // Create info row with expandable content
        const infoRow = new Adw.ExpanderRow({
            title: 'How It Works',
            subtitle: 'Learn about the extension behavior',
        });
        infoGroup.add(infoRow);

        // Info content as a label inside the expander
        const infoLabel = new Gtk.Label({
            label: 'This extension automatically adjusts the panel transparency based on window activity:\n\n' +
                   '• <b>Transparent</b>: No windows open\n' +
                   '• <b>Semi-opaque</b>: Windows present\n' +
                   '• <b>Opaque</b>: Fullscreen or overview mode\n\n' +
                   'Transitions between states use a smooth 300ms animation.\n\n' +
                   'Enable debug logging to troubleshoot issues via system logs:\n' +
                   '<tt>journalctl -f -o cat /usr/bin/gnome-shell | grep "Dynamic Panel"</tt>',
            use_markup: true,
            wrap: true,
            halign: Gtk.Align.START,
            margin_start: 12,
            margin_end: 12,
            margin_top: 6,
            margin_bottom: 12,
        });
        infoRow.add_row(infoLabel);

        // Version info row
        const versionRow = new Adw.ActionRow({
            title: 'Version',
            subtitle: '1.0.0 - For GNOME Shell 46',
        });
        
        // Add GitHub link button
        const githubButton = new Gtk.Button({
            label: 'GitHub',
            css_classes: ['pill'],
            valign: Gtk.Align.CENTER,
        });
        githubButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://github.com/vmelonn/dynamic-panel-transparency', Gtk.get_current_event_time());
        });
        versionRow.add_suffix(githubButton);
        infoGroup.add(versionRow);

        // Add the page to the window
        window.add(page);
        
        console.log('Dynamic Panel: Preferences window setup completed');
    }

    _showErrorMessage(window, message) {
        const page = new Adw.PreferencesPage();
        
        const errorGroup = new Adw.PreferencesGroup();
        page.add(errorGroup);
        
        const errorRow = new Adw.ActionRow({
            title: 'Extension Error',
            subtitle: message,
        });
        errorGroup.add(errorRow);

        window.add(page);
    }
}
