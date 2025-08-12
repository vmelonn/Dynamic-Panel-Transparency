#!/bin/bash
# dev-setup.sh - Initial development environment setup

echo "=== Dynamic Panel Transparency - Development Setup ==="
echo ""

UUID="dynamic-panel@vmelonn"

# Create necessary directories
echo "Creating directory structure..."
mkdir -p schemas
mkdir -p screenshots
mkdir -p build

echo "✓ Directories created"

# Check for required tools
echo ""
echo "Checking required tools..."

check_tool() {
    if command -v $1 &> /dev/null; then
        echo "✓ $1 is installed"
    else
        echo "✗ $1 is not installed"
        return 1
    fi
}

check_tool "glib-compile-schemas"
check_tool "gnome-extensions"
check_tool "git"
check_tool "make"

echo ""
echo "Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'make compile-schemas' to compile settings schemas"
echo "2. Run 'make dev' to install and test the extension"
echo "3. Run 'make logs' to monitor extension output"
echo "4. Run 'make help' to see all available commands"
