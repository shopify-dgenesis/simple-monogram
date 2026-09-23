(function () {
  "use strict";

  var EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

  function escapeForCharClass(str) {
    return str.replace(/[\]\\^-]/g, "\\$&");
  }

  function buildAllowedPattern(field) {
    switch (field.allowedCharacters) {
      case "LETTERS_ONLY":
        return /^[A-Za-z\s'-]*$/;
      case "NUMBERS_ONLY":
        return /^[0-9]*$/;
      case "CUSTOM": {
        var extra = escapeForCharClass(field.customAllowedPattern || "");
        return new RegExp("^[A-Za-z0-9\\s" + extra + "]*$");
      }
      case "LETTERS_AND_NUMBERS":
      default:
        return /^[A-Za-z0-9\s'-]*$/;
    }
  }

  function applyTransform(value, transform) {
    if (transform === "UPPERCASE") return value.toUpperCase();
    if (transform === "LOWERCASE") return value.toLowerCase();
    return value;
  }

  function cleanSpacing(value, field) {
    var next = value;
    if (field.disallowLeadingSpaces) next = next.replace(/^\s+/, "");
    if (field.disallowTrailingSpaces) next = next.replace(/\s+$/, "");
    if (field.collapseDuplicateSpaces) next = next.replace(/\s{2,}/g, " ");
    return next;
  }

  function validateField(value, field) {
    if (field.required && value.trim() === "") {
      return "This field is required.";
    }
    if (value !== "" && field.minLength != null && value.length < field.minLength) {
      return "Must be at least " + field.minLength + " character(s).";
    }
    if (field.maxLength != null && value.length > field.maxLength) {
      return "Must be " + field.maxLength + " character(s) or fewer.";
    }
    if (field.disableEmoji && EMOJI_PATTERN.test(value)) {
      return "Emoji are not allowed.";
    }
    var pattern = buildAllowedPattern(field);
    if (!pattern.test(value)) {
      return "Contains characters that aren't allowed.";
    }
    return null;
  }

  function composeDisplayText(type, values, keys) {
    var parts = keys.map(function (key) {
      return (values[key] || "").trim();
    });
    if (type === "NAME_AND_DATE") {
      return parts.filter(Boolean).join(" — ");
    }
    if (
      type === "SINGLE_INITIAL" ||
      type === "TWO_INITIALS" ||
      type === "THREE_INITIALS" ||
      type === "BASIC_MONOGRAM"
    ) {
      return parts.join("");
    }
    return parts.filter(Boolean).join(" ");
  }

  // Common product-media selectors across popular Shopify themes (Dawn and
  // Dawn-derived themes first, then older Timber-based conventions). Used to
  // attempt "Native Image Mode" — overlaying the personalization directly on
  // the theme's own product image. If none match confidently, we fall back
  // to "Safe Preview Mode" (our own dedicated preview image) so the
  // experience never breaks on a theme we don't recognize.
  var NATIVE_IMAGE_SELECTORS = [
    ".product__media-item img",
    ".product__media img",
    "[data-product-single-media-wrapper] img",
    ".product-single__photo img",
    ".product-single__media img",
    ".product-image-main img",
    ".product__photo img",
    ".featured-image img",
    '[data-media-type="image"] img',
  ];

  function findNativeImageContainer(root) {
    for (var i = 0; i < NATIVE_IMAGE_SELECTORS.length; i++) {
      var candidates = document.querySelectorAll(NATIVE_IMAGE_SELECTORS[i]);
      for (var j = 0; j < candidates.length; j++) {
        var img = candidates[j];
        if (root.contains(img) || !img.parentElement) continue;
        var rect = img.getBoundingClientRect();
        if (rect.width >= 150 && rect.height >= 150) {
          return img.parentElement;
        }
      }
    }
    return null;
  }

  function setUpNativeOverlay(root) {
    var container = findNativeImageContainer(root);
    if (!container) return null;

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    var overlay = document.createElement("span");
    overlay.className = "simple-monogram__preview-text simple-monogram__preview-text--native";
    container.appendChild(overlay);
    return overlay;
  }

  function effectStyle(effect) {
    switch (effect) {
      case "ENGRAVING":
        return "opacity:0.55;";
      case "EMBROIDERY":
        return "text-shadow:0.5px 0.5px 0 rgba(0,0,0,0.35);";
      case "FOIL":
        return "font-weight:700;text-shadow:0 0 2px rgba(255,255,255,0.8);";
      case "DEBOSS":
        return "text-shadow:-1px -1px 0 rgba(255,255,255,0.5),1px 1px 1px rgba(0,0,0,0.4);";
      case "EMBOSS":
        return "text-shadow:1px 1px 0 rgba(255,255,255,0.6),-1px -1px 1px rgba(0,0,0,0.4);";
      default:
        return "";
    }
  }

  function initWidget(root) {
    var productId = root.getAttribute("data-product-id");
    var loadingEl = root.querySelector("[data-sm-loading]");
    var widgetEl = root.querySelector("[data-sm-widget]");
    var fieldsEl = root.querySelector("[data-sm-fields]");
    var previewWrap = root.querySelector("[data-sm-preview-image-wrap]");
    var previewImg = root.querySelector("[data-sm-preview-image]");
    var previewText = root.querySelector("[data-sm-preview-text]");
    var previewUnavailable = root.querySelector("[data-sm-preview-unavailable]");
    var confirmEl = root.querySelector("[data-sm-confirm]");
    var confirmCheckbox = root.querySelector("[data-sm-confirm-checkbox]");
    var errorEl = root.querySelector("[data-sm-error]");
    var statusEl = root.querySelector("[data-sm-status]");

    var state = { values: {}, config: null };
    var nativeOverlay = null;

    fetch("/apps/simple-monogram/proxy/config?productId=" + encodeURIComponent(productId), {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        return response.ok ? response.json() : { configured: false };
      })
      .then(function (data) {
        if (!data.configured) return; // Product not configured — widget stays hidden.
        state.config = data;
        nativeOverlay = setUpNativeOverlay(root);
        render();
        root.hidden = false;
        loadingEl.hidden = true;
        widgetEl.hidden = false;
      })
      .catch(function () {
        // Network/preview failure — fail closed and stay hidden rather than
        // show a broken widget.
      });

    function render() {
      var template = state.config.template;
      var keys = template.fields.map(function (f) {
        return f.key;
      });

      fieldsEl.innerHTML = "";
      template.fields.forEach(function (field) {
        var wrap = document.createElement("div");
        wrap.className = "simple-monogram__field";

        var label = document.createElement("label");
        label.textContent = field.label + (field.required ? " *" : "");
        var inputId = "sm-field-" + field.key;
        label.setAttribute("for", inputId);

        var input = document.createElement("input");
        input.type = field.inputType === "DATE" ? "date" : field.inputType === "NUMBER" ? "text" : "text";
        input.id = inputId;
        input.name = field.key;
        if (field.maxLength != null) input.maxLength = field.maxLength;

        var errorText = document.createElement("span");
        errorText.className = "simple-monogram__field-error";
        errorText.hidden = true;

        input.addEventListener("input", function () {
          var value = cleanSpacing(applyTransform(input.value, field.transform), field);
          if (value !== input.value) input.value = value;
          state.values[field.key] = value;
          var error = validateField(value, field);
          errorText.textContent = error || "";
          errorText.hidden = !error;
          updatePreview();
          updateStatus();
        });

        wrap.appendChild(label);
        wrap.appendChild(input);
        wrap.appendChild(errorText);
        fieldsEl.appendChild(wrap);
        state.values[field.key] = "";
      });

      if (template.fonts.length > 0) {
        state.selectedFont = template.fonts[0];
      }
      if (template.colors.length > 0) {
        state.selectedColor = template.colors[0];
      }

      var zone = state.config.zone;
      var activePreviewEl = nativeOverlay || previewText;

      if (zone && (nativeOverlay || zone.imageUrl)) {
        if (nativeOverlay) {
          previewWrap.hidden = true;
        } else {
          previewImg.src = zone.imageUrl;
          previewWrap.hidden = false;
          previewWrap.style.width = "100%";
        }
        previewUnavailable.hidden = true;
        activePreviewEl.style.left = zone.x * 100 + "%";
        activePreviewEl.style.top = zone.y * 100 + "%";
        activePreviewEl.style.width = zone.width * 100 + "%";
        activePreviewEl.style.height = zone.height * 100 + "%";
        activePreviewEl.style.transform = "rotate(" + zone.rotation + "deg)";
        activePreviewEl.style.fontSize = Math.min(zone.defaultFontSize, 28) + "px";
        activePreviewEl.style.display = "flex";
        activePreviewEl.style.alignItems = "center";
        activePreviewEl.style.justifyContent =
          zone.textAlign === "LEFT" ? "flex-start" : zone.textAlign === "RIGHT" ? "flex-end" : "center";
        activePreviewEl.style.opacity = String(zone.opacity);
        activePreviewEl.style.cssText += effectStyle(zone.effect || template.effect);
      } else {
        previewWrap.hidden = true;
        previewUnavailable.hidden = !nativeOverlay;
        if (nativeOverlay) {
          // No saved zone, but we can still overlay plain centered text on
          // the theme's real image rather than falling back to a message.
          activePreviewEl.style.left = "10%";
          activePreviewEl.style.top = "42%";
          activePreviewEl.style.width = "80%";
          activePreviewEl.style.height = "16%";
          activePreviewEl.style.transform = "none";
          activePreviewEl.style.fontSize = "20px";
          activePreviewEl.style.display = "flex";
          activePreviewEl.style.alignItems = "center";
          activePreviewEl.style.justifyContent = "center";
          activePreviewEl.style.opacity = "1";
          activePreviewEl.style.cssText += effectStyle(template.effect);
        }
      }

      if (template.confirmationRequired) {
        confirmEl.hidden = false;
        confirmCheckbox.addEventListener("change", updateStatus);
      }

      root._smKeys = keys;
      root._smTemplate = template;
      updatePreview();
      updateStatus();
    }

    function updatePreview() {
      var template = state.config.template;
      var activePreviewEl = nativeOverlay || previewText;
      var text = composeDisplayText(template.type, state.values, root._smKeys || []);
      activePreviewEl.textContent = text;
      if (state.selectedFont) {
        activePreviewEl.style.fontFamily = state.selectedFont.family;
      }
      if (state.selectedColor) {
        activePreviewEl.style.color = state.selectedColor.hex;
      }
    }

    function isValid() {
      var template = state.config.template;
      return template.fields.every(function (field) {
        return !validateField(state.values[field.key] || "", field);
      });
    }

    function updateStatus() {
      var template = state.config.template;
      var valid = isValid();
      var confirmed = !template.confirmationRequired || (confirmCheckbox && confirmCheckbox.checked);
      var ready = valid && confirmed;

      if (!valid) {
        statusEl.textContent = "";
        errorEl.textContent = "Please fix the highlighted field(s) above.";
        errorEl.hidden = false;
      } else if (!confirmed) {
        errorEl.hidden = true;
        statusEl.textContent = "Please confirm your personalization above to continue.";
      } else {
        errorEl.hidden = true;
        statusEl.textContent = "Ready — this personalization can be added to cart.";
      }

      root.dispatchEvent(
        new CustomEvent("simple-monogram:change", {
          bubbles: true,
          detail: {
            productId: productId,
            ready: ready,
            values: state.values,
            displayText: composeDisplayText(template.type, state.values, root._smKeys || []),
            font: state.selectedFont,
            color: state.selectedColor,
            effect: (state.config.zone && state.config.zone.effect) || template.effect,
          },
        }),
      );
    }
  }

  function init() {
    document.querySelectorAll("[data-simple-monogram]").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
