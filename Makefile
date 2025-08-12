# Makefile for Dynamic Panel Transparency GNOME Extension

UUID = dynamic-panel@vmelonn
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

# Compile GSettings schemas
compile-schemas:
	@echo "Compiling schemas..."
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

# Uninstall extension
uninstall:
	@echo "Uninstalling extension..."
	@rm -rf $(INSTALL_DIR)
	@echo "Extension uninstalled"

# Enable extension
enable:
	@echo "Enabling extension..."
	@gnome-extensions enable $(UUID) || (echo "Extension not found. Checking available extensions..." && gnome-extensions list --user | grep -i dynamic || echo "No dynamic panel extension found")
	@echo "Extension enabled (if found)"

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

# Create distribution package
package: compile-schemas
	@echo "Creating distribution package..."
	@mkdir -p $(BUILD_DIR)
	@gnome-extensions pack --out-dir=$(BUILD_DIR) --force
	@echo "Package created: $(BUILD_DIR)/$(UUID).shell-extension.zip"

# Show extension logs
logs:
	@echo "Monitoring extension logs (Ctrl+C to stop)..."
	@journalctl -f -o cat /usr/bin/gnome-shell | grep -i "dynamic panel" --line-buffered

# Open preferences
prefs:
	@echo "Opening extension preferences..."
	@gnome-extensions prefs $(UUID)

# Show extension status
status:
	@echo "Extension Status:"
	@gnome-extensions info $(UUID) 2>/dev/null || echo "Extension not installed"

# Debug installation
debug-install:
	@echo "=== Debug Installation ==="
	@echo "UUID: $(UUID)"
	@echo "Install Directory: $(INSTALL_DIR)"
	@echo ""
	@echo "Files in extension directory:"
	@ls -la $(INSTALL_DIR) 2>/dev/null || echo "Directory does not exist"
	@echo ""
	@echo "All user extensions:"
	@gnome-extensions list --user
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
validate: compile-schemas
	@echo "Validating extension..."
	@echo "✓ Checking required files..."
	@test -f metadata.json || (echo "✗ metadata.json missing" && exit 1)
	@test -f extension.js || (echo "✗ extension.js missing" && exit 1)  
	@test -f prefs.js || (echo "✗ prefs.js missing" && exit 1)
	@test -f $(SCHEMA_DIR)/gschemas.compiled || (echo "✗ compiled schema missing" && exit 1)
	@echo "✓ All required files present"
	@echo "✓ Extension validation passed"

# Setup development environment
setup:
	@echo "Setting up development environment..."
	@mkdir -p $(SCHEMA_DIR)
	@mkdir -p screenshots
	@echo "Development environment ready"

.PHONY: all help compile-schemas install uninstall enable disable restart dev package logs prefs status clean validate setup debug-install
