/* prefs.js - Preferences window for the extension */
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export default class DynamicPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create settings object
        const settings = this.getSettings('org.gnome.shell.extensions.dynamic-panel');
        
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

        // Title
        const titleLabel = new Gtk.Label({
            label: '<b>Dynamic Panel Transparency Settings</b>',
            use_markup: true,
            halign: Gtk.Align.START,
        });
        mainBox.append(titleLabel);

        // Transparency Settings Group
        const transparencyGroup = this._createGroup('Panel Transparency Settings', 'Configure how the panel appears in different states');
        mainBox.append(transparencyGroup);

        // Transparent opacity setting (no windows)
        const transparentBox = this._createSpinSetting(
            'Transparent Opacity',
            'Opacity when no windows are present (0 = fully transparent, 100 = opaque)',
            settings,
            'transparent-opacity',
            0, 100, 5
        );
        transparencyGroup.append(transparentBox);

        // Semi-opaque opacity setting (windows present)
        const semiOpaqueBox = this._createSpinSetting(
            'Semi-Opaque Opacity', 
            'Opacity when windows are present',
            settings,
            'semi-opaque-opacity',
            0, 100, 5
        );
        transparencyGroup.append(semiOpaqueBox);

        // Opaque opacity setting (fullscreen/overview)
        const opaqueBox = this._createSpinSetting(
            'Opaque Opacity',
            'Opacity in fullscreen mode or overview',
            settings,
            'opaque-opacity', 
            0, 100, 5
        );
        transparencyGroup.append(opaqueBox);

        // Animation duration setting
        const animationBox = this._createSpinSetting(
            'Animation Duration',
            'Duration of transparency transitions in milliseconds',
            settings,
            'animation-duration',
            0, 1000, 50
        );
        transparencyGroup.append(animationBox);

        // Behavior Settings Group
        const behaviorGroup = this._createGroup('Behavior Settings', 'Configure how the extension responds to different window states');
        mainBox.append(behaviorGroup);

        // Maximized windows make panel opaque
        const maximizedBox = this._createSwitchSetting(
            'Maximized Windows Make Panel Opaque',
            'When enabled, maximized windows will also make the panel fully opaque (like fullscreen)',
            settings,
            'maximized-opaque'
        );
        behaviorGroup.append(maximizedBox);

        // Enable debug logging
        const debugBox = this._createSwitchSetting(
            'Enable Debug Logging',
            'Show detailed console output for troubleshooting',
            settings,
            'debug-logging'
        );
        behaviorGroup.append(debugBox);
    }

    _createGroup(title, subtitle) {
        const group = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        });

        // Group title
        const titleLabel = new Gtk.Label({
            label: `<b>${title}</b>`,
            use_markup: true,
            halign: Gtk.Align.START,
        });
        group.append(titleLabel);

        // Group subtitle
        if (subtitle) {
            const subtitleLabel = new Gtk.Label({
                label: subtitle,
                halign: Gtk.Align.START,
                wrap: true,
                css_classes: ['dim-label'],
            });
            group.append(subtitleLabel);
        }

        return group;
    }

    _createSpinSetting(title, subtitle, settings, key, min, max, step) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
        });

        const labelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });

        const titleLabel = new Gtk.Label({
            label: title,
            halign: Gtk.Align.START,
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

        const spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: min,
                upper: max,
                step_increment: step,
                page_increment: step * 2,
                value: settings.get_int(key),
            }),
            valign: Gtk.Align.CENTER,
        });

        settings.bind(key, spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

        box.append(labelBox);
        box.append(spinButton);

        return box;
    }

    _createSwitchSetting(title, subtitle, settings, key) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
        });

        const labelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            valign: Gtk.Align.CENTER,
        });

        const titleLabel = new Gtk.Label({
            label: title,
            halign: Gtk.Align.START,
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

        const switchWidget = new Gtk.Switch({
            active: settings.get_boolean(key),
            valign: Gtk.Align.CENTER,
        });

        settings.bind(key, switchWidget, 'active', Gio.SettingsBindFlags.DEFAULT);

        box.append(labelBox);
        box.append(switchWidget);

        return box;
    }
}
