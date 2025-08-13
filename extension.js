/* extension.js - Improved window detection for GNOME Shell 46 with settings support */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';

export default class DynamicPanelExtension extends Extension {
    enable() {
        console.log('Dynamic Panel: Extension enabled');
        
        this._originalStyle = null;
        this._timeoutId = null;
        this._signalIds = [];
        this._currentState = null;
        this._settings = null;
        
        // Initialize settings
        this._settings = this.getSettings('org.gnome.shell.extensions.dynamic-panel');
        
        // Store original panel style
        this._originalStyle = Main.panel.get_style() || '';
        console.log('Dynamic Panel: Original style stored');
        
        // Connect to signals
        this._connectSignals();
        
        // Set initial state after a brief delay using GLib timeout
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._updatePanelState();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
        
        console.log('Dynamic Panel: Setup completed successfully');
    }

    disable() {
        console.log('Dynamic Panel: Extension disabled');
        
        // Clean up timeout - this is critical for EGO guidelines
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        // Disconnect all signals
        this._disconnectSignals();
        
        // Restore original panel style
        if (this._originalStyle !== null) {
            Main.panel.set_style(this._originalStyle);
        }
        
        // Clean up settings
        this._settings = null;
        
        console.log('Dynamic Panel: Cleanup completed');
    }

    _connectSignals() {
        // Monitor window creation
        let id1 = global.display.connect('window-created', (display, win) => {
            this._log('Window created:', win.get_title());
            // Connect to fullscreen changes for this specific window
            this._connectWindowSignals(win);
            this._scheduleUpdate();
        });
        this._signalIds.push([global.display, id1]);

        // Monitor window destruction
        let id2 = global.display.connect('window-left-monitor', (display, monitorIndex, win) => {
            this._log('Window left monitor:', win?.get_title() || 'unknown');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.display, id2]);

        // Additional window monitoring
        let id7 = global.window_manager.connect('map', (wm, actor) => {
            const win = actor.meta_window;
            this._log('Window mapped:', win?.get_title() || 'unknown');
            this._connectWindowSignals(win);
            this._scheduleUpdate();
        });
        this._signalIds.push([global.window_manager, id7]);

        let id8 = global.window_manager.connect('destroy', (wm, actor) => {
            this._log('Window destroyed');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.window_manager, id8]);

        // Monitor window minimize/unminimize
        let id9 = global.window_manager.connect('minimize', (wm, actor) => {
            this._log('Window minimized');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.window_manager, id9]);

        let id10 = global.window_manager.connect('unminimize', (wm, actor) => {
            this._log('Window unminimized');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.window_manager, id10]);

        // Monitor overview state
        let id3 = Main.overview.connect('showing', () => {
            this._log('Overview showing');
            this._setPanelState('opaque', 'overview showing');
        });
        this._signalIds.push([Main.overview, id3]);

        let id4 = Main.overview.connect('hidden', () => {
            this._log('Overview hidden');
            this._scheduleUpdate();
        });
        this._signalIds.push([Main.overview, id4]);

        // Monitor global fullscreen changes
        let id5 = global.display.connect('in-fullscreen-changed', () => {
            this._log('Global fullscreen state changed');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.display, id5]);

        // Monitor workspace changes
        let id6 = global.workspace_manager.connect('active-workspace-changed', () => {
            this._log('Active workspace changed');
            this._scheduleUpdate();
        });
        this._signalIds.push([global.workspace_manager, id6]);

        // Connect signals for existing windows
        this._connectExistingWindowSignals();

        this._log('All signals connected successfully');
    }

    _disconnectSignals() {
        this._signalIds.forEach(([object, id]) => {
            if (object && id) {
                object.disconnect(id);
            }
        });
        this._signalIds = [];
        console.log('Dynamic Panel: All signals disconnected');
    }

    _connectExistingWindowSignals() {
        // Connect to existing windows
        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows();
        
        windows.forEach(win => {
            if (win.get_window_type() === Meta.WindowType.NORMAL) {
                this._connectWindowSignals(win);
            }
        });
    }

    _connectWindowSignals(win) {
        if (!win || win._dynamicPanelSignalsConnected) {
            return;
        }

        // Mark this window as having signals connected
        win._dynamicPanelSignalsConnected = true;

        // Connect to fullscreen property changes
        let id1 = win.connect('notify::fullscreen', () => {
            this._log(`Window "${win.get_title()}" fullscreen changed to: ${win.is_fullscreen()}`);
            this._scheduleUpdate();
        });

        // Connect to window state changes (maximized, etc.)
        let id2 = win.connect('notify::maximized-horizontally', () => {
            this._log(`Window "${win.get_title()}" horizontal maximization changed`);
            this._scheduleUpdate();
        });

        let id3 = win.connect('notify::maximized-vertically', () => {
            this._log(`Window "${win.get_title()}" vertical maximization changed`);
            this._scheduleUpdate();
        });

        // Store signal IDs for cleanup
        this._signalIds.push([win, id1]);
        this._signalIds.push([win, id2]);
        this._signalIds.push([win, id3]);

        this._log(`Connected signals for window: "${win.get_title()}"`);
    }

    _log(message, ...args) {
        if (this._settings?.get_boolean('debug-logging')) {
            console.log('Dynamic Panel:', message, ...args);
        }
    }

    _scheduleUpdate() {
        // Debounce rapid updates - clean up existing timeout first
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
        }
        
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            this._log('Scheduled update triggered');
            this._updatePanelState();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _updatePanelState() {
        this._log('Updating panel state...');
        
        // Don't update if overview is visible
        if (Main.overview.visible) {
            this._log('Overview is visible, skipping update');
            return;
        }

        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows();
        
        this._log(`Found ${windows.length} total windows`);
        
        // Filter for normal application windows (including minimized ones for counting)
        const normalWindows = windows.filter(win => {
            const isNormal = win.get_window_type() === Meta.WindowType.NORMAL;
            const isVisible = !win.is_hidden();
            const isOnWorkspace = win.located_on_workspace(workspace);
            const isOnPrimaryMonitor = win.get_monitor() === Main.layoutManager.primaryIndex;
            const wmClass = win.get_wm_class();
            
            // Exclude system/background windows that shouldn't affect panel transparency
            const isSystemWindow = wmClass === 'gjs' || wmClass === 'gnome-shell';
            
            const result = isNormal && isVisible && isOnWorkspace && isOnPrimaryMonitor && !isSystemWindow;
            
            if (result) {
                this._log(`Normal window found: "${win.get_title()}" - Type: ${win.get_window_type()}, Hidden: ${win.is_hidden()}, Minimized: ${win.minimized}, WM Class: ${wmClass}, Role: ${win.get_role()}`);
            } else if (isSystemWindow && isNormal && isVisible && isOnWorkspace && isOnPrimaryMonitor) {
                this._log(`System window ignored: "${win.get_title()}" - WM Class: ${wmClass}`);
            }
            
            return result;
        });

        // Filter for visible (non-minimized) normal windows
        const visibleWindows = normalWindows.filter(win => !win.minimized);

        this._log(`Found ${normalWindows.length} total normal windows, ${visibleWindows.length} visible`);

        // Check for fullscreen windows among visible windows
        const hasFullscreen = visibleWindows.some(win => {
            const isFullscreen = win.is_fullscreen();
            const isMaximized = win.maximized_horizontally && win.maximized_vertically;
            const maximizedOpaque = this._settings?.get_boolean('maximized-opaque') ?? false;
            
            if (isFullscreen) {
                this._log(`Fullscreen window found: "${win.get_title()}"`);
                return true;
            }
            
            // Check for maximized windows on primary monitor if setting is enabled
            if (maximizedOpaque && isMaximized && win.get_monitor() === Main.layoutManager.primaryIndex) {
                this._log(`Maximized window on primary monitor: "${win.get_title()}" (making panel opaque)`);
                return true;
            }
            
            return false;
        });

        // Additional check: Use global display fullscreen state as fallback
        const globalFullscreen = global.display.get_monitor_in_fullscreen(Main.layoutManager.primaryIndex);
        
        if (globalFullscreen) {
            this._log('Global fullscreen detected on primary monitor');
        }

        // Determine panel state based on visible windows
        if (hasFullscreen || globalFullscreen) {
            this._setPanelState('opaque', hasFullscreen ? 'fullscreen window present' : 'global fullscreen detected');
        } else if (visibleWindows.length > 0) {
            this._setPanelState('semi-opaque', `${visibleWindows.length} visible windows present`);
        } else {
            // No visible windows (either no windows at all, or all are minimized)
            if (normalWindows.length > 0) {
                this._setPanelState('transparent', `all ${normalWindows.length} windows are minimized`);
            } else {
                this._setPanelState('transparent', 'no windows present');
            }
        }
    }

    _setPanelState(state, reason) {
        if (this._currentState === state) {
            this._log(`State already ${state}, skipping`);
            return;
        }

        this._log(`Changing state from ${this._currentState} to ${state}`);
        this._currentState = state;

        let panelStyle = '';
        let opacity, animationDuration;

        // Get values from settings
        animationDuration = this._settings?.get_int('animation-duration') ?? 300;

        switch (state) {
            case 'transparent':
                opacity = this._settings?.get_int('transparent-opacity') / 100 ?? 0;
                panelStyle = `background-color: rgba(45, 45, 45, ${opacity}) !important; transition: background-color ${animationDuration}ms ease;`;
                break;

            case 'semi-opaque':
                opacity = this._settings?.get_int('semi-opaque-opacity') / 100 ?? 0.85;
                panelStyle = `background-color: rgba(45, 45, 45, ${opacity}) !important; transition: background-color ${animationDuration}ms ease;`;
                break;

            case 'opaque':
            default:
                opacity = this._settings?.get_int('opaque-opacity') / 100 ?? 1.0;
                panelStyle = `background-color: rgba(45, 45, 45, ${opacity}) !important; transition: background-color ${animationDuration}ms ease;`;
                break;
        }

        // Apply panel style
        Main.panel.set_style(panelStyle);

        this._log(`Successfully set to ${state} (${reason}) - Opacity: ${opacity}`);
    }
}
