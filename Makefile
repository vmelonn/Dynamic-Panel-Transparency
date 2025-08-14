# Makefile for Dynamic Panel Transparency GNOME Extension

UUID = dynamic-panel@vmelonn.github.io
SCHEMA_DIR = schemas
BUILD_DIR = build
INSTALL_DIR = ~/.local/share/gnome-shell/extensions/$(UUID)

# Default target
all: help

# Display help
help:
	@echo "Dynamic Panel Transparency - Development Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  compile-schemas  - Compile GSettings schemas"
	@echo "  install         - Install extension locally for testing"
	@echo "  uninstall       - Remove extension from local system"
	@echo "  enable          - Enable the extension"
	@echo "  disable         - Disable the extension"
	@echo "  restart         - Restart the extension (disable/enable)"
	@echo "  package         - Create distribution zip file"
	@echo "  clean           - Clean build artifacts"
	@echo "  dev             - Quick development cycle (compile + install + restart)"
	@echo "  logs            - Show extension logs"
	@echo "  prefs           - Open extension preferences"
	@echo "  status          - Show extension status"
	@echo "  validate        - Validate extension files"

# Compile GSettings schemas
compile-schemas:
	@echo "Compiling schemas..."
	@if [ ! -f $(SCHEMA_DIR)/org.gnome.shell.extensions.dynamic-panel.gschema.xml ]; then \
		echo "Error: Schema file not found in $(SCHEMA_DIR)/"; \
		echo "Please ensure org.gnome.shell.extensions.dynamic-panel.gschema.xml exists in the schemas directory"; \
		exit 1; \
	fi
	@glib-compile-schemas $(SCHEMA_DIR)/
	@echo "Schemas compiled successfully"

# Install extension locally
install: compile-schemas
	@echo "Installing extension to $(INSTALL_DIR)..."
	@rm -rf $(INSTALL_DIR)
	@mkdir -p $(INSTALL_DIR)
	@cp metadata.json $(INSTALL_DIR)/
	@cp extension.js $(INSTALL_DIR)/
	@cp prefs.js $(INSTALL_DIR)/
	@cp -r $(SCHEMA_DIR) $(INSTALL_DIR)/
	@echo "Extension installed successfully"
	@echo ""
	@echo "Files installed:"
	@ls -la $(INSTALL_DIR)
	@echo ""
	@echo "Schema files:"
	@ls -la $(INSTALL_DIR)/$(SCHEMA_DIR)/

# Uninstall extension
uninstall:
	@echo "Uninstalling extension..."
	@rm -rf $(INSTALL_DIR)
	@echo "Extension uninstalled"

# Enable extension
enable:
	@echo "Enabling extension..."
	@gnome-extensions enable $(UUID) || (echo "Extension not found. Run 'make status' to check installation" && exit 1)
	@echo "Extension enabled"

# Disable extension  
disable:
	@echo "Disabling extension..."
	@gnome-extensions disable $(UUID) 2>/dev/null || true
	@echo "Extension disabled"

# Restart extension (disable then enable)
restart: disable enable
	@echo "Extension restarted"

# Quick development cycle
dev: compile-schemas install restart
	@echo "Development cycle complete!"
	@echo "Extension installed and restarted"
	@echo "Run 'make logs' to monitor output"
	@echo "Run 'make prefs' to open settings"

# Create distribution package
package: validate compile-schemas
	@echo "Creating distribution package..."
	@mkdir -p $(BUILD_DIR)
	@gnome-extensions pack --out-dir=$(BUILD_DIR) --force
	@echo "Package created: $(BUILD_DIR)/$(UUID).shell-extension.zip"

# Show extension logs
logs:
	@echo "Monitoring extension logs (Ctrl+C to stop)..."
	@echo "Looking for 'Dynamic Panel' messages..."
	@journalctl -f -o cat /usr/bin/gnome-shell | grep -i "dynamic panel" --line-buffered || \
	(echo "No logs found. Try enabling debug logging in extension preferences" && \
	 echo "Alternative: journalctl -f /usr/bin/gnome-shell")

# Open preferences
prefs:
	@echo "Opening extension preferences..."
	@gnome-extensions prefs $(UUID) || (echo "Extension not installed or not enabled" && exit 1)

# Show extension status
status:
	@echo "=== Extension Status ==="
	@echo "UUID: $(UUID)"
	@echo "Install Directory: $(INSTALL_DIR)"
	@echo ""
	@echo "Extension installed:" 
	@if [ -d "$(INSTALL_DIR)" ]; then echo "✓ Yes"; else echo "✗ No"; fi
	@echo ""
	@echo "Extension files:"
	@ls -la $(INSTALL_DIR) 2>/dev/null || echo "Directory does not exist"
	@echo ""
	@echo "GNOME Extensions status:"
	@gnome-extensions info $(UUID) 2>/dev/null || echo "Extension not found by GNOME Extensions"
	@echo ""
	@echo "All user extensions:"
	@gnome-extensions list --user

# Debug installation
debug-install:
	@echo "=== Debug Installation ==="
	@echo "UUID: $(UUID)"
	@echo "Install Directory: $(INSTALL_DIR)"
	@echo ""
	@echo "Required files check:"
	@echo -n "metadata.json: "; [ -f metadata.json ] && echo "✓" || echo "✗"
	@echo -n "extension.js: "; [ -f extension.js ] && echo "✓" || echo "✗"
	@echo -n "prefs.js: "; [ -f prefs.js ] && echo "✓" || echo "✗"
	@echo -n "schema file: "; [ -f $(SCHEMA_DIR)/org.gnome.shell.extensions.dynamic-panel.gschema.xml ] && echo "✓" || echo "✗"
	@echo ""
	@echo "Files in extension directory:"
	@ls -la $(INSTALL_DIR) 2>/dev/null || echo "Directory does not exist"
	@echo ""
	@echo "Schema compilation check:"
	@ls -la $(SCHEMA_DIR)/ 2>/dev/null || echo "Schema directory does not exist"
	@echo ""
	@echo "Extension info (if found):"
	@gnome-extensions info $(UUID) 2>/dev/null || echo "Extension not found by GNOME"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(SCHEMA_DIR)/gschemas.compiled
	@echo "Clean complete"

# Validate extension before packaging
validate:
	@echo "Validating extension..."
	@echo "Checking required files..."
	@test -f metadata.json || (echo "✗ metadata.json missing" && exit 1)
	@test -f extension.js || (echo "✗ extension.js missing" && exit 1)  
	@test -f prefs.js || (echo "✗ prefs.js missing" && exit 1)
	@test -f $(SCHEMA_DIR)/org.gnome.shell.extensions.dynamic-panel.gschema.xml || (echo "✗ schema file missing" && exit 1)
	@echo "✓ All required files present"
	@echo "Checking schema syntax..."
	@glib-compile-schemas --dry-run $(SCHEMA_DIR)/ || (echo "✗ Schema syntax error" && exit 1)
	@echo "✓ Schema syntax valid"
	@echo "✓ Extension validation passed"

# Test settings access
test-settings: install enable
	@echo "Testing settings access..."
	@echo "This will attempt to read extension settings"
	@sleep 2
	@gnome-extensions prefs $(UUID) || echo "Could not open preferences - check logs"

# Setup development environment
setup:
	@echo "Setting up development environment..."
	@mkdir -p $(SCHEMA_DIR)
	@mkdir -p screenshots
	@mkdir -p build
	@echo "✓ Development environment ready"
	@echo ""
	@echo "Next steps:"
	@echo "1. Ensure your schema file is in $(SCHEMA_DIR)/"
	@echo "2. Run 'make validate' to check all files"
	@echo "3. Run 'make dev' to install and test"

.PHONY: all help compile-schemas install uninstall enable disable restart dev package logs prefs status clean validate setup debug-install test-settings
