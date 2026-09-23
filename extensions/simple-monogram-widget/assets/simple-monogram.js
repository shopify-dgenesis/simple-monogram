(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

  var EFFECT_LABELS = {
    PRINT: "Print",
    ENGRAVING: "Engraving",
    EMBROIDERY: "Embroidery",
    FOIL: "Foil",
    DEBOSS: "Deboss",
    EMBOSS: "Emboss",
  };

  var DEFAULT_ZONE = {
    x: 0.1,
    y: 0.42,
    width: 0.8,
    height: 0.16,
    rotation: 0,
    alignment: "CENTER",
    textAlign: "CENTER",
    minFontSize: 12,
    maxFontSize: 26,
    defaultFontSize: 18,
    autoFit: true,
    opacity: 1,
    effect: null,
    variantRules: [],
  };

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

  function applyEffectToSvgText(el, effect) {
    el.style.textShadow = "";
    el.style.fontWeight = "normal";
    el.style.opacity = "1";
    switch (effect) {
      case "ENGRAVING":
        el.style.opacity = "0.55";
        break;
      case "EMBROIDERY":
        el.style.textShadow = "0.5px 0.5px 0 rgba(0,0,0,0.35)";
        break;
      case "FOIL":
        el.style.fontWeight = "700";
        el.style.textShadow = "0 0 2px rgba(255,255,255,0.8)";
        break;
      case "DEBOSS":
        el.style.textShadow = "-1px -1px 0 rgba(255,255,255,0.5),1px 1px 1px rgba(0,0,0,0.4)";
        break;
      case "EMBOSS":
        el.style.textShadow = "1px 1px 0 rgba(255,255,255,0.6),-1px -1px 1px rgba(0,0,0,0.4)";
        break;
      default:
        break;
    }
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

  function createPreviewSvg() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "simple-monogram__preview-svg");
    var text = document.createElementNS(SVG_NS, "text");
    svg.appendChild(text);
    return { svg: svg, text: text };
  }

  function positionSvg(svg, container, zone) {
    var rect = container.getBoundingClientRect();
    var pxWidth = Math.max(1, rect.width * zone.width);
    var pxHeight = Math.max(1, rect.height * zone.height);
    svg.setAttribute("width", pxWidth);
    svg.setAttribute("height", pxHeight);
    svg.setAttribute("viewBox", "0 0 " + pxWidth + " " + pxHeight);
    svg.style.left = zone.x * 100 + "%";
    svg.style.top = zone.y * 100 + "%";
    svg.style.width = zone.width * 100 + "%";
    svg.style.height = zone.height * 100 + "%";
    svg.style.transform = "rotate(" + zone.rotation + "deg)";
    return { pxWidth: pxWidth, pxHeight: pxHeight };
  }

  // Reduces font size from maxSize down to minSize until the rendered text
  // fits the zone's current pixel width (auto-fit), or reports overflow so
  // the caller can block add-to-cart per the "overflow protection" rule.
  function fitFontSize(textEl, content, pxWidth, minSize, maxSize, autoFit, defaultSize) {
    textEl.textContent = content;
    if (!content) return { fontSize: defaultSize, overflow: false };

    var maxAllowedWidth = pxWidth * 0.94;

    if (!autoFit) {
      textEl.setAttribute("font-size", defaultSize);
      var fixedLength = textEl.getComputedTextLength();
      return { fontSize: defaultSize, overflow: fixedLength > maxAllowedWidth };
    }

    var size = maxSize;
    textEl.setAttribute("font-size", size);
    var length = textEl.getComputedTextLength();
    while (length > maxAllowedWidth && size > minSize) {
      size -= 1;
      textEl.setAttribute("font-size", size);
      length = textEl.getComputedTextLength();
    }
    return { fontSize: size, overflow: length > maxAllowedWidth };
  }

  function normalizeVariantGid(rawId) {
    if (!rawId) return null;
    return /^\d+$/.test(rawId) ? "gid://shopify/ProductVariant/" + rawId : rawId;
  }

  // A page can have more than one form[action*="/cart/add"] (e.g. Dawn's
  // installment-payment calculator uses one too), and our block isn't
  // guaranteed to be nested inside the real product form's DOM subtree
  // depending on the theme's section layout. The one reliable, near-
  // universal cross-theme signal for the *real* add-to-cart form is the
  // submit control itself: Shopify themes consistently name it "add".
  function findCartForm(root) {
    var addControl = document.querySelector('button[name="add"], input[name="add"]');
    var formFromAddControl = addControl && addControl.closest("form");
    if (formFromAddControl) return formFromAddControl;

    var candidates = document.querySelectorAll('form[action*="/cart/add"]');
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].querySelector('[name="id"]')) return candidates[i];
    }

    return root.closest("form") || candidates[0] || null;
  }

  function findVariantIdInput(form) {
    if (!form) return null;
    return form.querySelector('input[name="id"], select[name="id"]');
  }

  function initWidget(root) {
    var productId = root.getAttribute("data-product-id");
    var loadingEl = root.querySelector("[data-sm-loading]");
    var widgetEl = root.querySelector("[data-sm-widget]");
    var fieldsEl = root.querySelector("[data-sm-fields]");
    var optionsEl = root.querySelector("[data-sm-options]");
    var previewWrap = root.querySelector("[data-sm-preview-image-wrap]");
    var previewImg = root.querySelector("[data-sm-preview-image]");
    var previewUnavailable = root.querySelector("[data-sm-preview-unavailable]");
    var confirmEl = root.querySelector("[data-sm-confirm]");
    var confirmCheckbox = root.querySelector("[data-sm-confirm-checkbox]");
    var errorEl = root.querySelector("[data-sm-error]");
    var statusEl = root.querySelector("[data-sm-status]");

    var state = {
      values: {},
      fieldErrors: {},
      fieldKeys: [],
      config: null,
      selectedFontId: null,
      selectedColorId: null,
      currentVariantId: null,
      overflow: false,
      swatchesEl: null,
      ready: false,
      lastFontSize: null,
      preparedSignature: null,
    };
    var previewTarget = null; // { svg, text, container, mode: 'native' | 'safe' }
    var cartForm = findCartForm(root);

    fetch("/apps/simple-monogram/proxy/config?productId=" + encodeURIComponent(productId), {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        return response.ok ? response.json() : { configured: false };
      })
      .then(function (data) {
        if (!data.configured) return; // Product not configured — widget stays hidden.
        state.config = data;
        setup();
        root.hidden = false;
        loadingEl.hidden = true;
        widgetEl.hidden = false;
      })
      .catch(function () {
        // Network/proxy failure — fail closed and stay hidden rather than
        // show a broken widget.
      });

    function setup() {
      var template = state.config.template;
      state.selectedFontId = template.defaultFontId || (template.fonts[0] && template.fonts[0].id) || null;
      state.selectedColorId = template.colors[0] ? template.colors[0].id : null;

      buildFields();
      buildOptions();
      setupPreviewTarget();
      setupVariantTracking();
      setupCartIntegration();

      if (template.confirmationRequired) {
        confirmEl.hidden = false;
        confirmCheckbox.addEventListener("change", updateStatus);
      }

      updatePreview();
      updateStatus();

      var resizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updatePreview, 120);
      });
    }

    function buildFields() {
      var template = state.config.template;
      state.fieldKeys = template.fields.map(function (f) {
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
        input.type = field.inputType === "DATE" ? "date" : "text";
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
          state.fieldErrors[field.key] = error;
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
        state.fieldErrors[field.key] = validateField("", field);
      });
    }

    function buildOptions() {
      var template = state.config.template;
      optionsEl.innerHTML = "";

      if (template.fonts.length > 0) {
        var fontGroup = document.createElement("div");
        fontGroup.className = "simple-monogram__option-group";
        var fontLabel = document.createElement("label");
        fontLabel.textContent = "Font";
        var select = document.createElement("select");
        template.fonts.forEach(function (font) {
          var option = document.createElement("option");
          option.value = font.id;
          option.textContent = font.name;
          select.appendChild(option);
        });
        select.value = state.selectedFontId || "";
        select.addEventListener("change", function () {
          state.selectedFontId = select.value;
          updatePreview();
        });
        fontGroup.appendChild(fontLabel);
        fontGroup.appendChild(select);
        optionsEl.appendChild(fontGroup);
      }

      if (template.colors.length > 0) {
        var colorGroup = document.createElement("div");
        colorGroup.className = "simple-monogram__option-group";
        var colorLabel = document.createElement("label");
        colorLabel.textContent = "Color";
        var swatches = document.createElement("div");
        swatches.className = "simple-monogram__swatches";
        state.swatchesEl = swatches;
        renderColorSwatches();
        colorGroup.appendChild(colorLabel);
        colorGroup.appendChild(swatches);
        optionsEl.appendChild(colorGroup);
      }
    }

    function getAllowedColorsForCurrentVariant() {
      var template = state.config.template;
      var zone = state.config.zone;
      if (!zone || !state.currentVariantId) return template.colors;
      var rule = zone.variantRules.filter(function (r) {
        return r.shopifyVariantId === state.currentVariantId;
      })[0];
      if (!rule || rule.allowedColorIds.length === 0) return template.colors;
      return template.colors.filter(function (c) {
        return rule.allowedColorIds.indexOf(c.id) !== -1;
      });
    }

    function renderColorSwatches() {
      var container = state.swatchesEl;
      if (!container) return;
      var allowed = getAllowedColorsForCurrentVariant();

      if (!allowed.some(function (c) { return c.id === state.selectedColorId; }) && allowed.length > 0) {
        state.selectedColorId = allowed[0].id;
      }

      container.innerHTML = "";
      allowed.forEach(function (color) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "simple-monogram__swatch";
        btn.style.background = color.hex;
        btn.title = color.name;
        btn.setAttribute("aria-label", color.name);
        btn.setAttribute("aria-pressed", String(color.id === state.selectedColorId));
        btn.addEventListener("click", function () {
          state.selectedColorId = color.id;
          renderColorSwatches();
          updatePreview();
        });
        container.appendChild(btn);
      });
    }

    function setupPreviewTarget() {
      var zone = state.config.zone;
      var nativeContainer = findNativeImageContainer(root);

      if (nativeContainer) {
        if (getComputedStyle(nativeContainer).position === "static") {
          nativeContainer.style.position = "relative";
        }
        var native = createPreviewSvg();
        nativeContainer.appendChild(native.svg);
        previewTarget = { svg: native.svg, text: native.text, container: nativeContainer, mode: "native" };
        previewWrap.hidden = true;
        previewUnavailable.hidden = true;
        return;
      }

      if (zone && zone.imageUrl) {
        previewImg.src = zone.imageUrl;
        previewWrap.hidden = false;
        previewWrap.style.width = "100%";
        var safe = createPreviewSvg();
        previewWrap.appendChild(safe.svg);
        previewTarget = { svg: safe.svg, text: safe.text, container: previewWrap, mode: "safe" };
        previewUnavailable.hidden = true;
        return;
      }

      previewWrap.hidden = true;
      previewUnavailable.hidden = false;
      previewTarget = null;
    }

    function setupVariantTracking() {
      var input = findVariantIdInput(cartForm);
      if (!input) return;
      state.currentVariantId = normalizeVariantGid(input.value);

      var changeTarget = cartForm || document;
      changeTarget.addEventListener("change", function () {
        setTimeout(function () {
          var newId = normalizeVariantGid(input.value);
          if (newId === state.currentVariantId) return;
          state.currentVariantId = newId;
          onVariantChanged();
        }, 50);
      });
    }

    function onVariantChanged() {
      var zone = state.config.zone;
      if (zone && previewTarget && previewTarget.mode === "safe") {
        var rule = zone.variantRules.filter(function (r) {
          return r.shopifyVariantId === state.currentVariantId;
        })[0];
        if (rule && rule.previewImageUrl) {
          previewImg.src = rule.previewImageUrl;
        }
      }
      renderColorSwatches();
      updatePreview();
      updateStatus();
    }

    function updatePreview() {
      if (!previewTarget) return;

      var template = state.config.template;
      var zone = state.config.zone || DEFAULT_ZONE;
      var text = composeDisplayText(template.type, state.values, state.fieldKeys);

      var geometry = positionSvg(previewTarget.svg, previewTarget.container, zone);
      var textEl = previewTarget.text;

      var font = template.fonts.filter(function (f) { return f.id === state.selectedFontId; })[0];
      textEl.style.fontFamily = font ? font.family : "inherit";

      var pad = 4;
      if (zone.textAlign === "LEFT") {
        textEl.setAttribute("x", pad);
        textEl.setAttribute("text-anchor", "start");
      } else if (zone.textAlign === "RIGHT") {
        textEl.setAttribute("x", geometry.pxWidth - pad);
        textEl.setAttribute("text-anchor", "end");
      } else {
        textEl.setAttribute("x", geometry.pxWidth / 2);
        textEl.setAttribute("text-anchor", "middle");
      }
      textEl.setAttribute("y", geometry.pxHeight / 2);
      textEl.setAttribute("dominant-baseline", "middle");

      var color = template.colors.filter(function (c) { return c.id === state.selectedColorId; })[0];
      textEl.setAttribute("fill", color ? color.hex : "#1a1a1a");
      textEl.style.opacity = String(zone.opacity != null ? zone.opacity : 1);
      applyEffectToSvgText(textEl, zone.effect || template.effect);

      var fit = fitFontSize(
        textEl,
        text,
        geometry.pxWidth,
        zone.minFontSize,
        zone.maxFontSize,
        zone.autoFit,
        zone.defaultFontSize,
      );
      state.overflow = fit.overflow;
      state.lastFontSize = fit.fontSize;
      state.lastZone = zone;
    }

    function isValid() {
      return state.fieldKeys.every(function (key) {
        return !state.fieldErrors[key];
      });
    }

    function updateStatus() {
      var template = state.config.template;
      var valid = isValid();
      var confirmed = !template.confirmationRequired || (confirmCheckbox && confirmCheckbox.checked);
      var ready = valid && confirmed && !state.overflow;
      state.ready = ready;

      if (!valid) {
        statusEl.textContent = "";
        errorEl.textContent = "Please fix the highlighted field(s) above.";
        errorEl.hidden = false;
      } else if (state.overflow) {
        statusEl.textContent = "";
        errorEl.textContent = "Your personalization is too long for this design.";
        errorEl.hidden = false;
      } else if (!confirmed) {
        errorEl.hidden = true;
        statusEl.textContent = "Please confirm your personalization above to continue.";
      } else {
        errorEl.hidden = true;
        statusEl.textContent = "Ready — this personalization can be added to cart.";
      }

      var font = template.fonts.filter(function (f) { return f.id === state.selectedFontId; })[0];
      var color = template.colors.filter(function (c) { return c.id === state.selectedColorId; })[0];

      root.dispatchEvent(
        new CustomEvent("simple-monogram:change", {
          bubbles: true,
          detail: {
            productId: productId,
            ready: ready,
            values: state.values,
            displayText: composeDisplayText(template.type, state.values, state.fieldKeys),
            font: font || null,
            color: color || null,
            effect: (state.config.zone && state.config.zone.effect) || template.effect,
          },
        }),
      );
    }

    function currentSignature() {
      return JSON.stringify({
        values: state.values,
        fontId: state.selectedFontId,
        colorId: state.selectedColorId,
        confirmed: confirmCheckbox ? confirmCheckbox.checked : true,
      });
    }

    function clearInjectedProperties(form) {
      form.querySelectorAll('[data-sm-property="1"]').forEach(function (el) {
        el.remove();
      });
    }

    function addHiddenInput(form, name, value) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      input.setAttribute("data-sm-property", "1");
      form.appendChild(input);
    }

    function injectHiddenProperties(form, result) {
      clearInjectedProperties(form);
      addHiddenInput(form, "properties[Personalization]", result.displayText);
      if (result.fontName) addHiddenInput(form, "properties[Font]", result.fontName);
      if (result.colorName) addHiddenInput(form, "properties[Color]", result.colorName);
      addHiddenInput(form, "properties[Style]", EFFECT_LABELS[result.effect] || result.effect);
      addHiddenInput(form, "properties[_simple_monogram_id]", result.internalRef);
      addHiddenInput(form, "properties[_preview_id]", result.previewRef);
    }

    function createCustomizationRecord() {
      var zone = state.lastZone || DEFAULT_ZONE;
      return fetch("/apps/simple-monogram/proxy/customization", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          shopifyProductId: productId,
          shopifyVariantId: state.currentVariantId,
          fieldValues: state.values,
          fontId: state.selectedFontId,
          colorId: state.selectedColorId,
          confirmed: confirmCheckbox ? confirmCheckbox.checked : true,
          placement: {
            x: zone.x,
            y: zone.y,
            width: zone.width,
            height: zone.height,
            rotation: zone.rotation,
            fontSize: state.lastFontSize || zone.defaultFontSize,
          },
        }),
      }).then(function (response) {
        if (!response.ok) throw new Error("Failed to save personalization");
        return response.json();
      });
    }

    function setupCartIntegration() {
      var form = cartForm;
      if (!form) return;

      form.addEventListener(
        "submit",
        function (event) {
          if (!state.ready || !state.currentVariantId) {
            event.preventDefault();
            event.stopImmediatePropagation();
            errorEl.textContent =
              errorEl.textContent || "Please complete your personalization before adding to cart.";
            errorEl.hidden = false;
            root.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }

          var signature = currentSignature();
          if (state.preparedSignature === signature) {
            return; // Hidden properties already match current state — let submission proceed.
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          var submitter = event.submitter;

          createCustomizationRecord()
            .then(function (result) {
              injectHiddenProperties(form, result);
              state.preparedSignature = signature;
              if (form.requestSubmit) {
                form.requestSubmit(submitter || undefined);
              } else {
                form.submit();
              }
            })
            .catch(function () {
              errorEl.textContent = "Something went wrong preparing your personalization. Please try again.";
              errorEl.hidden = false;
            });
        },
        true,
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
