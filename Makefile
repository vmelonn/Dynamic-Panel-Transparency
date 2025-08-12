UUID = dynamic-panel@vmelonn
SCHEMA_DIR = schemas
BUILD_DIR = build

all: compile-schemas

compile-schemas:
	glib-compile-schemas $(SCHEMA_DIR)/

install: compile-schemas
	mkdir -p ~/.local/share/gnome-shell/extensions/$(UUID)
	cp -r . ~/.local/share/gnome-shell/extensions/$(UUID)/
	gnome-extensions enable $(UUID)

uninstall:
	gnome-extensions disable $(UUID)
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)

package: compile-schemas
	mkdir -p $(BUILD_DIR)
	gnome-extensions pack --out-dir=$(BUILD_DIR) --force

clean:
	rm -rf $(BUILD_DIR)
	rm -f $(SCHEMA_DIR)/gschemas.compiled

.PHONY: all compile-schemas install uninstall package clean
