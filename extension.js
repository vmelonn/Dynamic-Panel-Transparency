/* extension.js - Fixed animation duration handling for GNOME Shell 46 */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';

export default class DynamicPanelExtension extends Extension {
    enable() {
        console.log('Dynamic Panel: Extension enabled');
        
        this._originalStyle = null;
        this._timeoutId = null;
        this._animationTimeoutId = null;
        this._signalIds = [];
        this._settingsSignalIds = [];
        this._currentState = null;
        this._currentOpacity = null;
        this._settings = null;
        this._pendingStyleUpdate = false;
        
        // Initialize settings - let it fail gracefully if schema is missing
        this._settings = this.getSettings('org.gnome.shell.extensions.dynamic-panel');
        if (this._settings) {
            console.log('Dynamic Panel: Settings loaded successfully');
            // Connect to settings changes for real-time updates
            this._connectSettingsSignals();
        } else {
            console.log('Dynamic Panel: Settings not available, using defaults');
        }
        
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
        
        // Clean up all timeouts
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }
        
        // Disconnect all signals
        this._disconnectSignals();
        this._disconnectSettingsSignals();
        
        // Restore original panel style
        if (this._originalStyle !== null) {
            Main.panel.set_style(this._originalStyle);
        }
        
        // Clean up settings
        this._settings = null;
        
        console.log('Dynamic Panel: Cleanup completed');
    }

    _connectSettingsSignals() {
        if (!this._settings) return;
        
        // Listen for changes to opacity settings - these need immediate updates
        const opacitySettings = [
            'transparent-opacity',
            'semi-opaque-opacity', 
            'opaque-opacity'
        ];
        
        opacitySettings.forEach(key => {
            const signalId = this._settings.connect(`changed::${key}`, () => {
                this._log(`Opacity setting '${key}' changed, forcing panel update`);
                // Force immediate update for opacity changes
                this._forceUpdatePanelState();
            });
            this._settingsSignalIds.push(signalId);
        });
        
        // Handle animation duration changes specially
        const animationSignalId = this._settings.connect('changed::animation-duration', () => {
            this._log('Animation duration changed, updating smoothly');
            // For animation duration changes, we need to be more careful
            this._handleAnimationDurationChange();
        });
        this._settingsSignalIds.push(animationSignalId);
        
        // Handle maximized-opaque setting
        const maximizedSignalId = this._settings.connect('changed::maximized-opaque', () => {
            this._log('Maximized opaque setting changed, forcing panel update');
            this._forceUpdatePanelState();
        });
        this._settingsSignalIds.push(maximizedSignalId);
        
        // Also listen to debug logging changes
        const debugSignalId = this._settings.connect('changed::debug-logging', () => {
            this._log('Debug logging setting changed');
        });
        this._settingsSignalIds.push(debugSignalId);
        
        this._log(`Connected to ${this._settingsSignalIds.length} settings signals`);
    }

    _handleAnimationDurationChange() {
        // When animation duration changes, we need to handle it carefully
        // to avoid interrupting ongoing animations badly
        
        // Clear any pending animation timeout
        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }
        
        // Get the new animation duration
        const newDuration = this._getSetting('animation-duration', 300);
        this._log(`Animation duration changed to: ${newDuration}ms`);
        
        if (newDuration === 0) {
            // If animation is disabled, apply immediately
            this._log('Animation disabled, applying immediate update');
            this._forceUpdatePanelState();
        } else {
            // If we have a current state, smoothly transition to it with new duration
            if (this._currentState) {
                this._log(`Smoothly updating animation duration for current state: ${this._currentState}`);
                
                // Schedule a smooth update after a brief delay to let any current animation settle
                this._animationTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                    this._setPanelState(this._currentState, 'animation duration changed', true);
                    this._animationTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
        }
    }

    _disconnectSettingsSignals() {
        if (this._settings && this._settingsSignalIds.length > 0) {
            this._settingsSignalIds.forEach(signalId => {
                try {
                    this._settings.disconnect(signalId);
                } catch (e) {
                    console.error('Dynamic Panel: Error disconnecting settings signal:', e);
                }
            });
            this._settingsSignalIds = [];
            console.log('Dynamic Panel: Settings signals disconnected');
        }
    }

    _connectSignals() {
        // Monitor window creation
        let id1 = global.display.connect('window-created', (display, win) => {
            this._log('Window created:', win.get_title());
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
            if (object && id && typeof object.disconnect === 'function') {
                object.disconnect(id);
            }
        });
        this._signalIds = [];
        console.log('Dynamic Panel: All signals disconnected');
    }

    _connectExistingWindowSignals() {
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

        win._dynamicPanelSignalsConnected = true;

        let id1 = win.connect('notify::fullscreen', () => {
            this._log(`Window "${win.get_title()}" fullscreen changed to: ${win.is_fullscreen()}`);
            this._scheduleUpdate();
        });

        let id2 = win.connect('notify::maximized-horizontally', () => {
            this._log(`Window "${win.get_title()}" horizontal maximization changed`);
            this._scheduleUpdate();
        });

        let id3 = win.connect('notify::maximized-vertically', () => {
            this._log(`Window "${win.get_title()}" vertical maximization changed`);
            this._scheduleUpdate();
        });

        this._signalIds.push([win, id1]);
        this._signalIds.push([win, id2]);
        this._signalIds.push([win, id3]);

        this._log(`Connected signals for window: "${win.get_title()}"`);
    }

    _log(message, ...args) {
        if (this._getSetting('debug-logging', false, 'boolean')) {
            console.log('Dynamic Panel:', message, ...args);
        }
    }

    _getSetting(key, defaultValue, type = 'int') {
        if (!this._settings || typeof this._settings.get_int !== 'function') {
            return defaultValue;
        }
        
        const getter = type === 'boolean' ? 'get_boolean' : 'get_int';
        
        if (typeof this._settings[getter] !== 'function') {
            return defaultValue;
        }
        
        return this._settings[getter](key) ?? defaultValue;
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

    _forceUpdatePanelState() {
        // Force immediate update without debouncing - used for settings changes
        this._log('Force updating panel state due to settings change');
        
        // Clean up any scheduled updates
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        // Update immediately
        this._updatePanelState();
    }

    _updatePanelState() {
        this._log('Updating panel state...');
        
        if (Main.overview.visible) {
            this._log('Overview is visible, skipping update');
            return;
        }

        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows();
        
        this._log(`Found ${windows.length} total windows`);
        
        const normalWindows = windows.filter(win => {
            const isNormal = win.get_window_type() === Meta.WindowType.NORMAL;
            const isVisible = !win.is_hidden();
            const isOnWorkspace = win.located_on_workspace(workspace);
            const isOnPrimaryMonitor = win.get_monitor() === Main.layoutManager.primaryIndex;
            const wmClass = win.get_wm_class();
            const isSystemWindow = wmClass === 'gjs' || wmClass === 'gnome-shell';
            
            const result = isNormal && isVisible && isOnWorkspace && isOnPrimaryMonitor && !isSystemWindow;
            
            if (result) {
                this._log(`Normal window found: "${win.get_title()}" - Type: ${win.get_window_type()}, Hidden: ${win.is_hidden()}, Minimized: ${win.minimized}, WM Class: ${wmClass}, Role: ${win.get_role()}`);
            } else if (isSystemWindow && isNormal && isVisible && isOnWorkspace && isOnPrimaryMonitor) {
                this._log(`System window ignored: "${win.get_title()}" - WM Class: ${wmClass}`);
            }
            
            return result;
        });

        const visibleWindows = normalWindows.filter(win => !win.minimized);

        this._log(`Found ${normalWindows.length} total normal windows, ${visibleWindows.length} visible`);

        const hasFullscreen = visibleWindows.some(win => {
            const isFullscreen = win.is_fullscreen();
            const isMaximized = win.maximized_horizontally && win.maximized_vertically;
            const maximizedOpaque = this._getSetting('maximized-opaque', false, 'boolean');
            
            if (isFullscreen) {
                this._log(`Fullscreen window found: "${win.get_title()}"`);
                return true;
            }
            
            if (maximizedOpaque && isMaximized && win.get_monitor() === Main.layoutManager.primaryIndex) {
                this._log(`Maximized window on primary monitor: "${win.get_title()}" (making panel opaque)`);
                return true;
            }
            
            return false;
        });

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
            if (normalWindows.length > 0) {
                this._setPanelState('transparent', `all ${normalWindows.length} windows are minimized`);
            } else {
                this._setPanelState('transparent', 'no windows present');
            }
        }
    }

    _setPanelState(state, reason, forceUpdate = false) {
        let opacity;
        const animationDuration = this._getSetting('animation-duration', 300);

        // Determine target opacity based on state
        switch (state) {
            case 'transparent':
                opacity = this._getSetting('transparent-opacity', 0) / 100;
                break;
            case 'semi-opaque':
                opacity = this._getSetting('semi-opaque-opacity', 85) / 100;
                break;
            case 'opaque':
            default:
                opacity = this._getSetting('opaque-opacity', 100) / 100;
                break;
        }

        // Check if we need to update
        const stateChanged = this._currentState !== state;
        const opacityChanged = this._currentOpacity !== opacity;
        const shouldUpdate = stateChanged || opacityChanged || forceUpdate;

        if (!shouldUpdate) {
            this._log(`No change needed - State: ${state}, Opacity: ${opacity}`);
            return;
        }

        // Update tracking variables
        const previousState = this._currentState;
        this._currentState = state;
        this._currentOpacity = opacity;

        // Log the change
        if (stateChanged) {
            this._log(`State changed: ${previousState} → ${state} (${reason})`);
        } else if (opacityChanged) {
            this._log(`Opacity changed for ${state} state: ${this._currentOpacity} → ${opacity}`);
        } else if (forceUpdate) {
            this._log(`Force updating ${state} state (${reason})`);
        }

        // Create the panel style with proper transition handling
        let panelStyle;
        
        if (animationDuration === 0) {
            // No animation - apply immediately
            panelStyle = `background-color: rgba(45, 45, 45, ${opacity}) !important;`;
            this._log(`Applied immediate style - Opacity: ${opacity}`);
        } else {
            // With animation - ensure smooth transition
            panelStyle = `background-color: rgba(45, 45, 45, ${opacity}) !important; transition: background-color ${animationDuration}ms ease !important;`;
            this._log(`Applied animated style - Opacity: ${opacity}, Duration: ${animationDuration}ms`);
        }

        // Apply panel style with error handling
        if (Main.panel && typeof Main.panel.set_style === 'function') {
            try {
                Main.panel.set_style(panelStyle);
                this._log(`✓ Successfully applied ${state} style`);
            } catch (error) {
                console.error('Dynamic Panel: Error applying panel style:', error);
            }
        } else {
            console.error('Dynamic Panel: Main.panel.set_style not available');
        }
    }
}
