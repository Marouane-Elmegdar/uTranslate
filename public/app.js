// ULearning Translation Review Desk v39 — Arabic RTL previews with multi-rule ICU editing
      "use strict";
      const $ = (id) => document.getElementById(id);
      const THEME_STORAGE_KEY = "ulearning-review-theme-v2";
      const DEFAULT_THEME = "palette-3";
      const VALID_THEMES = new Set([
        "original",
        "palette-1",
        "palette-2",
        "palette-3",
        "palette-4",
      ]);
      function applyTheme(value, persist = true) {
        const theme = VALID_THEMES.has(value) ? value : DEFAULT_THEME;
        const stylesheet = $("themeStylesheet");
        if (theme === "original") {
          stylesheet.disabled = true;
        } else {
          stylesheet.href = `./themes/${theme}.css`;
          stylesheet.disabled = false;
        }
        document.documentElement.dataset.theme = theme;
        document
          .querySelectorAll("[data-theme-selector]")
          .forEach((selector) => (selector.value = theme));
        if (persist) {
          try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
          } catch (error) {}
        }
      }
      let initialTheme = DEFAULT_THEME;
      try {
        initialTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
      } catch (error) {}
      applyTheme(initialTheme, false);
      const esc = (s) =>
        String(s ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const clone = (x) => JSON.parse(JSON.stringify(x));
      const ICU = window.UTranslateICU;
      if (!ICU)
        throw Error("The embedded ICU validation library could not be loaded.");
      function looksLikeIcuRule(value) {
        return /\{\s*[^,{}]+\s*,\s*(?:plural|select|selectordinal)\s*,/i.test(
          String(value ?? ""),
        );
      }
      function tolgeePluralEligibility(value) {
        try {
          const analysis = ICU.analyze(String(value ?? ""), icuLocale("target"));
          const rules = Array.isArray(analysis.rules) ? analysis.rules : [];
          if (
            !analysis.isIcu ||
            rules.length !== 1 ||
            !["plural", "selectordinal"].includes(rules[0].type)
          )
            return {
              eligible: false,
              variable: null,
              type: null,
              reason:
                "Tolgee plural mode requires exactly one cardinal or ordinal plural rule.",
            };
          return {
            eligible: true,
            variable: rules[0].variable,
            type: rules[0].type,
            reason: "",
          };
        } catch (error) {
          return {
            eligible: false,
            variable: null,
            type: null,
            reason: String(error.message || error),
          };
        }
      }
      const RTL_LANGUAGE_CODES = new Set([
        "ar",
        "fa",
        "he",
        "ur",
        "ps",
        "sd",
        "ku",
        "ug",
        "yi",
      ]);
      function isRtlLanguage(language = languageConfig.targetCode) {
        return RTL_LANGUAGE_CODES.has(
          String(language || "").toLowerCase().split("-")[0],
        );
      }
      function hasRtlScript(value) {
        return /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/.test(
          String(value ?? ""),
        );
      }
      function stripBidiControls(value) {
        return String(value ?? "").replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
      }
      // Keep numeric/Latin placeholders together when an ICU message is shown in RTL text.
      // The controls are invisible and are only added to exported RTL ICU messages.
      function protectRtlIcuBidi(value, language = languageConfig.targetCode) {
        const text = String(value ?? "");
        if (!isRtlLanguage(language) || !looksLikeIcuRule(text)) return text;
        let protectedBranches = 0;
        const branchProtected = text.replace(
          /((?:zero|one|two|few|many|other|=\d+)\s*\{)((?:[^{}]|\{[A-Za-z_][A-Za-z0-9_.-]*\})*)(\})/g,
          (match, open, body, close) => {
            if (/\u2066|\u2067/.test(body)) return match;
            protectedBranches += 1;
            return `${open}\u2066${body}\u2069${close}`;
          },
        );
        if (protectedBranches) return branchProtected;
        return text.replace(
          /(?<![\u2066\u2067])\{([A-Za-z_][A-Za-z0-9_.-]*)\}(?![\u2069])/g,
          "\u2066{$1}\u2069",
        );
      }
      function icuLocale(kind = "target") {
        return (
          exactLanguageTag(kind) ||
          (kind === "base"
            ? languageConfig.baseCode
            : languageConfig.targetCode) ||
          "en"
        );
      }
      function validateIcuTranslation(row, value) {
        const text = String(value ?? "");
        const suspectedIcu = looksLikeIcuRule(text);
        let candidate;
        try {
          candidate = ICU.analyze(text, icuLocale("target"));
        } catch (error) {
          return {
            isIcu: suspectedIcu,
            valid: !suspectedIcu,
            error: suspectedIcu ? String(error.message || error) : "",
            analysis: null,
          };
        }
        if (!candidate.isIcu)
          return { isIcu: false, valid: true, error: "", analysis: candidate };

        let source;
        try {
          source = ICU.analyze(String(row?.chinese ?? ""), icuLocale("base"));
        } catch (error) {
          return {
            isIcu: true,
            valid: false,
            error: `The source text cannot be checked as ICU: ${error.message || error}`,
            analysis: candidate,
          };
        }
        const sourceArgs = source.arguments || {};
        const targetArgs = candidate.arguments || {};
        const missing = Object.keys(sourceArgs).filter(
          (name) => !Object.prototype.hasOwnProperty.call(targetArgs, name),
        );
        const added = Object.keys(targetArgs).filter(
          (name) => !Object.prototype.hasOwnProperty.call(sourceArgs, name),
        );
        if (missing.length)
          return {
            isIcu: true,
            valid: false,
            error: `The ICU translation is missing source variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
            analysis: candidate,
          };
        if (added.length)
          return {
            isIcu: true,
            valid: false,
            error: `The ICU translation adds variable${added.length === 1 ? "" : "s"} not present in the source: ${added.join(", ")}.`,
            analysis: candidate,
          };
        for (const [name, sourceType] of Object.entries(sourceArgs)) {
          const targetType = targetArgs[name];
          if (
            ["date", "time", "select", "plural", "selectordinal"].includes(
              sourceType,
            ) &&
            sourceType !== targetType
          )
            return {
              isIcu: true,
              valid: false,
              error: `Variable "${name}" is ${sourceType} in the source but ${targetType} in the target.`,
              analysis: candidate,
            };
        }
        return { isIcu: true, valid: true, error: "", analysis: candidate };
      }
      function serializeIcuLiteral(value, inPlural = false) {
        let output = String(value ?? "")
          .replace(/'/g, "''")
          .replace(/[{}]/g, (character) => `'${character}'`);
        if (inPlural) output = output.replace(/#/g, "'#'");
        return output;
      }
      function serializeIcuElement(element, inPlural = false) {
        if (!element || typeof element !== "object") return null;
        if (element.type === 0)
          return serializeIcuLiteral(element.value, inPlural);
        if (element.type === 1) return `{${element.value}}`;
        if (element.type === 7) return "#";
        if (element.type === 5 || element.type === 6) {
          const ruleType =
            element.type === 5
              ? "select"
              : element.pluralType === "ordinal"
                ? "selectordinal"
                : "plural";
          const offset =
            element.type === 6 && element.offset
              ? ` offset:${element.offset}`
              : "";
          const options = Object.entries(element.options || {})
            .map(([selector, option]) => {
              const body = serializeIcuElements(
                option.value,
                element.type === 6,
              );
              return body == null ? null : `${selector} {${body}}`;
            });
          if (options.some((option) => option == null)) return null;
          return `{${element.value}, ${ruleType},${offset} ${options.join(" ")}}`;
        }
        return null;
      }
      function serializeIcuElements(elements, inPlural = false) {
        const output = (elements || []).map((element) =>
          serializeIcuElement(element, inPlural),
        );
        return output.some((part) => part == null) ? null : output.join("");
      }
      function icuSampleValues(value, sampleNumber = 2) {
        try {
          const analysis = ICU.analyze(String(value ?? ""), icuLocale("target"));
          return Object.fromEntries(
            Object.entries(analysis.arguments || {}).map(([name, type]) => [
              name,
              type === "select" ? "other" : sampleNumber,
            ]),
          );
        } catch (_) {
          return {};
        }
      }
      function cardIcuView(
        value,
        showRaw = false,
        previewNumber = icuPreviewNumber,
      ) {
        const text = String(value ?? "");
        if (!looksLikeIcuRule(text) || showRaw)
          return { text: stripBidiControls(text), note: "", preview: false };
        try {
          const values = icuSampleValues(text, previewNumber);
          const formatted = ICU.format(
            protectRtlIcuBidi(text),
            icuLocale("target"),
            values,
          );
          const assignments = Object.entries(values)
            .map(([name, sample]) => `${name}=${sample}`)
            .join(", ");
          return {
            text: stripBidiControls(formatted),
            note: assignments
              ? `${languageConfig.toolLanguage === "zh" ? "示例" : "Sample"}: ${assignments}`
              : languageConfig.toolLanguage === "zh"
                ? "ICU 预览"
                : "ICU preview",
            preview: true,
          };
        } catch (_) {
          return { text: stripBidiControls(text), note: "", preview: false };
        }
      }
      const DB_NAME = "ulearning-translation-review",
        DB_VERSION = 1,
        STORE = "workspace";
      const REPLACEMENT_GLOSSARY_STORAGE_KEY =
        "ulearning-translation-review-proposal-glossary-v1";
      let db = null,
        tolgee = null,
        originalTolgeeJson = null,
        rows = [],
        currentView = "pending",
        page = 1,
         activeEditKey = null,
         activeEditSource = null,
        activeIcuToolsExpanded = false,
        restoreModalContext = "workspace",
        activeScreenshotKey = null,
        activeScreenshotIndexes = [],
        activeScreenshotPosition = 0,
        activePluralModeDraft = false,
        importedAt = null,
        proposalCount = 0,
        autosaveDirectoryHandle = null,
        autosaveFileHandle = null,
        persistQueue = Promise.resolve(),
        lastSavedAt = null,
        setupScreenshotsHandled = false,
        icuRawVisible = new Set(),
         replacementGlossary = storedReplacementGlossary();
      let icuPreviewNumber = 6;
      const icuPreviewNumbers = new Map();
      let doubleCheckMode = false;
      let pendingToastUndo = null;
      let languageConfig = {
        baseCode: "zh",
        targetCode: "en",
        baseTag: "zh",
        targetTag: "en",
        toolLanguage: "en",
      };
      const LANGUAGES = {
        zh: { name: "Chinese (中文)", field: "chinese" },
        en: { name: "English", field: "english" },
        es: { name: "Spanish (español)", field: "spanish" },
        pt: { name: "Portuguese (português)", field: "portuguese" },
        ar: { name: "Arabic (العربية)", field: "arabic" },
      };
      function normalizeReplacementGlossary(entries) {
        const byIdentity = new Map();
        (Array.isArray(entries) ? entries : []).forEach((entry) => {
          const targetLanguage = String(entry?.target_language || "")
            .trim()
            .toLowerCase();
          const sourceTerm =
            typeof entry?.source_term === "string" ? entry.source_term : "";
          const replacementTerm =
            typeof entry?.replacement_term === "string"
              ? entry.replacement_term
              : "";
          if (!targetLanguage || !sourceTerm || sourceTerm === replacementTerm)
            return;
          byIdentity.set(`${targetLanguage}\u0000${sourceTerm}`, {
            target_language: targetLanguage,
            source_term: sourceTerm,
            replacement_term: replacementTerm,
            created_at: entry.created_at || new Date().toISOString(),
            updated_at:
              entry.updated_at || entry.created_at || new Date().toISOString(),
            application_count: Number(entry.application_count) || 0,
            total_occurrences_changed:
              Number(entry.total_occurrences_changed) || 0,
            last_affected_proposals:
              Number(entry.last_affected_proposals) || 0,
          });
        });
        return [...byIdentity.values()];
      }
      function normalizedPluralModeRequest(value) {
        if (
          !value ||
          value.action !== "enable" ||
          typeof value.plural_arg_name !== "string" ||
          !value.plural_arg_name.trim()
        )
          return null;
        return {
          action: "enable",
          plural_arg_name: value.plural_arg_name.trim(),
          rule_type: ["plural", "selectordinal"].includes(value.rule_type)
            ? value.rule_type
            : "plural",
        };
      }
      function normalizePersistedRow(row) {
        if (!row || typeof row !== "object") return row;
        return {
          ...row,
          _originalIsPlural:
            typeof row._originalIsPlural === "boolean"
              ? row._originalIsPlural
              : null,
          _originalPluralArgName:
            typeof row._originalPluralArgName === "string"
              ? row._originalPluralArgName
              : null,
          pluralModeRequest: normalizedPluralModeRequest(
            row.pluralModeRequest,
          ),
          doubleChecked: row.doubleChecked === true,
          doubleCheckEdited: row.doubleCheckEdited === true,
        };
      }
      function storedReplacementGlossary() {
        try {
          return normalizeReplacementGlossary(
            JSON.parse(localStorage.getItem(REPLACEMENT_GLOSSARY_STORAGE_KEY)),
          );
        } catch (_) {
          return [];
        }
      }
      function saveReplacementGlossary(entries) {
        replacementGlossary = normalizeReplacementGlossary(entries);
        try {
          localStorage.setItem(
            REPLACEMENT_GLOSSARY_STORAGE_KEY,
            JSON.stringify(replacementGlossary),
          );
        } catch (_) {}
      }
      function currentGlossaryLanguage() {
        return String(
          languageConfig.targetTag || languageConfig.targetCode || "",
        )
          .trim()
          .toLowerCase();
      }
      function recordReplacementRule(
        sourceTerm,
        replacementTerm,
        occurrences,
        affectedProposals,
      ) {
        const now = new Date().toISOString();
        const targetLanguage = currentGlossaryLanguage();
        const entries = normalizeReplacementGlossary(replacementGlossary);
        const existing = entries.find(
          (entry) =>
            entry.target_language === targetLanguage &&
            entry.source_term === sourceTerm,
        );
        if (existing) {
          existing.replacement_term = replacementTerm;
          existing.updated_at = now;
          existing.application_count += 1;
          existing.total_occurrences_changed += occurrences;
          existing.last_affected_proposals = affectedProposals;
        } else {
          entries.push({
            target_language: targetLanguage,
            source_term: sourceTerm,
            replacement_term: replacementTerm,
            created_at: now,
            updated_at: now,
            application_count: 1,
            total_occurrences_changed: occurrences,
            last_affected_proposals: affectedProposals,
          });
        }
        saveReplacementGlossary(entries);
      }
      // Manual sentence-case helper. It is never applied automatically.
      function sentenceCaseTranslation(
        value,
        lang = languageConfig.targetCode,
      ) {
        if (
          typeof value !== "string" ||
          !["en", "es", "pt", "fr"].some((code) => String(lang).toLowerCase().startsWith(code)) ||
          !value ||
          looksLikeIcuRule(value)
        )
          return value;
        const protectedParts = [];
        let text = value.replace(
          /\{[^{}]+\}|<[^>]*>|%\d*\$?[sdif]|https?:\/\/\S+|`[^`]*`/g,
          (m) => {
            const token = `\uE000${protectedParts.length}\uE001`;
            protectedParts.push(m);
            return token;
          },
        );
        let firstWord = true;
        text = text.replace(
          /[\p{L}][\p{L}\p{M}’'’-]*/gu,
          (word, offset, whole) => {
            const before = whole.slice(0, offset);
            const atSentenceStart =
              firstWord || /(?:^|[.!?。！？]\s+)[\s\p{P}\p{S}]*$/u.test(before);
            firstWord = false;
            // Preserve mixed-case names/identifiers and common short acronyms such as API, LMS, and URL.
            const isMixedCase =
              /[\p{Ll}][\p{Lu}]/u.test(word) || /[a-z][A-Z]/.test(word);
            const isShortAcronym = [
              "AI",
              "API",
              "LMS",
              "URL",
              "PDF",
              "CSV",
              "HTML",
              "CSS",
              "JSON",
              "XML",
              "SSO",
              "ID",
              "UI",
              "UX",
              "SMS",
              "OTP",
              "VPN",
              "FAQ",
              "QR",
              "HTTP",
              "HTTPS",
              "SQL",
              "MFA",
              "GPS",
              "USB",
              "NFC",
              "SAML",
              "OAuth",
              "ULearning","uClass","uLms","uRecord"
            ].includes(word.toLocaleUpperCase()) ||
              /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(word);
            let normalized = word;
            if (!isMixedCase && !isShortAcronym)
              normalized = word.toLocaleLowerCase(lang);
            if (atSentenceStart) {
              const firstLetter = normalized.match(/[\p{L}]/u);
              if (firstLetter) {
                const idx = normalized.indexOf(firstLetter[0]);
                normalized =
                  normalized.slice(0, idx) +
                  firstLetter[0].toLocaleUpperCase(lang) +
                  normalized.slice(idx + 1);
              }
            }
            return normalized;
          },
        );
        return text.replace(
          /\uE000(\d+)\uE001/g,
          (_, i) => protectedParts[Number(i)],
        );
      }
      function sentenceCaseSupported() {
        return ["en", "es", "pt", "fr"].some((code) =>
          String(languageConfig.targetCode || "").toLowerCase().startsWith(code),
        );
      }
      function sentenceCaseCandidate(value) {
        if (!sentenceCaseSupported() || looksLikeIcuRule(value)) return String(value ?? "");
        return sentenceCaseTranslation(String(value ?? ""), languageConfig.targetCode);
      }
      function needsSentenceCase(value) {
        const text = String(value ?? "");
        return !!text.trim() && sentenceCaseSupported() && !looksLikeIcuRule(text) && sentenceCaseCandidate(text) !== text;
      }

      const UI = {
        en: {
          setupTitle: "Prepare your review workspace",
          setupIntro:
            "Choose the source language, target language, and interface language first. Then import your project files, load screenshots if available, and choose where progress should be saved.",
          configTitle: "1. Choose languages",
          baseLabel: "Base / source language",
          targetLabel: "Target / translation language",
          uiLabel: "Tool interface language",
          importTitle: "2. Import project files",
          importDesc:
            "Import the original Tolgee JSON and, if available, the proposal JSON. Screenshot images can be selected in this step.",
          importJson: "Import JSON files",
          restore: "Restore progress backup",
          doubleCheck: "Conduct double check",
          screenshotsBtn: "Import screenshots folder",
          skipShots: "No screenshots to import — skip",
          folderTitle: "3. Choose where progress is saved",
          folderDesc:
            "Select the folder containing this standalone HTML file if you want file autosave. The tool creates a save/ subfolder and writes a separate progress JSON for the current project.",
          chooseFolder: "Choose saving folder",
          continueBrowser: "Continue with browser autosave instead",
          navTitle: "Review views",
          needs: "Needs review",
          pending: "Pending review",
          accepted: "Accepted / edited",
          rejected: "Rejected",
          unchanged: "Unchanged proposals",
          checkedUnchanged: "Checked unchanged proposals",
          doubleToCheck: "To be checked",
          doubleChecked: "Checked",
          reviewed: "Reviewed keys",
          untranslatable: "Unable to translate",
          all: "All strings",
          importTop: "Import JSON files",
          replaceTerms: "Replace glossary terms",
          chooseToolFolder: "Change saving location",
          backup: "Download backup",
          report: "Download review report",
          restoreTop: "Restore backup",
          clear: "Clear workspace",
          export: "Export review package",
          loaded: "All strings",
          pendingStat: "Pending review",
          approvedStat: "Accepted / edited",
          rejectedStat: "Rejected",
          progress: "Decision progress",
          search: "Search selected text fields…",
          searchInAll: "Search in: all text",
          searchInCount: "Search in {count} fields",
          searchSource: "Source text",
          searchOriginal: "Original translation",
          searchProposal: "ChatGPT proposal",
          searchFinal: "Final result",
          selectAllSearch: "Select all text fields",
          unchangedGroup: "Unchanged proposal review",
          changedGroup: "Changed proposal review",
          attentionGroup: "Attention",
          restoreTitle: "Restore review progress",
          restoreIntro:
            "Select the progress backup JSON. You may also select the screenshots folder now so screenshot images are available immediately.",
          restoreFile: "Progress backup JSON (required)",
          restoreScreenshots: "Screenshots folder (optional)",
          restoreScreenshotsHelp:
            "You can continue without this folder. Screenshot metadata remains in the backup, but images will stay unavailable until loaded.",
          continueRestore: "Continue restore",
          anyConfidence: "Any confidence",
          low: "Low (<70)",
          medium: "Medium (70–89)",
          high: "High (90–100)",
          none: "No estimate",
          clarification: "Human clarification needed",
          unable: "Unable to translate",
          sourceOrder: "Source order",
          keySort: "Key A–Z",
          lowest: "Lowest confidence first",
          highest: "Highest confidence first",
          page10: "10 / page",
          page20: "20 / page",
          page50: "50 / page",
          page100: "100 / page",
          first: "« First",
          previous: "‹ Previous",
          next: "Next ›",
          last: "Last »",
          existing: "EXISTING",
          original: "ORIGINAL",
          proposal: "PROPOSAL",
          final: "FINAL",
          exportResult: "EXPORT RESULT",
          clickOriginal: "Click text to edit from original",
          clickProposal: "Click text to edit from proposal",
          accept: "✓ Accept",
          acceptUnchanged: "✓ Accept as reviewed",
          rejectBtn: "✕ Reject",
          undo: "Undo decision",
          unableFlag: "⚑ Flag unable to translate",
          flagged: "✓ Flagged unable to translate",
          context: "Context description and metadata",
          editTitle: "Edit final translation",
          editLabel: "Final translation to export",
          fromProposal: "Start from proposal",
          fromOriginal: "Start from original translation",
          saveEdit: "Save edit",
          cancel: "Cancel",
          clarificationNeeded: "Clarification needed",
          noSource: "(No source text)",
          emptyTarget: "(Empty target value)",
          noProposal: "No proposal imported for this key.",
          showScreenshot: "Show screenshot",
          screenshots: "Entry screenshots",
          noStrings: "No strings match this view",
          tryFilter: "Try another filter or search term.",
          noSourceLoaded: "Import the Tolgee JSON to begin.",
          reviewIntro:
            "Compare the source, existing translation, and proposal. Accept, reject, or edit each suggestion. Export one review package containing the final JSON and matching report.",
          exportTarget: "Export target-language update JSON",
          setupFootnote:
            "Your data stays in this browser and the local folder you choose. The tool does not connect to Tolgee or call an AI service.",
          setupEyebrow: "FIRST-TIME WORKSPACE SETUP",
          languageHint:
            "Choose the languages before importing. These settings label the source and target correctly and determine the target language in the update export. They do not translate content.",
          restoreHint:
            "Already reviewed this project before? Restore a progress backup instead of importing the Tolgee and proposal JSON files again. The backup includes decisions and screenshot metadata. Image files are intentionally omitted; reselect the screenshot folder to view them.",
          liveLanguage: "Interface",
        },
        zh: {
          setupTitle: "准备翻译审核工作区",
          setupIntro:
            "请先选择源语言、目标语言和工具界面语言，然后导入项目文件、按需加载截图，并选择进度保存位置。",
          configTitle: "1. 选择语言",
          baseLabel: "基础语言 / 源语言",
          targetLabel: "目标语言 / 待翻译语言",
          uiLabel: "工具界面语言",
          importTitle: "2. 导入项目文件",
          importDesc:
            "导入原始 Tolgee JSON；如果有 ChatGPT 提案 JSON，也可以一并导入。此步骤也可选择截图。",
          importJson: "导入 JSON 文件",
          restore: "恢复审核备份",
          doubleCheck: "进行双重复核",
          screenshotsBtn: "导入截图文件夹",
          skipShots: "无需导入截图，跳过",
          folderTitle: "3. 选择保存位置",
          folderDesc:
            "选择包含此独立 HTML 文件的文件夹以启用文件自动保存。工具会自动创建 save/ 文件夹，并为当前项目保存独立的进度 JSON。",
          chooseFolder: "选择保存文件夹",
          continueBrowser: "改用浏览器自动保存",
          navTitle: "审核视图",
          needs: "需要关注",
          pending: "待审核",
          accepted: "已接受 / 已编辑",
          rejected: "已拒绝",
          unchanged: "未更改的提案",
          checkedUnchanged: "已检查的未更改提案",
          doubleToCheck: "待复核",
          doubleChecked: "已复核",
          reviewed: "已审核条目",
          untranslatable: "无法翻译",
          all: "全部字符串",
          importTop: "导入 JSON 文件",
          replaceTerms: "替换术语表术语",
          chooseToolFolder: "更改保存位置",
          backup: "下载备份",
          report: "下载审核报告",
          restoreTop: "恢复备份",
          clear: "清空工作区",
          export: "导出审核包",
          loaded: "全部字符串",
          pendingStat: "待审核",
          approvedStat: "已接受 / 已编辑",
          rejectedStat: "已拒绝",
          progress: "审核进度",
          search: "搜索所选文本字段…",
          searchInAll: "搜索范围：全部文本",
          searchInCount: "搜索 {count} 个字段",
          searchSource: "源文本",
          searchOriginal: "原始译文",
          searchProposal: "ChatGPT 提案",
          searchFinal: "最终结果",
          selectAllSearch: "选择全部文本字段",
          unchangedGroup: "未更改提案审核",
          changedGroup: "已更改提案审核",
          attentionGroup: "需要关注",
          restoreTitle: "恢复审核进度",
          restoreIntro:
            "请选择进度备份 JSON。也可以同时选择截图文件夹，以便恢复后立即查看截图。",
          restoreFile: "进度备份 JSON（必需）",
          restoreScreenshots: "截图文件夹（可选）",
          restoreScreenshotsHelp:
            "无需选择截图文件夹也可以继续。截图元数据仍会保留，但图片在加载前不可用。",
          continueRestore: "继续恢复",
          anyConfidence: "所有置信度",
          low: "低（<70）",
          medium: "中（70–89）",
          high: "高（90–100）",
          none: "无估计",
          clarification: "需要人工澄清",
          unable: "无法翻译",
          sourceOrder: "源顺序",
          keySort: "键名 A–Z",
          lowest: "置信度从低到高",
          highest: "置信度从高到低",
          page10: "每页 10 条",
          page20: "每页 20 条",
          page50: "每页 50 条",
          page100: "每页 100 条",
          first: "« 首页",
          previous: "‹ 上一页",
          next: "下一页 ›",
          last: "末页 »",
          existing: "现有译文",
          original: "原文",
          proposal: "翻译提案",
          final: "最终译文",
          exportResult: "导出结果",
          clickOriginal: "点击原译文可从原文开始编辑",
          clickProposal: "点击提案可从提案开始编辑",
          accept: "✓ 接受",
          acceptUnchanged: "✓ 接受并标记已审核",
          rejectBtn: "✕ 拒绝",
          undo: "撤销决定",
          unableFlag: "⚑ 标记为无法翻译",
          flagged: "✓ 已标记为无法翻译",
          context: "上下文说明和元数据",
          editTitle: "编辑最终译文",
          editLabel: "要导出的最终译文",
          fromProposal: "从提案开始",
          fromOriginal: "从原始译文开始",
          saveEdit: "保存编辑",
          cancel: "取消",
          clarificationNeeded: "需要澄清",
          noSource: "（无源文本）",
          emptyTarget: "（目标译文为空）",
          noProposal: "此键没有导入提案。",
          showScreenshot: "查看截图",
          screenshots: "条目截图",
          noStrings: "此视图没有匹配的字符串",
          tryFilter: "请尝试其他筛选条件或搜索词。",
          noSourceLoaded: "请先导入 Tolgee JSON。",
          reviewIntro:
            "对照源文本、现有译文和提案。逐条接受、拒绝或编辑建议，然后导出包含最终 JSON 和匹配审核报告的审核包。",
          exportTarget: "导出目标语言更新 JSON",
          setupFootnote:
            "数据保存在当前浏览器和您选择的本地文件夹中。本工具不会连接 Tolgee，也不会调用 AI 服务。",
          setupEyebrow: "首次工作区设置",
          languageHint:
            "请在导入前选择语言。这些设置用于正确标记源文本和目标译文，并决定更新导出中的目标语言；不会自动翻译内容。",
          restoreHint:
            "如果之前审核过此项目，可以恢复进度备份，无需重新导入 Tolgee 和提案 JSON。备份包含审核决定和截图元数据，但不包含图片文件；如需查看图片，请重新选择截图文件夹。",
          liveLanguage: "界面语言",
        },
      };
      function tr(key) {
        return (
          (UI[languageConfig.toolLanguage] || UI.en)[key] || UI.en[key] || key
        );
      }
      function languageName(code) {
        return LANGUAGES[code]?.name || code;
      }
      function languageLabel(code) {
        return (
          {
            zh: "Chinese",
            en: "English",
            es: "Spanish",
            pt: "Portuguese",
            ar: "Arabic",
          }[code] || code
        );
      }
      function applyToolLanguage() {
        const zh = languageConfig.toolLanguage === "zh";
        document.documentElement.lang = zh ? "zh-CN" : "en";
        const text = (id, key) => {
          const el = $(id);
          if (el) el.textContent = tr(key);
        };
        text("setupEyebrow", "setupEyebrow");
        text("setupLanguageHint", "languageHint");
        text("setupRestoreHint", "restoreHint");
        text("setupTitle", "setupTitle");
        text("setupIntro", "setupIntro");
        text("setupConfigTitle", "configTitle");
        text("setupBaseLabel", "baseLabel");
        text("setupTargetLabel", "targetLabel");
        text("setupUiLabel", "uiLabel");
        text("setupImportTitle", "importTitle");
        text("setupImportDesc", "importDesc");
        text("setupImportJsons", "importJson");
        text("setupRestoreBackup", "restore");
        text("setupDoubleCheck", "doubleCheck");
        text("setupImportScreenshots", "screenshotsBtn");
        text("setupSkipScreenshots", "skipShots");
        text("setupFolderTitle", "folderTitle");
        text("setupFolderDesc", "folderDesc");
        text("setupChooseFolder", "chooseFolder");
        text("setupContinueBrowser", "continueBrowser");
        text("setupFootnote", "setupFootnote");
        text("importFilesTop", "importTop");
        text("importScreenshotsTop", "screenshotsBtn");
        text("replaceTermsTop", "replaceTerms");
        text("autosaveFileTop", "chooseToolFolder");
        text("backupTop", "backup");
        text("restoreTop", "restoreTop");
        text("resetTop", "clear");
        text("liveLanguageLabelText", "liveLanguage");
        const projectMenuLabel = $("projectMenuLabel");
        if (projectMenuLabel)
          projectMenuLabel.textContent = zh ? "项目" : "Project";
        const sidebarHelpLabel = $("sidebarHelpLabel");
        if (sidebarHelpLabel)
          sidebarHelpLabel.textContent = zh
            ? "帮助和本地存储"
            : "Help & local storage";
        const mobileNavToggle = $("mobileNavToggle");
        if (mobileNavToggle)
          mobileNavToggle.textContent = zh ? "审核视图" : "Review views";
        const liveLanguage = $("liveToolLanguage");
        if (liveLanguage) liveLanguage.value = languageConfig.toolLanguage;
        const navMap = {
          needs: "needs",
          pending: "pending",
          accepted: "accepted",
          rejected: "rejected",
          unchanged: "unchanged",
          checkedUnchanged: "checkedUnchanged",
          reviewed: "reviewed",
          untranslatable: "untranslatable",
          all: "all",
          doubleToCheck: "doubleToCheck",
          doubleChecked: "doubleChecked",
          doubleAll: "all",
        };
        document.querySelectorAll(".nav[data-view]").forEach((b) => {
          const key = navMap[b.dataset.view];
          if (!key) return;
          const count = b.querySelector(".count");
          b.childNodes[0].textContent = tr(key) + " ";
        });
        text("navTitle", "navTitle");
        text("unchangedGroupLabel", "unchangedGroup");
        text("changedGroupLabel", "changedGroup");
        text("attentionGroupLabel", "attentionGroup");
        const head = document.querySelector(".head .eyebrow");
        if (head)
          head.textContent = `${languageLabel(languageConfig.baseCode)} → ${languageLabel(languageConfig.targetCode)} · ${zh ? "人工审核" : "Human-in-the-loop"}`;
        const mainTitle = $("projectTitle");
        if (mainTitle && !tolgee)
          mainTitle.textContent = zh
            ? "翻译审核工作区"
            : "Translation review workspace";
        const mainDesc = document.querySelector(".head p");
        if (mainDesc) mainDesc.textContent = tr("reviewIntro");
        const statLabels = document.querySelectorAll(".stat label");
        [
          "loaded",
          "pendingStat",
          "approvedStat",
          "rejectedStat",
          "progress",
        ].forEach((k, i) => {
          if (statLabels[i]) statLabels[i].textContent = tr(k);
        });
        const statSmalls = document.querySelectorAll(".stat small");
        if (statSmalls.length >= 5) {
          statSmalls[0].textContent = zh
            ? "来自 Tolgee 导出"
            : "From Tolgee export";
          statSmalls[1].textContent = zh
            ? "仅统计未决定的提案"
            : "Unresolved proposals only";
          statSmalls[2].textContent = zh
            ? "将使用选定的目标译文"
            : "Will use selected target translation";
          statSmalls[3].textContent = zh
            ? "保留原有目标译文"
            : "Original target retained";
          statSmalls[4].textContent = zh
            ? "已决定提案数 / 总提案数"
            : "Decided proposals / total proposals";
        }
        const q = $("q");
        if (q) q.placeholder = tr("search");
        const optionMap = {
          confidence: [
            ["any", "anyConfidence"],
            ["low", "low"],
            ["medium", "medium"],
            ["high", "high"],
            ["none", "none"],
          ],
          sort: [
            ["source", "sourceOrder"],
            ["key", "keySort"],
            ["confidenceAsc", "lowest"],
            ["confidenceDesc", "highest"],
          ],
          pageSize: [
            ["10", "page10"],
            ["20", "page20"],
            ["50", "page50"],
            ["100", "page100"],
          ],
        };
        for (const [id, opts] of Object.entries(optionMap)) {
          const el = $(id);
          if (el)
            for (const [value, key] of opts) {
              const o = [...el.options].find((x) => x.value === value);
              if (o) o.textContent = tr(key);
            }
        }
        document.querySelectorAll("[data-search-label]").forEach((el) => {
          const key = el.dataset.searchLabel;
          const label = el.parentElement?.querySelector("span");
          if (label) label.textContent = tr(key);
        });
        text("selectAllSearchScopes", "selectAllSearch");
        updateSearchScopeCaption();
        const clarificationToggle = document.querySelector(
          ".clarification-control",
        );
        if (clarificationToggle)
          setTrailingText(clarificationToggle, tr("clarification"));
        for (const id of [
          "firstPage",
          "prevPage",
          "prevBottom",
          "nextPage",
          "nextBottom",
          "lastPage",
        ]) {
          const el = $(id);
          if (el) {
            const map = {
              firstPage: "first",
              prevPage: "previous",
              prevBottom: "previous",
              nextPage: "next",
              nextBottom: "next",
              lastPage: "last",
            };
            el.textContent = tr(map[id]);
          }
        }
        text("modalTitle", zh ? "导入文件" : "Import files");
        text(
          "modalIntro",
          zh
            ? "导入原始 Tolgee 导出文件和 ChatGPT 提案文件。两者可以分别导入。"
            : "Load the original Tolgee export and the ChatGPT proposal file. They can be imported separately.",
        );
        text("loadFiles", zh ? "导入所选文件" : "Import selected file(s)");
        text("cancelModal", "cancel");
        text("editFromProposal", "fromProposal");
        text("editFromOriginal", "fromOriginal");
        text("saveEdit", "saveEdit");
        text("cancelEdit", "cancel");
        text("closeEdit", zh ? "✕" : "✕");
        updateIcuToolsVisibility();
        text("icuToolsTitle", zh ? "ICU 复数工具" : "ICU plural tools");
        text(
          "icuToolsHelp",
          zh
            ? "为每个数量变量添加一条复数规则，然后在保存前测试并验证组合消息。"
            : "Add one plural rule for each quantity variable, then test and validate the combined message before saving.",
        );
        text("icuVariableLabel", zh ? "数量变量" : "Quantity variable");
        text("icuRuleTypeLabel", zh ? "规则类型" : "Rule type");
        text("createIcuRule", zh ? "添加 ICU 规则" : "Add ICU rule");
        text("validateIcuRule", zh ? "验证 ICU" : "Validate ICU");
        text(
          "icuTestValuesLabel",
          zh ? "用 JSON 输入预览值" : "Preview values as JSON",
        );
        text("previewIcuRule", zh ? "预览结果" : "Preview result");
        text(
          "tolgeePluralSettingLabel",
          zh
            ? "Tolgee“使用复数形式”（自动）"
            : "Tolgee Use plural forms (automatic)",
        );
        text("restoreBackupTitle", "restoreTitle");
        text("restoreBackupIntro", "restoreIntro");
        text("restoreBackupFileLabel", "restoreFile");
        text("restoreScreenshotsLabel", "restoreScreenshots");
        text("restoreScreenshotsHelp", "restoreScreenshotsHelp");
        text("continueRestoreBackup", "continueRestore");
        text("cancelRestoreBackup", "cancel");
        const icuRuleType = $("icuRuleType");
        if (icuRuleType) {
          icuRuleType.options[0].textContent = zh
            ? "基数复数"
            : "Cardinal plural";
          icuRuleType.options[1].textContent = zh
            ? "序数复数"
            : "Ordinal plural";
        }
        text(
          "replaceTermsTitle",
          zh ? "替换目标语言术语" : "Replace target-language terms",
        );
        text(
          "replaceFindLabel",
          zh
            ? `查找精确的${languageLabel(languageConfig.targetCode)}术语`
            : `Find exact ${languageLabel(languageConfig.targetCode)} term`,
        );
        text("replaceWithLabel", zh ? "替换为" : "Replace with");
        text("replaceScopeLabel", zh ? "应用范围" : "Apply to");
        const replaceScope = $("replaceScope");
        if (replaceScope) {
          const pendingOption = [...replaceScope.options].find(
            (option) => option.value === "pending",
          );
          const allOption = [...replaceScope.options].find(
            (option) => option.value === "all",
          );
          if (pendingOption)
            pendingOption.textContent = zh
              ? "仅待审核提案"
              : "Pending proposals only";
          if (allOption)
            allOption.textContent = zh
              ? "所有条目，包括已决定的最终译文"
              : "All entries, including decided final translations";
        }
        text(
          "glossaryHeading",
          zh
            ? `已保存的${languageLabel(languageConfig.targetCode)}术语表`
            : `Saved ${languageLabel(languageConfig.targetCode)} glossary`,
        );
        text("cancelReplaceTerms", zh ? "关闭" : "Close");
        text(
          "downloadGlossaryJson",
          zh ? "下载术语表 JSON" : "Download glossary JSON",
        );
        text(
          "applyTermReplacement",
          zh ? "替换并保存规则" : "Replace and save rule",
        );
        const editTitle = $("editMeta");
        if (editTitle && activeEditKey) {
          const r = findRow(activeEditKey);
          if (r)
            editTitle.textContent = `${zh ? "键名" : "Key"}: ${r.key} · ${languageLabel(languageConfig.baseCode)}: ${r.chinese}`;
        }
        const editHeading = document.querySelector("#editModal .modalhead h2");
        if (editHeading) editHeading.textContent = tr("editTitle");
        const editLabel = document.querySelector('label[for="editText"]');
        if (editLabel) editLabel.textContent = tr("editLabel");
        const sideboxes = document.querySelectorAll(".sidebox");
        if (sideboxes.length) {
          if (zh) {
            sideboxes[0].innerHTML =
              "<b>安全交接流程</b>1. 导入原始 Tolgee JSON。<br>2. 导入 ChatGPT 提案。<br>3. 逐条审核。<br>4. 导出更新 JSON，再通过单独授权的 Tolgee 工作流应用。<br><br>此 HTML 工具不会调用 AI/API，也不使用 Tolgee 凭据。";
            sideboxes[1].innerHTML =
              "<b>本地保存进度</b>自动保存到当前浏览器。可选文件自动保存会将 save/{项目名称}_{项目ID}.json 写在工具旁边。切换设备或清除浏览器数据前，请先下载备份。";
          } else {
            sideboxes[0].innerHTML =
              "<b>Safe hand-off workflow</b>1. Import the original Tolgee JSON export.<br>2. Import ChatGPT proposals.<br>3. Decide page by page.<br>4. Export the update JSON and use your separate authorized Tolgee workflow to apply approved changes.<br><br>No AI/API calls or Tolgee credentials are used in this HTML file.";
            sideboxes[1].innerHTML =
              "<b>Progress is local</b>Auto-saves in this browser profile. Optional file autosave writes save/{project-name}_{project-id}.json beside the tool. Download a progress backup before switching devices or clearing browser data.";
          }
        }
        const brandText = document.querySelector(".brand .brand-text");
        if (brandText)
          brandText.textContent = doubleCheckMode
            ? zh
              ? "双重复核"
              : "Double Check"
            : zh
              ? "翻译审核工作台"
              : "Review Desk";
        const exportButton = $("exportTop");
        if (exportButton)
          exportButton.textContent = doubleCheckMode
            ? languageConfig.toolLanguage === "zh"
              ? "导出最终 JSON + 报告"
              : "Export final JSON + report"
            : tr("export");
        const setupBrandText = document.querySelector(
          ".setup-brand .brand-text",
        );
        if (setupBrandText)
          setupBrandText.textContent = zh ? "翻译审核" : "Translation Review";
        const dropLabels = document.querySelectorAll(".drop label");
        if (dropLabels.length >= 3) {
          dropLabels[0].textContent = zh
            ? "1. 原始 Tolgee JSON（最终导出必需）"
            : "1. Original Tolgee JSON (required for final export)";
          dropLabels[1].textContent = zh
            ? "2. ChatGPT 提案 JSON（可选）"
            : "2. ChatGPT proposals JSON (optional)";
          dropLabels[2].textContent = zh
            ? "3. 截图文件夹（可选）"
            : "3. Screenshots folder (optional fallback)";
        }
        const dropSmalls = document.querySelectorAll(".drop small");
        if (dropSmalls.length >= 3 && zh) {
          dropSmalls[0].textContent =
            "预期结构：schema_version、project、export_metadata、translations[]。截图元数据用于审核并保存在备份中；最终 Tolgee 更新导出不包含截图数据。";
          dropSmalls[1].textContent =
            "预期结构为包含 translations[] 或 proposals[] 的 JSON。按 object_id、key_id、精确 namespace + key 的顺序匹配；仅在 key 唯一时才使用裸 key。";
          dropSmalls[2].textContent =
            "选择导出截图所在文件夹。工具会根据 screenshots[].local_file、filename 或 screenshot_id 将图片匹配到 Tolgee 条目。";
        }
        const screenshotTitle = $("screenshotModalTitle");
        if (screenshotTitle && !$("screenshotModal").classList.contains("open"))
          screenshotTitle.textContent = zh ? "条目截图" : "Entry screenshot";
        const previousScreenshot = $("previousScreenshot");
        const nextScreenshot = $("nextScreenshot");
        if (previousScreenshot) {
          const label = zh ? "上一张截图" : "Previous screenshot";
          previousScreenshot.title = label;
          previousScreenshot.setAttribute("aria-label", label);
        }
        if (nextScreenshot) {
          const label = zh ? "下一张截图" : "Next screenshot";
          nextScreenshot.title = label;
          nextScreenshot.setAttribute("aria-label", label);
        }
      }
      function setTrailingText(el, value) {
        for (let i = el.childNodes.length - 1; i >= 0; i--) {
          const n = el.childNodes[i];
          if (n.nodeType === 3 && n.textContent.trim()) {
            n.textContent = " " + value;
            return;
          }
        }
        el.append(document.createTextNode(" " + value));
      }
      function languageFieldCandidates(code, role) {
        const aliases = {
          zh: [
            "chinese",
            "zh",
            "zh-CN",
            "zh_CN",
            "source_zh",
            "text_zh",
            "zh_text",
          ],
          en: ["english", "en", "en-US", "source_en", "text_en", "en_text"],
          es: [
            "spanish",
            "es",
            "es-ES",
            "target_es",
            "translation_es",
            "text_es",
            "es_text",
            "translated_es",
            "es_translation",
          ],
          pt: [
            "portuguese",
            "português",
            "pt",
            "pt-PT",
            "pt-BR",
            "target_pt",
            "translation_pt",
            "text_pt",
            "pt_text",
            "translated_pt",
            "pt_translation",
          ],
          ar: [
            "arabic",
            "العربية",
            "ar",
            "ar-SA",
            "target_ar",
            "translation_ar",
            "text_ar",
            "ar_text",
            "translated_ar",
            "ar_translation",
          ],
        };
        const own = aliases[code] || [code];
        if (role === "base")
          return [
            ...own,
            "source_text",
            "source",
            "base_text",
            "base",
            "original_text",
            "original",
          ];
        return [
          ...own,
          "target_text",
          "target",
          "translation",
          "translated_text",
          "value",
        ];
      }
      function readLanguageValue(entry, code, role) {
        if (!entry || typeof entry !== "object") return "";
        for (const k of languageFieldCandidates(code, role)) {
          if (
            Object.prototype.hasOwnProperty.call(entry, k) &&
            entry[k] !== null &&
            entry[k] !== undefined
          )
            return String(entry[k]);
        }
        return "";
      }
      function syncExactLanguageTagsFromProject(data) {
        const project = data?.project || {};
        const importedBaseTag = project.base_language_tag;
        const importedTargetTag = project.target_language_tag;
        languageConfig.baseTag =
          typeof importedBaseTag === "string" && importedBaseTag.trim()
            ? importedBaseTag
            : languageConfig.baseTag || languageConfig.baseCode;
        languageConfig.targetTag =
          typeof importedTargetTag === "string" && importedTargetTag.trim()
            ? importedTargetTag
            : languageConfig.targetTag || languageConfig.targetCode;
      }
      function exactLanguageTag(role) {
        return role === "base"
          ? languageConfig.baseTag || languageConfig.baseCode
          : languageConfig.targetTag || languageConfig.targetCode;
      }
      function namespaceKeyIdentity(namespace, key) {
        return `${String(namespace ?? "")}\u0000${String(key ?? "")}`;
      }
      function escapeObjectIdComponent(value) {
        return String(value ?? "")
          .replace(/\\/g, "\\\\")
          .replace(/\./g, "\\.")
          .replace(/#/g, "\\#");
      }
      function buildObjectId(namespace, key, keyId, duplicateNamespaceKey) {
        const escapedKey = escapeObjectIdComponent(key);
        const base =
          namespace == null
            ? escapedKey
            : `${escapeObjectIdComponent(namespace)}.${escapedKey}`;
        if (!duplicateNamespaceKey) return base;
        if (keyId == null || String(keyId).trim() === "")
          throw Error(
            `Duplicate namespace/key pair ${base} requires key_id for safe identity.`,
          );
        return `${base}#${String(keyId)}`;
      }
      const STORE_KEY = "ulearning-translation-review-fallback-v1";
      let lastAutosaveStatusMessage = "";
      let lastAutosaveErrorNotified = "";
      function notify(msg, duration = 2600, undoAction = null) {
        const toast = $("toast");
        toast.innerHTML = "";
        const content = document.createElement("span");
        content.className = "toast-content";
        const message = document.createElement("span");
        message.textContent = String(msg ?? "");
        content.appendChild(message);
        pendingToastUndo = typeof undoAction === "function" ? undoAction : null;
        if (pendingToastUndo) {
          const undo = document.createElement("button");
          undo.type = "button";
          undo.className = "toast-undo";
          undo.textContent = languageConfig.toolLanguage === "zh" ? "点击撤销" : "Click to undo";
          undo.addEventListener("click", async () => {
            const action = pendingToastUndo;
            pendingToastUndo = null;
            toast.classList.remove("show");
            if (action) await action();
          });
          content.appendChild(undo);
        }
        toast.appendChild(content);
        toast.classList.add("show");
        clearTimeout(notify.t);
        notify.t = setTimeout(() => {
          pendingToastUndo = null;
          toast.classList.remove("show");
        }, duration);
      }
      function openDB() {
        return new Promise((resolve) => {
          if (!("indexedDB" in window)) {
            resolve(null);
            return;
          }
          let req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = () => {
            let d = req.result;
            if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      }
      /* --------------------------------------------------------------------------
   Persistence
   - Browser storage remains the automatic fallback.
   - For file autosave, the user selects the folder containing the standalone HTML file. The app creates/uses a child folder named save/.
   - A separate JSON backup is written for each project, using its name and ID.
   - Browsers cannot silently discover or write beside the HTML file: the user
     must grant folder access once. The remembered permission may need renewal.
   -------------------------------------------------------------------------- */
      function safeFolderPart(value) {
        return (
          String(value || "project")
            .normalize("NFC")
            .replace(/[^\p{L}\p{N}_.-]+/gu, "_")
            .replace(/^[_ .-]+|[_ .-]+$/g, "")
            .slice(0, 70) || "project"
        );
      }
      function autosaveFilename() {
        const project = tolgee?.project || {};
        const name = safeFolderPart(project.name || "project");
        const id =
          project.id !== undefined &&
          project.id !== null &&
          String(project.id) !== ""
            ? safeFolderPart(String(project.id))
            : "no_id";
        return `${name}_${id}.json`;
      }
      async function storeDirectoryHandle(handle) {
        if (db)
          await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put(handle, "autosaveDirectoryHandle");
            tx.oncomplete = resolve;
            tx.onerror = () =>
              reject(tx.error || Error("Could not remember the tool folder"));
          });
      }
      async function clearStoredHandle(key) {
        if (db)
          await new Promise((resolve) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = resolve;
            tx.onerror = resolve;
          });
      }
      async function hasFileInDirectory(handle, name) {
        try {
          await handle.getFileHandle(name);
          return true;
        } catch (_) {
          return false;
        }
      }
      async function getAutosaveTargetDirectory() {
        if (!autosaveDirectoryHandle)
          throw Error("Choose a saving folder first.");
        let looksLikeToolFolder =
          (await hasFileInDirectory(autosaveDirectoryHandle, "index.html")) &&
          (await hasFileInDirectory(autosaveDirectoryHandle, "styles.css")) &&
          (await hasFileInDirectory(autosaveDirectoryHandle, "app.js"));
        // Standalone distribution: the folder containing the single HTML file is also a tool folder.
        if (!looksLikeToolFolder) {
          try {
            for await (const [
              entryName,
              entryHandle,
            ] of autosaveDirectoryHandle.entries()) {
              if (
                entryHandle.kind === "file" &&
                entryName.toLowerCase().endsWith(".html")
              ) {
                looksLikeToolFolder = true;
                break;
              }
            }
          } catch (_) {}
        }
        // Keep project saves in save/ when the selected folder contains the tool HTML.
        // If the user selects any other folder, write the project JSON directly there.
        if (looksLikeToolFolder)
          return await autosaveDirectoryHandle.getDirectoryHandle("save", {
            create: true,
          });
        return autosaveDirectoryHandle;
      }
      function rowsWithoutScreenshotImages(sourceRows = rows) {
        return (Array.isArray(sourceRows) ? sourceRows : []).map((row) => {
          if (!row || typeof row !== "object") return row;
          return {
            ...row,
            screenshots: Array.isArray(row.screenshots)
              ? row.screenshots.map((screenshot) => {
                  if (!screenshot || typeof screenshot !== "object")
                    return screenshot;
                  const { _previewDataUrl, ...metadata } = screenshot;
                  return metadata;
                })
              : [],
          };
        });
      }
      function workspaceSnapshot({
        backup = false,
        persistedRows = rowsWithoutScreenshotImages(),
      } = {}) {
        const snapshot = {
          tolgee,
          originalTolgeeJson,
          rows: persistedRows,
          currentView,
          pageSize: $("pageSize").value,
          languageConfig,
          screenshot_images_included: false,
          screenshot_restore_note:
            "Screenshot metadata is preserved. Reselect the screenshot folder to view images.",
        };
        if (backup) {
          snapshot.backup_schema_version = 1;
          snapshot.backed_up_at = new Date().toISOString();
        } else snapshot.savedAt = new Date().toISOString();
        return snapshot;
      }
      async function persist() {
        const persistedRows = rowsWithoutScreenshotImages();
        const payload = workspaceSnapshot({ persistedRows });
        const backupPayload = tolgee
          ? workspaceSnapshot({ backup: true, persistedRows })
          : null;
        const saveResult = {
          browserSaved: false,
          fileSaved: false,
          fileError: "",
        };
        persistQueue = persistQueue.then(async () => {
          let browserSaved = false;
          try {
            if (db) {
              await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, "readwrite");
                tx.objectStore(STORE).put(payload, "active");
                tx.oncomplete = resolve;
                tx.onerror = () =>
                  reject(tx.error || Error("IndexedDB save failed"));
              });
              browserSaved = true;
            } else {
              localStorage.setItem(STORE_KEY, JSON.stringify(payload));
              browserSaved = true;
            }
          } catch (e) {
            try {
              localStorage.setItem(STORE_KEY, JSON.stringify(payload));
              browserSaved = true;
            } catch (_) {}
          }
          saveResult.browserSaved = browserSaved;
          if (autosaveFileHandle && tolgee) {
            try {
              let permission = await autosaveFileHandle.queryPermission({
                mode: "readwrite",
              });
              if (permission !== "granted")
                permission = await autosaveFileHandle.requestPermission({
                  mode: "readwrite",
                });
              if (permission !== "granted")
                throw Error(
                  "Write permission for the selected backup file is not available",
                );
              const writable = await autosaveFileHandle.createWritable();
              await writable.write(
                JSON.stringify(backupPayload, null, 2),
              );
              await writable.close();
              const savedFile = await autosaveFileHandle.getFile();
              if (!savedFile.size)
                throw Error("The selected backup file is empty after writing");
              saveResult.fileSaved = true;
              lastSavedAt = new Date();
              setAutosaveStatus(
                `Saved directly to ${autosaveFileHandle.name} at ${lastSavedAt.toLocaleTimeString()}`,
                "ok",
              );
            } catch (e) {
              saveResult.fileError =
                e.message || "permission or disk error";
              setAutosaveStatus(
                "Backup-file autosave failed: " +
                  saveResult.fileError +
                  ". Browser autosave may still be available; download a backup.",
                "error",
              );
            }
          } else if (autosaveDirectoryHandle && tolgee) {
            try {
              let permission = await autosaveDirectoryHandle.queryPermission({
                mode: "readwrite",
              });
              if (permission !== "granted")
                permission = await autosaveDirectoryHandle.requestPermission({
                  mode: "readwrite",
                });
              if (permission !== "granted")
                throw Error("Folder write permission is not available");
              const saveDirectory = await getAutosaveTargetDirectory();
              const filename = autosaveFilename();
              const fileHandle = await saveDirectory.getFileHandle(filename, {
                create: true,
              });
              const writable = await fileHandle.createWritable();
              await writable.write(
                JSON.stringify(backupPayload, null, 2),
              );
              await writable.close();
              const savedFile = await fileHandle.getFile();
              if (!savedFile.size)
                throw Error("The selected folder produced an empty backup file");
              saveResult.fileSaved = true;
              lastSavedAt = new Date();
              setAutosaveStatus(
                `Saved to save/${filename} at ${lastSavedAt.toLocaleTimeString()}`,
                "ok",
              );
            } catch (e) {
              saveResult.fileError =
                e.message || "permission or disk error";
              setAutosaveStatus(
                "File autosave failed: " +
                  saveResult.fileError +
                  ". Browser autosave may still be available; download a backup.",
                "error",
              );
            }
          }
          if (!browserSaved && !autosaveDirectoryHandle && !autosaveFileHandle)
            notify("Auto-save failed. Download a progress backup now.");
        });
        await persistQueue;
        return saveResult;
      }
      function setAutosaveStatus(message, kind = "") {
        const el = $("autosaveFileStatus");
        lastAutosaveStatusMessage = message;
        if (el) {
          el.title = message;
          el.setAttribute("aria-label", message);
          el.textContent =
            kind === "error"
              ? "Saving issue"
              : kind === "ok"
                ? "Saved locally"
                : "Local saving";
          el.className =
            "autosave-status top-autosave" + (kind ? " " + kind : "");
        }
        if (kind === "error" && message !== lastAutosaveErrorNotified) {
          lastAutosaveErrorNotified = message;
          notify(
            `Saving issue: ${message} Click “Saving issue” to show this reason again.`,
            8000,
          );
        } else if (kind !== "error") {
          lastAutosaveErrorNotified = "";
        }
      }
      function showAutosaveStatusDetails() {
        const el = $("autosaveFileStatus");
        const message =
          lastAutosaveStatusMessage ||
          el?.title ||
          "Local saving status is not available yet.";
        notify(
          `${el?.classList.contains("error") ? "Saving issue: " : "Saving status: "}${message}`,
          8000,
        );
      }
      $("autosaveFileStatus").addEventListener(
        "click",
        showAutosaveStatusDetails,
      );
      $("autosaveFileStatus").addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showAutosaveStatusDetails();
        }
      });
      async function chooseAutosaveFile(fromSetup = false) {
        if (!window.showDirectoryPicker) {
          if (fromSetup) {
            $("setupContinueBrowser").hidden = true;
            $("setupFolderStatus").textContent =
              languageConfig.toolLanguage === "zh"
                ? "此浏览器不支持选择保存文件夹。请使用支持文件夹访问的 Chrome 或 Edge；新项目无法在未选择保存位置时继续。"
                : "This browser cannot select a saving folder. Use Chrome or Edge with folder-access support; a new project cannot continue until a saving location is selected.";
            $("setupFolderStatus").className = "setup-status error";
          } else
            notify(
              "File autosave requires Chrome or Edge with folder access support. Browser autosave and manual backups remain available.",
            );
          return false;
        }
        try {
          const handle = await window.showDirectoryPicker({
            mode: "readwrite",
          });
          // Let any already-queued save finish before changing the destination.
          // This prevents an older queued operation from racing the location switch.
          await persistQueue;
          autosaveDirectoryHandle = handle;
          autosaveFileHandle = null;
          await storeDirectoryHandle(autosaveDirectoryHandle);
          await clearStoredHandle("autosaveFileHandle");
          let looksLikeToolFolder =
            (await hasFileInDirectory(handle, "index.html")) &&
            (await hasFileInDirectory(handle, "styles.css")) &&
            (await hasFileInDirectory(handle, "app.js"));
          if (!looksLikeToolFolder) {
            try {
              for await (const [entryName, entryHandle] of handle.entries()) {
                if (
                  entryHandle.kind === "file" &&
                  entryName.toLowerCase().endsWith(".html")
                ) {
                  looksLikeToolFolder = true;
                  break;
                }
              }
            } catch (_) {}
          }
          const destination = looksLikeToolFolder
            ? "save/ subfolder"
            : "selected folder";
          let saveResult = null;
          if (tolgee) saveResult = await persist();
          else
            setAutosaveStatus(
              "Saving location selected: " +
                (handle.name || "folder") +
                " — project JSON will be written to the " +
                destination,
              "ok",
            );
          if (tolgee && !saveResult?.fileSaved) {
            const reason =
              saveResult?.fileError ||
              "The backup file could not be verified after writing";
            $("setupFolderStatus").textContent =
              "Saving folder selected, but the first backup could not be verified: " +
              reason;
            $("setupFolderStatus").className = "setup-status error";
            notify(
              "Saving location was not confirmed: " +
                reason +
                ". Grant folder access again or choose another folder.",
              9000,
            );
            return false;
          }
          $("setupFolderStatus").textContent =
            "Saving folder selected: " +
            (handle.name || "folder") +
            ". Project JSON will be written to the " +
            destination +
            ".";
          $("setupFolderStatus").className = "setup-status ok";
          if (fromSetup) finishSetup();
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已更改保存位置，后续项目进度将保存到所选位置。"
              : "Saving location changed. Future project progress will be saved to the selected location.",
          );
          return true;
        } catch (e) {
          if (e.name !== "AbortError")
            notify(
              (languageConfig.toolLanguage === "zh"
                ? "无法选择保存位置："
                : "Could not choose saving location: ") + e.message,
            );
          return false;
        }
      }
      async function restoreAutosave() {
        try {
          if (db) {
            let value = await new Promise((resolve) => {
              let req = db
                .transaction(STORE, "readonly")
                .objectStore(STORE)
                .get("active");
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
            if (value) return value;
          }
          let s = localStorage.getItem(STORE_KEY);
          return s ? JSON.parse(s) : null;
        } catch (e) {
          return null;
        }
      }
      /* Review decisions and final-value resolution. */
      function statusOf(r) {
        if (r.decision && r.decision !== "pending") return r.decision;
        if (hasProposal(r) && r.proposal !== r.english) return "pending";
        return "unchanged";
      }
      function finalEnglish(r) {
        const s = statusOf(r);
        if (s === "accepted")
          return r.finalEnglish ?? r.proposal ?? r.english;
        if (s === "edited") return r.finalEnglish ?? r.proposal ?? r.english;
        if (s === "rejected") return r.finalEnglish ?? r.english;
        return r.english;
      }
      function hasProposal(r) {
        return typeof r.proposal === "string" && r.proposal.trim() !== "";
      }
      function differs(r) {
        return hasProposal(r) && r.proposal !== r.english;
      }
      function proposalDecided(r) {
        return (
          differs(r) && ["accepted", "rejected", "edited"].includes(statusOf(r))
        );
      }
      function scoreBand(r) {
        if (!Number.isFinite(r.confidence)) return "none";
        return r.confidence < 70
          ? "low"
          : r.confidence < 90
            ? "medium"
            : "high";
      }
      function parseTolgee(data) {
        if (
          !data ||
          typeof data !== "object" ||
          !Array.isArray(data.translations)
        )
          throw Error(
            "This file does not match the Tolgee import structure: expected a top-level translations array.",
          );
        if (!data.project || !Array.isArray(data.translations))
          throw Error("Missing project metadata or translations array.");
        if (
          data.project.id === undefined ||
          data.project.id === null ||
          String(data.project.id).trim() === ""
        )
          throw Error("The imported Tolgee JSON is missing project.id.");
        if (
          typeof data.project.branch !== "string" ||
          !data.project.branch.trim()
        )
          throw Error(
            "The imported Tolgee JSON is missing the exact review branch. The tool will not guess or default to main.",
          );
        // A bare key is not globally unique in Tolgee when namespaces are used.
        // Some legacy datasets also contain multiple key IDs for the same
        // namespace+key pair, so key_id remains the final authority.
        const seenObjectIds = new Set();
        const seenKeyIds = new Set();
        const namespaceKeyCounts = new Map();
        for (const x of data.translations) {
          if (!x || typeof x !== "object" || typeof x.key !== "string" || !x.key)
            continue;
          const pair = namespaceKeyIdentity(x.namespace, x.key);
          namespaceKeyCounts.set(pair, (namespaceKeyCounts.get(pair) || 0) + 1);
        }
        if (!Array.isArray(data.namespaces))
          data.namespaces = [
            ...new Set(
              data.translations
                .map((x) => x?.namespace)
                .filter((namespace) => namespace != null && namespace !== ""),
            ),
          ];
        const parsed = data.translations.map((x, i) => {
          if (!x || typeof x !== "object")
            throw Error("Invalid translation entry at index " + i);
          if (typeof x.key !== "string" || !x.key)
            throw Error("Translation entry " + i + " has no key.");
          const namespaceValue = x.namespace ?? null;
          const keyId = x.key_id == null ? "" : String(x.key_id).trim();
          const namespaceKey = namespaceKeyIdentity(namespaceValue, x.key);
          const suppliedObjectId =
            x.object_id == null ? "" : String(x.object_id).trim();
          const objectId =
            suppliedObjectId ||
            buildObjectId(
              namespaceValue,
              x.key,
              x.key_id,
              (namespaceKeyCounts.get(namespaceKey) || 0) > 1,
            );
          if (objectId && seenObjectIds.has(objectId))
            throw Error("Duplicate Tolgee object_id: " + objectId);
          if (keyId && seenKeyIds.has(keyId))
            throw Error("Duplicate Tolgee key_id: " + keyId);
          if (objectId) seenObjectIds.add(objectId);
          if (keyId) seenKeyIds.add(keyId);
          const base = readLanguageValue(x, languageConfig.baseCode, "base");
          const target = readLanguageValue(
            x,
            languageConfig.targetCode,
            "target",
          );
          return {
            key: x.key,
            object_id: objectId,
            key_id: x.key_id ?? null,
            namespace: namespaceValue,
            chinese: base,
            english: target,
            _originalEnglish: target,
            translation_state: x.translation_state ?? "",
            translation_state_raw: x.translation_state_raw ?? "",
            _originalTranslationState: x.translation_state ?? "",
            _originalTranslationStateRaw: x.translation_state_raw ?? "",
            _originalIsPlural:
              typeof x.is_plural === "boolean"
                ? x.is_plural
                : typeof x.isPlural === "boolean"
                  ? x.isPlural
                  : null,
            _originalPluralArgName:
              typeof x.plural_arg_name === "string"
                ? x.plural_arg_name
                : typeof x.pluralArgName === "string"
                  ? x.pluralArgName
                  : null,
            pluralModeRequest: null,
            context_description: x.context_description ?? "",
            screenshots: Array.isArray(x.screenshots)
              ? x.screenshots.map((sc) => ({ ...sc, _previewDataUrl: null }))
              : [],
            proposal: "",
            reason: "",
            issue_category: "",
            clarification_needed: false,
            unable_to_translate: false,
            confidence: null,
            decision: "unchanged",
            decisionAt: null,
            finalEnglish: undefined,
            doubleChecked: false,
            originalIndex: i,
            placeholderMismatch: false,
            _sourceField:
              languageFieldCandidates(languageConfig.baseCode, "base").find(
                (k) => Object.prototype.hasOwnProperty.call(x, k),
              ) || null,
            _targetField:
              languageFieldCandidates(languageConfig.targetCode, "target").find(
                (k) => Object.prototype.hasOwnProperty.call(x, k),
              ) || null,
          };
        });
        if (
          parsed.length &&
          languageConfig.targetCode !== "en" &&
          parsed.every((r) => !r._targetField) &&
          data.translations.some((x) =>
            Object.prototype.hasOwnProperty.call(x, "english"),
          )
        )
          throw Error(
            `The selected target language is ${languageName(languageConfig.targetCode)}, but the JSON only contains an "english" field and no matching target-language field. Import a JSON with "${LANGUAGES[languageConfig.targetCode]?.field || languageConfig.targetCode}" or "target_text" values, or select English as the target language.`,
          );
        return { data, parsed };
      }
      function normalizeProposalEntry(x) {
        if (!x || typeof x !== "object") return null;
        const targetField =
          LANGUAGES[languageConfig.targetCode]?.field ||
          languageConfig.targetCode;
        const baseField =
          LANGUAGES[languageConfig.baseCode]?.field || languageConfig.baseCode;
        const proposal =
          x.proposal ??
          x[`proposed_${targetField}`] ??
          x[`suggested_${targetField}`] ??
          x[`proposed_${languageConfig.targetCode}`] ??
          x[`suggested_${languageConfig.targetCode}`] ??
          x.proposed_english ??
          x.suggested_english ??
          x.suggestion ??
          x.proposed_translation ??
          null;
        const existingTarget =
          x.existing_target ??
          x[`existing_${targetField}`] ??
          x[`existing_${languageConfig.targetCode}`] ??
          x.target_text ??
          x[targetField] ??
          x[languageConfig.targetCode] ??
          x.existing_english ??
          (languageConfig.targetCode === "en" ? x.english : null) ??
          null;
        return {
          key: x.key ?? x.tolgee_key ?? x.name ?? null,
          object_id: x.object_id ?? null,
          key_id: x.key_id ?? null,
          namespace: x.namespace ?? null,
          _namespaceProvided: Object.prototype.hasOwnProperty.call(
            x,
            "namespace",
          ),
          proposal,
          reason: x.reason ?? x.explanation ?? x.rationale ?? "",
          issue_category: x.issue_category ?? x.category ?? "",
          clarification_needed: !!(
            x.clarification_needed ??
            x.needs_clarification ??
            false
          ),
          unable_to_translate:
            !!(
              x.unable_to_translate ??
              x.cannot_translate ??
              x.untranslatable ??
              x.translation_impossible ??
              x.needs_human_translation ??
              false
            ) ||
            /unable to translate|cannot translate|could not translate|untranslatable|not understood|cannot understand|could not understand/i.test(
              String(x.issue_category ?? x.category ?? ""),
            ),
          confidence:
            Number.isFinite(Number(x.confidence)) && x.confidence !== ""
              ? Math.max(0, Math.min(100, Number(x.confidence)))
              : null,
          source_chinese:
            x.source_text ??
            x.base_text ??
            x[`source_${languageConfig.baseCode}`] ??
            x[baseField] ??
            x.chinese ??
            x.source_chinese ??
            null,
          existing_english: existingTarget,
        };
      }
      function parseProposals(data) {
        let arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.translations)
            ? data.translations
            : Array.isArray(data?.proposals)
              ? data.proposals
              : null;
        if (!arr)
          throw Error(
            "Proposal JSON must be an array or contain a translations[] / proposals[] array.",
          );
        return arr
          .map(normalizeProposalEntry)
          .filter(
            (x) =>
              x &&
              (x.object_id !== null || x.key_id !== null || x.key !== null) &&
              typeof x.proposal === "string",
          );
      }
      function matchProposals(proposals) {
        const byObjectId = new Map(
          rows.filter((r) => r.object_id != null && String(r.object_id).trim() !== "")
            .map((r) => [String(r.object_id), r]),
        );
        const byId = new Map(
          rows.filter((r) => r.key_id != null)
            .map((r) => [String(r.key_id), r]),
        );
        const namespaceKeyGroups = new Map();
        for (const r of rows) {
          const pair = namespaceKeyIdentity(r.namespace, r.key);
          if (!namespaceKeyGroups.has(pair)) namespaceKeyGroups.set(pair, []);
          namespaceKeyGroups.get(pair).push(r);
        }
        const keyGroups = new Map();
        for (const r of rows) {
          const k = String(r.key);
          if (!keyGroups.has(k)) keyGroups.set(k, []);
          keyGroups.get(k).push(r);
        }
        let matched = 0, unmatched = [], dupes = [];
        for (const p of proposals) {
          let r = p.object_id != null ? byObjectId.get(String(p.object_id)) : null;
          if (!r && p.key_id != null) r = byId.get(String(p.key_id));
          if (!r && p.key != null && p._namespaceProvided) {
            const candidates =
              namespaceKeyGroups.get(
                namespaceKeyIdentity(p.namespace, p.key),
              ) || [];
            if (candidates.length === 1) r = candidates[0];
            else if (candidates.length > 1) {
              unmatched.push(
                `${p.namespace ? `${p.namespace}.` : ""}${p.key} (ambiguous duplicate namespace/key pair: provide object_id or key_id)`,
              );
              continue;
            }
          }
          if (!r && p.key != null) {
            const candidates = keyGroups.get(String(p.key)) || [];
            if (candidates.length === 1) r = candidates[0];
            else if (candidates.length > 1) {
              unmatched.push(`${p.namespace ? `${p.namespace}.` : ""}${p.key} (ambiguous: provide object_id, key_id, or namespace)`);
              continue;
            }
          }
          if (!r) {
            unmatched.push(p.object_id ?? p.key_id ?? `${p.namespace ? `${p.namespace}.` : ""}${p.key}`);
            continue;
          }
          const conflictingIdentity =
            (p.object_id != null &&
              String(p.object_id) !== String(r.object_id)) ||
            (p.key_id != null && String(p.key_id) !== String(r.key_id)) ||
            (p.key != null && String(p.key) !== String(r.key)) ||
            (p._namespaceProvided &&
              String(p.namespace ?? "") !== String(r.namespace ?? ""));
          if (conflictingIdentity) {
            unmatched.push(
              `${p.object_id ?? p.key_id ?? p.key} (conflicting object_id, key_id, key, or namespace)`,
            );
            continue;
          }
          if (r._proposalImported) {
            dupes.push(`${r.namespace ? `${r.namespace}.` : ""}${r.key}`);
            continue;
          }
          if (
            p.source_chinese !== null &&
            String(p.source_chinese) !== String(r.chinese)
          ) {
            r.proposalSourceMismatch = true;
          }
          if (
            p.existing_english !== null &&
            String(p.existing_english) !== String(r.english)
          ) {
            r.proposalExistingMismatch = true;
          }
          r.proposal = p.proposal;
          r.reason = String(p.reason ?? "");
          r.issue_category = String(p.issue_category ?? "");
          r.clarification_needed = p.clarification_needed;
          r.unable_to_translate = !!p.unable_to_translate;
          r.confidence = p.confidence;
          r._proposalImported = true;
          r.decision = r.proposal === r.english ? "unchanged" : "pending";
          r.decisionAt = null;
          r.finalEnglish = undefined;
          checkPlaceholders(r);
          matched++;
        }
        proposalCount = matched;
        return { matched, unmatched, dupes };
      }
      function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function placeholders(s) {
        const a = String(s ?? "");
        let found = [];
        const re = /\{[^{}]+\}|%(\d+\$)?[sdif]|<\/?[A-Za-z][^>]*>|\\[nrt\\]/g;
        let m;
        while ((m = re.exec(a))) found.push(m[0]);
        return found.sort();
      }
      function sameArray(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
      }
      function checkPlaceholders(r) {
        const proposalIcu = validateIcuTranslation(r, r.proposal);
        const existingHasIcu = looksLikeIcuRule(r.english);
        if (existingHasIcu && !proposalIcu.isIcu) {
          r.icuProposal = true;
          r.icuProposalError = "The proposal removes the existing ICU rule.";
          r.placeholderMismatch = true;
          return true;
        }
        if (proposalIcu.isIcu) {
          r.icuProposal = true;
          r.icuProposalError = proposalIcu.valid ? "" : proposalIcu.error;
          r.placeholderMismatch = !proposalIcu.valid;
          return r.placeholderMismatch;
        }
        r.icuProposal = false;
        r.icuProposalError = "";
        let original = placeholders(r.english),
          candidate = placeholders(r.proposal);
        r.placeholderMismatch =
          hasProposal(r) && !sameArray(original, candidate);
        return r.placeholderMismatch;
      }
      function setView(v) {
        currentView = v;
        page = 1;
        document
          .querySelectorAll(".nav[data-view]")
          .forEach((b) => b.classList.toggle("active", b.dataset.view === v));
        render();
      }
      function markReviewed(r) {
        r.translation_state = "REVIEWED";
        r.translation_state_raw = "REVIEWED";
      }
      function restoreOriginalTranslationState(r) {
        r.translation_state =
          r._originalTranslationState ?? r.translation_state ?? "";
        r.translation_state_raw =
          r._originalTranslationStateRaw ?? r.translation_state_raw ?? "";
      }
      function isTolgeeReviewed(r) {
        return /reviewed/i.test(
          String(r.translation_state || "") +
            " " +
            String(r.translation_state_raw || ""),
        );
      }
      function isUnchangedProposal(r) {
        return (
          r._proposalImported && hasProposal(r) && r.proposal === r.english
        );
      }
      function isCheckedUnchangedProposal(r) {
        return (
          isUnchangedProposal(r) &&
          ["accepted", "edited"].includes(statusOf(r))
        );
      }
      function isUncheckedUnchangedProposal(r) {
        return (
          isUnchangedProposal(r) &&
          !r.unable_to_translate &&
          !isCheckedUnchangedProposal(r)
        );
      }
      function doubleCheckFinalValue(r) {
        return finalEnglish(r);
      }
      function doubleCheckVisibleRows() {
        const q = $("q").value.trim().toLowerCase();
        const scopes = selectedSearchScopes();
        return rows.filter((r) => {
          if (currentView === "untranslatable" && !r.unable_to_translate) return false;
          if (currentView === "doubleToCheck" && (r.doubleChecked || r.unable_to_translate)) return false;
          if (currentView === "doubleChecked" && (!r.doubleChecked || r.unable_to_translate)) return false;
          const searchable = {
            source: r.chinese,
            original: r.english,
            proposal: r.proposal,
            final: doubleCheckFinalValue(r),
          };
          return !q || scopes.map((scope) => searchable[scope]).join(" ").toLowerCase().includes(q);
        });
      }
      function doubleCheckCardHTML(r) {
        const checked = !!r.doubleChecked;
        const reviewerEdited = !!r.doubleCheckEdited;
        const finalValue = doubleCheckFinalValue(r);
        const proposalDiffers = hasProposal(r) && finalValue !== r.proposal;
        const unable = !!r.unable_to_translate;
        return `<article class="item double-check-card${checked ? " double-checked" : ""}${reviewerEdited && checked ? " review-edited" : ""}"><div class="itemhead"><div style="min-width:0"><div class="source-line"><div class="zh">${esc(r.chinese || tr("noSource"))}</div></div><div class="key">${esc(r.key)}${r.namespace ? ` · namespace: ${esc(r.namespace)}` : ""} · ID: ${esc(r.key_id ?? "—")}</div></div><div class="chips"><span class="chip ${unable ? "bad" : reviewerEdited && checked ? "edited" : checked ? "accepted" : "pending"}">${esc(unable ? (languageConfig.toolLanguage === "zh" ? "无法翻译" : "Unable to translate") : reviewerEdited && checked ? (languageConfig.toolLanguage === "zh" ? "复核者已编辑" : "Reviewer edited") : checked ? (languageConfig.toolLanguage === "zh" ? "已复核" : "Checked") : (languageConfig.toolLanguage === "zh" ? "待复核" : "To be checked"))}</span></div></div><div class="cols"><div class="panelwrap"><div class="label">${esc(languageConfig.toolLanguage === "zh" ? "原始译文" : "ORIGINAL TRANSLATION")}</div><div class="panel" dir="auto">${esc(r.english || "") || `<span class="missing">${esc(tr("emptyTarget"))}</span>`}</div></div><div class="panelwrap"><div class="label">${esc(languageConfig.toolLanguage === "zh" ? "最终译文" : "FINAL TRANSLATION")}</div><div class="panel" dir="auto">${esc(finalValue || "") || `<span class="missing">${esc(tr("emptyTarget"))}</span>`}</div></div></div>${proposalDiffers ? `<div class="proposal-reference"><b>${esc(languageConfig.toolLanguage === "zh" ? "ChatGPT 提案参考" : "ChatGPT proposal reference")}</b><div dir="auto">${esc(r.proposal)}</div></div>` : ""}${r.reason ? `<div class="reason">${esc(r.reason)}</div>` : ""}${screenshotHTML(r)}<div class="cardfoot"><span class="finalnote">${esc(unable ? (languageConfig.toolLanguage === "zh" ? "此条目在备份中已标记为无法翻译。" : "This entry was flagged unable to translate in the backup.") : reviewerEdited && checked ? (languageConfig.toolLanguage === "zh" ? "复核者已编辑最终译文。" : "Reviewer edited the final translation.") : checked ? (languageConfig.toolLanguage === "zh" ? "已完成复核。" : "Double check completed.") : (languageConfig.toolLanguage === "zh" ? "请核对原始译文与最终译文。" : "Compare the original and final translations."))}</span><div class="actions">${unable ? `<button class="small bad" data-act="toggleUntranslatable" data-key="${esc(rowIdentity(r))}">${tr("flagged")}</button>` : `<button class="small ${checked ? "" : "good"}" data-act="doubleCheckToggle" data-key="${esc(rowIdentity(r))}">${checked ? (languageConfig.toolLanguage === "zh" ? "撤销复核" : "Undo check") : (languageConfig.toolLanguage === "zh" ? "标记已复核" : "Mark checked")}</button>`}</div></div></article>`;
      }
      function doubleCheckCardWithIdentity(r) {
        let html = doubleCheckCardHTML(r);
        const marker = "</div></div></article>";
        const markerIndex = html.lastIndexOf(marker);
        const editButton = `<button class="small" data-act="doubleCheckEdit" data-key="${esc(rowIdentity(r))}">${esc(languageConfig.toolLanguage === "zh" ? "编辑最终译文" : "Edit final")}</button>`;
        if (markerIndex >= 0) html = html.slice(0, markerIndex) + editButton + html.slice(markerIndex);
        return html.replace(
          "<article ",
          `<article data-double-check-key="${esc(rowIdentity(r))}" `,
        );
      }
      function configureDoubleCheckMode(active) {
        doubleCheckMode = !!active;
        document.body.classList.toggle("double-check-mode", doubleCheckMode);
        const brandText = document.querySelector(".brand .brand-text");
        if (brandText)
          brandText.textContent = doubleCheckMode
            ? languageConfig.toolLanguage === "zh"
              ? "双重复核"
              : "Double Check"
            : languageConfig.toolLanguage === "zh"
              ? "翻译审核工作台"
              : "Review Desk";
        const exportButton = $("exportTop");
        if (exportButton)
          exportButton.textContent = doubleCheckMode
            ? languageConfig.toolLanguage === "zh"
              ? "导出最终 JSON + 报告"
              : "Export final JSON + report"
            : tr("export");
        const confidenceControl = $("confidence");
        if (confidenceControl) confidenceControl.hidden = doubleCheckMode;
        const importScreenshotsTop = $("importScreenshotsTop");
        if (importScreenshotsTop)
          importScreenshotsTop.hidden = !doubleCheckMode;
        const clarificationControl = $("onlyIssues")?.closest("label");
        if (clarificationControl) {
          clarificationControl.hidden = doubleCheckMode;
          if (doubleCheckMode)
            clarificationControl.style.setProperty("display", "none", "important");
          else clarificationControl.style.removeProperty("display");
        }
        const labels = {
          all: ["All strings", "全部字符串", "all"],
          pending: ["To be checked", "待复核", "doubleToCheck"],
          accepted: ["Checked", "已复核", "doubleChecked"],
          rejected: ["Rejected", "已拒绝", "rejected"],
          untranslatable: ["Unable to translate", "无法翻译", "untranslatable"],
        };
        document.querySelectorAll(".nav[data-view]").forEach((button) => {
          if (!button.dataset.normalView) button.dataset.normalView = button.dataset.view;
          const normalView = button.classList.contains("nav-all") ? "all" : button.dataset.normalView;
          if (!doubleCheckMode) {
            const normalLabels = { all: "All strings", unchanged: "Unchanged proposals", checkedUnchanged: "Checked unchanged proposals", pending: "Pending review", accepted: "Accepted / edited", rejected: "Rejected", untranslatable: "Unable to translate" };
            button.dataset.view = normalView;
            button.classList.remove("hidden");
            button.childNodes[0].textContent = `${languageConfig.toolLanguage === "zh" ? ({ all: "全部字符串", unchanged: "未更改提案", checkedUnchanged: "已检查的未更改提案", pending: "待审核", accepted: "已接受 / 已编辑", rejected: "已拒绝", untranslatable: "无法翻译" }[normalView] || normalLabels[normalView]) : normalLabels[normalView]} `;
            return;
          }
          const key = normalView === "untranslatable"
            ? "untranslatable"
            : normalView === "unchanged" || normalView === "checkedUnchanged"
              ? "accepted"
              : normalView;
          const item = labels[key];
          if (!item) return;
          button.dataset.doubleKey = key;
          button.dataset.view = doubleCheckMode ? item[2] : normalView;
          const doubleVisible = ["all", "pending", "accepted", "untranslatable"].includes(normalView);
          button.classList.toggle("hidden", doubleCheckMode && !doubleVisible);
          if (doubleCheckMode && !doubleVisible) button.dataset.view = normalView;
          if (!doubleCheckMode) button.classList.remove("hidden");
          const count = button.querySelector(".count");
          button.childNodes[0].textContent = `${languageConfig.toolLanguage === "zh" ? item[1] : item[0]} `;
          if (count) count.textContent = "0";
        });
        if (doubleCheckMode) {
          currentView = "doubleToCheck";
          $("notice").textContent = languageConfig.toolLanguage === "zh" ? "双重复核模式：只核对备份中的原始译文和最终译文。" : "Double-check mode: compare only the backup's original and final translations.";
        }
      }
      function renderDoubleCheck() {
        const all = rows.length;
        const toCheck = rows.filter((r) => !r.doubleChecked && !r.unable_to_translate).length;
        const checked = rows.filter((r) => r.doubleChecked && !r.unable_to_translate).length;
        const unable = rows.filter((r) => r.unable_to_translate).length;
        const counts = { all, doubleAll: all, doubleToCheck: toCheck, doubleChecked: checked, untranslatable: unable };
        document.querySelectorAll(".nav[data-view]").forEach((button) => {
          const count = button.querySelector(".count");
          if (count) count.textContent = String(counts[button.dataset.view] ?? 0);
          button.classList.toggle("active", button.dataset.view === currentView);
        });
        const arr = doubleCheckVisibleRows();
        const size = Number($("pageSize").value) || 20;
        const pages = Math.max(1, Math.ceil(arr.length / size));
        page = Math.max(1, Math.min(page, pages));
        const start = (page - 1) * size;
        const chunk = arr.slice(start, start + size);
        $("shown").textContent = arr.length ? `Showing ${start + 1}–${Math.min(start + size, arr.length)} of ${arr.length} matching strings (${all} total)` : `0 matching strings (${all} total)`;
        $("shownBottom").textContent = $("shown").textContent;
        $("pageInfo").textContent = `Page ${arr.length ? page : 0} of ${arr.length ? pages : 0}`;
        ["firstPage", "prevPage", "prevBottom"].forEach((id) => ($(id).disabled = page <= 1 || !arr.length));
        ["nextPage", "nextBottom", "lastPage"].forEach((id) => ($(id).disabled = page >= pages || !arr.length));
        $("list").innerHTML = chunk.length ? chunk.map(doubleCheckCardWithIdentity).join("") : `<div class="empty"><b>${esc(languageConfig.toolLanguage === "zh" ? "没有待复核条目" : "No entries in this view")}</b></div>`;
      }
      function hasReviewDecision(r) {
        return ["accepted", "rejected", "edited"].includes(statusOf(r));
      }
      function visibleRows() {
        let q = $("q").value.trim().toLowerCase(),
          searchScopes = selectedSearchScopes(),
          c = $("confidence").value,
          issues = $("onlyIssues").checked;
        let arr = rows.filter((r) => {
          let s = statusOf(r);
          const decided = ["accepted", "rejected", "edited"].includes(s);
          if (
            currentView === "needs" &&
            (r.unable_to_translate ||
              decided ||
              !(
                (differs(r) && s === "pending") ||
                r.clarification_needed ||
                r.placeholderMismatch ||
                r.proposalSourceMismatch ||
                r.proposalExistingMismatch
              ))
          )
            return false;
          if (
            currentView === "pending" &&
            (!differs(r) || s !== "pending" || r.unable_to_translate)
          )
            return false;
          if (
            currentView === "accepted" &&
            (!["accepted", "edited"].includes(s) ||
              isUnchangedProposal(r) ||
              r.unable_to_translate)
          )
            return false;
          if (
            currentView === "rejected" &&
            (s !== "rejected" || r.unable_to_translate)
          )
            return false;
          if (
            currentView === "unchanged" &&
            !isUncheckedUnchangedProposal(r)
          )
            return false;
          if (
            currentView === "checkedUnchanged" &&
            (!isCheckedUnchangedProposal(r) || r.unable_to_translate)
          )
            return false;
          if (currentView === "reviewed" && !hasReviewDecision(r)) return false;
          if (currentView === "untranslatable" && !r.unable_to_translate)
            return false;
          if (c !== "any" && scoreBand(r) !== c) return false;
          if (issues && !r.clarification_needed) return false;
          if (q) {
            const searchable = {
              source: r.chinese,
              original: r.english,
              proposal: r.proposal,
              final: finalEnglish(r),
            };
            let hay = searchScopes
              .map((scope) => searchable[scope])
              .join(" ")
              .toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        // Decision and attention queues are chronological so accidental actions are easy to find and undo.
        if (
          currentView === "accepted" ||
          currentView === "rejected" ||
          currentView === "checkedUnchanged" ||
          currentView === "untranslatable"
        )
          arr.sort((a, b) => {
            const timestamp = (row) =>
              currentView === "untranslatable"
                ? row.attentionAt || row.decisionAt
                : row.decisionAt;
            const ta = Date.parse(timestamp(a) || "") || 0,
              tb = Date.parse(timestamp(b) || "") || 0;
            return tb - ta || (b.originalIndex ?? 0) - (a.originalIndex ?? 0);
          });
        else {
          let sort = $("sort").value;
          if (sort === "key") arr.sort((a, b) => a.key.localeCompare(b.key));
          if (sort === "confidenceAsc")
            arr.sort((a, b) => (a.confidence ?? -1) - (b.confidence ?? -1));
          if (sort === "confidenceDesc")
            arr.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
        }
        return arr;
      }
      function render() {
        if (doubleCheckMode) {
          renderDoubleCheck();
          return;
        }
        const decisions = rows.filter(proposalDecided).length,
          has = rows.filter(differs).length,
          pending = rows.filter(
            (r) =>
              statusOf(r) === "pending" &&
              differs(r) &&
              !r.unable_to_translate,
          ).length,
          approved = rows.filter((r) =>
            ["accepted", "edited"].includes(statusOf(r)),
          ).length,
          acceptedQueue = rows.filter(
            (r) =>
              ["accepted", "edited"].includes(statusOf(r)) &&
              !isUnchangedProposal(r) &&
              !r.unable_to_translate,
          ).length,
          rejected = rows.filter((r) => statusOf(r) === "rejected").length,
          rejectedQueue = rows.filter(
            (r) => statusOf(r) === "rejected" && !r.unable_to_translate,
          ).length,
          reviewed = rows.filter(hasReviewDecision).length;
        $("total").textContent = rows.length;
        $("pending").textContent = pending;
        $("approved").textContent = approved;
        $("rejected").textContent = rejected;
        let pool = [],
          done = 0,
          progressVerb =
            languageConfig.toolLanguage === "zh" ? "已审核" : "reviewed";
        if (currentView === "pending") {
          pool = rows.filter((r) => differs(r) && !r.unable_to_translate);
          done = pool.filter(proposalDecided).length;
          progressVerb =
            languageConfig.toolLanguage === "zh" ? "已决定" : "decided";
        } else if (currentView === "unchanged") {
          pool = rows.filter(
            (r) => isUnchangedProposal(r) && !r.unable_to_translate,
          );
          done = pool.filter((r) =>
            ["accepted", "edited"].includes(statusOf(r)),
          ).length;
          progressVerb =
            languageConfig.toolLanguage === "zh"
              ? "已接受或编辑"
              : "accepted or edited";
        } else if (currentView === "checkedUnchanged") {
          pool = rows.filter(
            (r) => isUnchangedProposal(r) && !r.unable_to_translate,
          );
          done = pool.filter(isCheckedUnchangedProposal).length;
          progressVerb =
            languageConfig.toolLanguage === "zh"
              ? "已检查"
              : "checked";
        } else if (currentView === "accepted") {
          pool = rows.filter(
            (r) =>
              differs(r) &&
              !isUnchangedProposal(r) &&
              !r.unable_to_translate,
          );
          done = pool.filter((r) =>
            ["accepted", "edited"].includes(statusOf(r)),
          ).length;
          progressVerb =
            languageConfig.toolLanguage === "zh"
              ? "已接受或编辑"
              : "accepted or edited";
        } else if (currentView === "rejected") {
          pool = rows.filter((r) => differs(r) && !r.unable_to_translate);
          done = pool.filter((r) => statusOf(r) === "rejected").length;
          progressVerb =
            languageConfig.toolLanguage === "zh" ? "已拒绝" : "rejected";
        } else if (currentView === "needs") {
          pool = rows.filter(
            (r) =>
              !r.unable_to_translate &&
              (differs(r) ||
                r.clarification_needed ||
                r.placeholderMismatch ||
                r.proposalSourceMismatch ||
                r.proposalExistingMismatch),
          );
          done = pool.filter(hasReviewDecision).length;
        } else if (currentView === "untranslatable") {
          pool = rows.filter((r) => r.unable_to_translate);
          done = pool.filter(hasReviewDecision).length;
        } else {
          pool = rows;
          done = reviewed;
        }
        const percent = pool.length
          ? Math.round((done / pool.length) * 100)
          : 0;
        $("progress").textContent = percent + "%";
        const progressStat = document.querySelector(".progress-stat");
        if (progressStat)
          progressStat.style.setProperty("--progress", percent + "%");
        $("progressText").textContent =
          languageConfig.toolLanguage === "zh"
            ? `${done} / ${pool.length} 条${progressVerb}`
            : `${done} of ${pool.length} ${progressVerb}`;
        $("nPending").textContent = pending;
        $("nApproved").textContent = acceptedQueue;
        $("nRejected").textContent = rejectedQueue;
        const uncheckedUnchangedCount = rows.filter(
          isUncheckedUnchangedProposal,
        ).length;
        const checkedUnchangedCount = rows.filter(
          (r) => isCheckedUnchangedProposal(r) && !r.unable_to_translate,
        ).length;
        $("nUnchanged").textContent = uncheckedUnchangedCount;
        $("nCheckedUnchanged").textContent = checkedUnchangedCount;
        if ($("nReviewed")) $("nReviewed").textContent = reviewed;
        $("nUntranslatable").textContent = rows.filter(
          (r) => r.unable_to_translate,
        ).length;
        $("nAll").textContent = rows.length;
        const arr = visibleRows(),
          size = Number($("pageSize").value) || 20,
          pages = Math.max(1, Math.ceil(arr.length / size));
        page = Math.max(1, Math.min(page, pages));
        const start = (page - 1) * size,
          chunk = arr.slice(start, start + size);
        $("shown").textContent =
          languageConfig.toolLanguage === "zh"
            ? arr.length
              ? `显示第 ${start + 1}–${Math.min(start + size, arr.length)} 条，共 ${arr.length} 条匹配字符串（总计 ${rows.length} 条）`
              : `0 条匹配字符串（总计 ${rows.length} 条）`
            : arr.length
              ? `Showing ${start + 1}–${Math.min(start + size, arr.length)} of ${arr.length} matching strings (${rows.length} total)`
              : `0 matching strings (${rows.length} total)`;
        $("shownBottom").textContent = $("shown").textContent;
        $("pageInfo").textContent =
          languageConfig.toolLanguage === "zh"
            ? `第 ${arr.length ? page : 0} 页，共 ${arr.length ? pages : 0} 页`
            : `Page ${arr.length ? page : 0} of ${arr.length ? pages : 0}`;
        ["firstPage", "prevPage", "prevBottom"].forEach(
          (id) => ($(id).disabled = page <= 1 || !arr.length),
        );
        ["nextPage", "nextBottom", "lastPage"].forEach(
          (id) => ($(id).disabled = page >= pages || !arr.length),
        );
        $("list").innerHTML = chunk.length
          ? chunk.map(cardHTML).join("")
          : `<div class="empty"><b>${esc(tr("noStrings"))}</b>${rows.length ? esc(tr("tryFilter")) : esc(tr("noSourceLoaded"))}</div>`;
        document.title =
          (tolgee?.project?.name || "ULearning") + " — Translation Review Desk";
      }
      function normalizePath(p) {
        return String(p || "")
          .replace(/\\/g, "/")
          .replace(/^\.?\//, "")
          .toLowerCase();
      }
      function baseName(p) {
        return normalizePath(p).split("/").pop() || "";
      }
      async function attachScreenshotFiles(fileList) {
        const files = [...(fileList || [])];
        if (!files.length) return { matched: 0, missing: 0 };
        const pathMap = new Map(),
          baseMap = new Map();
        for (const f of files) {
          const rel = normalizePath(f.webkitRelativePath || f.name);
          if (!pathMap.has(rel)) pathMap.set(rel, f);
          const base = baseName(rel);
          if (!baseMap.has(base)) baseMap.set(base, []);
          baseMap.get(base).push(f);
        }
        let matched = 0,
          missing = 0;
        for (const r of rows) {
          for (const sc of r.screenshots || []) {
            const local = normalizePath(sc.local_file || ""),
              filename = normalizePath(sc.filename || "");
            let f =
              (local && pathMap.get(local)) ||
              [...files].find((x) => {
                const rp = normalizePath(x.webkitRelativePath || x.name);
                return local && rp.endsWith("/" + local);
              }) ||
              (filename && pathMap.get(filename));
            if (!f && filename) {
              const candidates = baseMap.get(baseName(filename)) || [];
              f =
                candidates.find((x) =>
                  String(x.name).startsWith(String(sc.screenshot_id) + "-"),
                ) || candidates[0];
            }
            if (!f && sc.screenshot_id) {
              f = files.find((x) =>
                String(x.name).startsWith(String(sc.screenshot_id) + "-"),
              );
            }
            if (f && /^image\//i.test(f.type || "")) {
              try {
                sc._previewDataUrl = await readFileAsDataURL(f);
                sc._loadedFilename = f.name;
                matched++;
              } catch (e) {
                sc._previewDataUrl = null;
                missing++;
              }
            } else missing++;
          }
        }
        return { matched, missing };
      }
      function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(Error("Could not read screenshot " + file.name));
          reader.readAsDataURL(file);
        });
      }
      function screenshotHTML(r) {
        const shots = Array.isArray(r.screenshots) ? r.screenshots : [];
        if (!shots.length) return "";
        const ready = shots
          .map((sc, index) => ({ sc, index }))
          .filter((x) => x.sc._previewDataUrl);
        let html = `<div class="screenshots"><div class="screenshots-title">${esc(tr("screenshots"))} · ${shots.length}</div>`;
        if (ready.length) {
          html += `<div class="screenshot-actions"><button type="button" class="small" data-act="showScreenshot" data-key="${esc(rowIdentity(r))}" data-shot-index="${ready[0].index}">${esc(tr("showScreenshot"))}${ready.length > 1 ? ` · ${ready.length}` : ""}</button></div>`;
        }
        if (ready.length < shots.length)
          html += `<div class="screenshot-missing">${shots.length - ready.length} screenshot(s) have metadata but no loaded image. Select the screenshot folder during import to display them.</div>`;
        return html + "</div>";
      }
      function renderActiveScreenshot() {
        const r = findRow(activeScreenshotKey);
        const index = activeScreenshotIndexes[activeScreenshotPosition];
        const sc = r?.screenshots?.[index];
        if (!sc?._previewDataUrl) {
          closeScreenshot();
          return;
        }
        $("screenshotModalTitle").textContent = `${languageConfig.toolLanguage === "zh" ? "截图" : "Screenshot"} · ${r.key}`;
        $("screenshotModalImage").src = sc._previewDataUrl;
        $("screenshotModalImage").alt =
          sc.original_text || sc.filename || "Tolgee entry screenshot";
        $("screenshotModalCounter").textContent =
          `${activeScreenshotPosition + 1} / ${activeScreenshotIndexes.length}`;
        $("previousScreenshot").disabled = activeScreenshotPosition === 0;
        $("nextScreenshot").disabled =
          activeScreenshotPosition === activeScreenshotIndexes.length - 1;
      }
      function showScreenshot(key, index) {
        const r = findRow(key);
        const readyIndexes = (r?.screenshots || [])
          .map((sc, shotIndex) => (sc?._previewDataUrl ? shotIndex : null))
          .filter((shotIndex) => shotIndex != null);
        if (!readyIndexes.length) {
          notify(
            languageConfig.toolLanguage === "zh"
              ? "尚未加载此截图。请重新导入截图文件夹。"
              : "This screenshot image has not been loaded. Re-import the screenshots folder.",
          );
          return;
        }
        activeScreenshotKey = key;
        activeScreenshotIndexes = readyIndexes;
        const requestedPosition = readyIndexes.indexOf(Number(index));
        activeScreenshotPosition = requestedPosition >= 0 ? requestedPosition : 0;
        renderActiveScreenshot();
        $("screenshotModal").classList.add("open");
      }
      function navigateScreenshot(offset) {
        const nextPosition = activeScreenshotPosition + offset;
        if (
          nextPosition < 0 ||
          nextPosition >= activeScreenshotIndexes.length
        )
          return;
        activeScreenshotPosition = nextPosition;
        renderActiveScreenshot();
      }
      function closeScreenshot() {
        $("screenshotModal").classList.remove("open");
        $("screenshotModalImage").removeAttribute("src");
        activeScreenshotKey = null;
        activeScreenshotIndexes = [];
        activeScreenshotPosition = 0;
      }

      function icuPreviewNoteHTML(
        view,
        previewNumber = icuPreviewNumber,
        rowKey = "",
      ) {
        if (!view?.note || !view.preview) return view?.note ? `<div class="icu-card-preview-note">${esc(view.note)}</div>` : "";
        const label = languageConfig.toolLanguage === "zh" ? "预览数字" : "Preview number";
        return `<div class="icu-card-preview-note"><span>${esc(view.note)}</span><label>${esc(label)} <input class="icu-preview-number" type="number" min="0" step="1" value="${esc(previewNumber)}" data-icu-preview-input data-icu-preview-key="${esc(rowKey)}" aria-label="${esc(label)}"></label></div>`;
      }

      function cardHTML(r) {
        const s = statusOf(r),
          baseName = languageLabel(languageConfig.baseCode),
          targetName = languageLabel(languageConfig.targetCode),
          zhUI = languageConfig.toolLanguage === "zh",
          unchangedProposal = isUnchangedProposal(r);
        const previewNumber =
          icuPreviewNumbers.get(rowIdentity(r)) ?? icuPreviewNumber;
        const targetDirAttr = isRtlLanguage() ? ' dir="rtl"' : "";
        const hasIcu = [r.english, r.proposal, finalEnglish(r)].some(
          looksLikeIcuRule,
        );
        const showRawIcu = icuRawVisible.has(rowIdentity(r));
        const icuChip = hasIcu
          ? `<span class="chip conf" title="This entry contains an ICU MessageFormat rule.">ICU</span>`
          : "";
        const pluralModeRequest = normalizedPluralModeRequest(
          r.pluralModeRequest,
        );
        const tolgeePluralChip =
          r._originalIsPlural === true
            ? `<span class="chip conf" title="Tolgee Use plural forms is already enabled for this key.">${esc(zhUI ? "Tolgee 复数已启用" : "Tolgee plural enabled")}</span>`
            : pluralModeRequest
              ? `<span class="chip conf" title="The push report will request this key-level Tolgee setting.">${esc(zhUI ? `推送时启用复数：${pluralModeRequest.plural_arg_name}` : `Enable plural on push: ${pluralModeRequest.plural_arg_name}`)}</span>`
              : "";
        const icuViewButton = hasIcu
          ? `<button type="button" class="small icu-view-toggle" data-act="toggleIcuView" data-key="${esc(rowIdentity(r))}">${esc(showRawIcu ? (zhUI ? "显示预览" : "Show preview") : zhUI ? "显示 ICU" : "Show ICU")}</button>`
          : "";
        const conf = Number.isFinite(r.confidence)
          ? `<span class="chip conf">${zhUI ? "置信度估计" : "Confidence estimate"}: ${r.confidence}/100</span>`
          : `<span class="chip conf">${zhUI ? "无置信度估计" : "No confidence estimate"}</span>`;
        const statusLabel =
          {
            pending: zhUI ? "待决定" : "Pending decision",
            accepted: zhUI ? "已接受" : "Accepted",
            rejected: zhUI ? "已拒绝" : "Rejected",
            edited: zhUI ? "人工编辑" : "Human-edited",
            unchanged: zhUI ? "无更改提案" : "No change proposed",
          }[s] || s;
        let warning =
          (r.placeholderMismatch
            ? `<div class="placeholder-warning">⚠ ${esc(r.icuProposalError || (zhUI ? "占位符/标签检查：提案与现有目标译文中的占位符或标签不同，请在接受前核对。" : "Placeholder/tag check: the proposal contains a different set of placeholders or tags than the existing target translation. Verify before accepting."))}</div>`
            : "") +
          (r.proposalSourceMismatch
            ? `<div class="placeholder-warning">⚠ ${zhUI ? "提案源文本与导入的 Tolgee 源文本不同，请检查键匹配。" : "Proposal source text differs from the imported Tolgee source. Verify key matching."}</div>`
            : "") +
          (r.proposalExistingMismatch
            ? `<div class="placeholder-warning">⚠ ${zhUI ? "提案中的现有目标译文与 Tolgee 不同，请确认提案基于当前导出生成。" : "Existing target translation in the proposal differs from Tolgee. Verify it was generated from this export."}</div>`
            : "");
        const proposalText = hasProposal(r) ? r.proposal : tr("noProposal");
        const selected = finalEnglish(r);
        const sentenceTarget = sentenceCaseTarget(r);
        const sentenceCaseButton = needsSentenceCase(sentenceTarget.value)
          ? `<button class="small" data-act="sentenceCase" data-key="${esc(rowIdentity(r))}" title="${esc(zhUI ? "仅将所选译文转换为句首字母大写；不会自动更改原文" : "Apply sentence case manually to the current translation")}">${esc(zhUI ? "句首字母大写" : "Sentence case")}</button>`
          : "";
        const existingValue = r.editedFrom === "editOriginal" && typeof r.editedText === "string" ? r.editedText : r.english;
        const proposalValue = r.editedFrom === "editProposal" && typeof r.editedText === "string" ? r.editedText : proposalText;
        const existingView = cardIcuView(existingValue, showRawIcu, previewNumber);
        const proposalView = cardIcuView(proposalValue, showRawIcu, previewNumber);
        const finalView = cardIcuView(selected, showRawIcu, previewNumber);
        const panelDirectionAttr = (sourceValue, view) => {
          if (showRawIcu && looksLikeIcuRule(sourceValue))
            return ' dir="ltr"';
          return hasRtlScript(view.text) ||
            (isRtlLanguage() && view.preview)
            ? ' dir="rtl"'
            : ' dir="ltr"';
        };
        const existingPanelDirAttr = panelDirectionAttr(
          existingValue,
          existingView,
        );
        const proposalPanelDirAttr = panelDirectionAttr(
          proposalValue,
          proposalView,
        );
        const finalPanelDirAttr = panelDirectionAttr(selected, finalView);
        const decisionText =
          s === "accepted"
            ? zhUI
              ? "已接受；将此条目标记为已审核。"
              : "Accepted; this key will be marked as reviewed."
            : s === "edited"
              ? zhUI
                ? "将导出人工编辑的译文。"
                : "Your edited translation will be exported."
              : s === "rejected"
                ? typeof r.finalEnglish === "string" &&
                  r.finalEnglish !== r.english
                  ? zhUI
                    ? "提案已拒绝；将导出经过术语表统一的原目标译文。"
                    : "Rejected proposal; the glossary-adjusted existing translation will be exported."
                  : zhUI
                    ? "提案已拒绝；保留原目标译文。"
                    : "Rejected proposal; original target translation will be retained."
                : s === "pending" && differs(r)
                  ? zhUI
                    ? "请选择接受、拒绝或编辑。"
                    : "Choose accept, reject, or edit."
                  : zhUI
                    ? "无更改提案；可接受并标记为已审核，或编辑译文。"
                    : "No translation change was proposed. Accept it as reviewed or edit the translation.";
        let actions = "";
        if (unchangedProposal) {
          if (s === "unchanged")
            actions = `<button class="small good" data-act="acceptUnchanged" data-key="${esc(rowIdentity(r))}">${tr("acceptUnchanged")}</button>`;
          else if (["accepted", "edited"].includes(s))
            actions = `<button class="small" data-act="undo" data-key="${esc(rowIdentity(r))}">${tr("undo")}</button>`;
        } else if (differs(r) && s === "pending")
          actions = `<button class="small good" data-act="accept" data-key="${esc(rowIdentity(r))}">${tr("accept")}</button><button class="small" data-act="reject" data-key="${esc(rowIdentity(r))}">${tr("rejectBtn")}</button>`;
        else if (differs(r) && ["accepted", "rejected", "edited"].includes(s))
          actions = `<button class="small" data-act="undo" data-key="${esc(rowIdentity(r))}">${tr("undo")}</button>`;
         actions += sentenceCaseButton;
         actions += `<button class="small ${r.unable_to_translate ? "bad" : ""}" data-act="toggleUntranslatable" data-key="${esc(rowIdentity(r))}">${r.unable_to_translate ? tr("flagged") : tr("unableFlag")}</button>`;
         if (needsSentenceCase(sentenceTarget.value)) {
           warning += `<div class="sentence-warning">${esc(zhUI ? "此译文不是句首字母大写格式。需要时可点击“句首字母大写”；工具不会自动修改。" : "This translation is not in sentence case. Apply it only when appropriate; the tool will not change it automatically.")}</div>`;
         }
        const reviewedClass =
          s === "accepted"
            ? " review-accepted"
            : s === "rejected"
              ? " review-rejected"
              : s === "edited"
                ? " review-edited"
                : "";
        const existingPanel = `<div class="panelwrap"${targetDirAttr}><div class="label">${esc((zhUI ? "现有 " : "EXISTING ") + targetName.toUpperCase() + " · " + (zhUI ? "原译文" : "ORIGINAL"))}</div><div class="panel edit-source"${existingPanelDirAttr} role="button" tabindex="0" title="${esc(zhUI ? "点击后从原有目标译文开始编辑" : "Click to edit starting from the original target translation")}" data-act="editOriginal" data-key="${esc(rowIdentity(r))}">${esc(existingView.text || "") || `<span class="missing">${esc(tr("emptyTarget"))}</span>`}${icuPreviewNoteHTML(existingView, previewNumber, rowIdentity(r))}</div><div class="edit-hint">${esc(tr("clickOriginal"))}</div></div>`;
        const proposalPanel = unchangedProposal
           ? ""
           : `<div class="panelwrap"${targetDirAttr}><div class="label">${esc(zhUI ? "CHATGPT 翻译提案" : "CHATGPT " + tr("proposal"))}</div><div class="panel proposal edit-source"${proposalPanelDirAttr} role="button" tabindex="0" title="${esc(zhUI ? "点击后从 ChatGPT 提案开始编辑" : "Click to edit starting from the ChatGPT proposal")}" data-act="editProposal" data-key="${esc(rowIdentity(r))}">${esc(proposalView.text)}${icuPreviewNoteHTML(proposalView, previewNumber, rowIdentity(r))}</div><div class="edit-hint">${esc(tr("clickProposal"))}</div>${warning}</div>`;
        const finalPanel = `<div class="panelwrap"${targetDirAttr}><div class="label">${esc((zhUI ? "最终" : "FINAL") + " " + targetName.toUpperCase() + " · " + tr("exportResult"))}</div><div class="panel edit-source"${finalPanelDirAttr} role="button" tabindex="0" title="${esc(zhUI ? "编辑当前最终译文" : "Edit the current final translation")}" data-act="editFinal" data-key="${esc(rowIdentity(r))}">${esc(finalView.text || "") || `<span class="missing">${esc(tr("emptyTarget"))}</span>`}${icuPreviewNoteHTML(finalView, previewNumber, rowIdentity(r))}</div><div class="finalnote" style="margin-top:6px">${esc(decisionText)}</div></div>`;
        return `<article class="item${reviewedClass}${unchangedProposal ? " item-unchanged-proposal" : ""}"><div class="itemhead"><div style="min-width:0"><div class="source-line"><div class="zh">${esc(r.chinese || tr("noSource"))}</div><button type="button" class="copy-source" data-act="copySource" data-key="${esc(rowIdentity(r))}" title="${esc(zhUI ? "复制显示的源文本" : `Copy displayed ${baseName} source text`)}">${esc(zhUI ? "复制源文" : `Copy ${baseName}`)}</button></div><div class="key" title="Tolgee key: ${esc(r.key)} · Object ID: ${esc(r.object_id ?? "—")} · ID: ${esc(r.key_id ?? "—")}">${esc(r.key)}${r.namespace ? ` · namespace: ${esc(r.namespace)}` : ""}${r.object_id ? ` · object: ${esc(r.object_id)}` : ""} · ID: ${esc(r.key_id ?? "—")}</div></div><div class="chips"><span class="chip ${esc(s)}">${esc(statusLabel)}</span>${conf}${icuChip}${tolgeePluralChip}${icuViewButton}<span class="chip">Tolgee: ${esc(r.translation_state || "unknown")}</span>${r.clarification_needed ? `<span class="chip pending" title="A human needs to clarify the meaning or context.">${esc(tr("clarificationNeeded"))}</span>` : ""}${r.unable_to_translate ? '<span class="chip bad">Unable to translate</span>' : ""}</div></div>
 <div class="cols ${unchangedProposal ? "cols-unchanged" : ""}">${existingPanel}${proposalPanel}${finalPanel}</div>
 ${r.reason ? `<div class="reason"><b>${esc(r.issue_category || (zhUI ? "审核备注" : "Reviewer note"))}:</b> ${esc(r.reason)}</div>` : ""}${screenshotHTML(r)}<details class="context"><summary>${esc(tr("context"))}</summary><div>${esc(r.context_description || "(No context description)")}

key_id: ${esc(r.key_id ?? "null")}
namespace: ${esc(r.namespace ?? "null")}
translation_state_raw: ${esc(r.translation_state_raw || "")}</div></details><div class="cardfoot"><span class="finalnote">${r.placeholderMismatch ? "Placeholder/tag mismatch flagged. " : ""}${r.clarification_needed ? "Human clarification requested. " : ""}${r.unable_to_translate ? "ChatGPT could not reliably translate this entry. " : ""}Key ${r.originalIndex + 1} of ${rows.length}</span><div class="actions">${actions}</div></div></article>`;
      }
      function rowIdentity(r) {
        if (r.object_id != null && String(r.object_id).trim() !== "")
          return "oid:" + String(r.object_id);
        if (r.key_id != null && String(r.key_id).trim() !== "")
          return "kid:" + String(r.key_id);
        return "nk:" + String(r.namespace ?? "") + "::" + String(r.key);
      }
      function findRow(identity) {
        const exact = rows.find((r) => rowIdentity(r) === identity);
        if (exact) return exact;
        // Backward compatibility for older saved UI state that stored bare keys.
        const matches = rows.filter((r) => r.key === identity);
        return matches.length === 1 ? matches[0] : null;
      }
      async function copyText(value) {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw Error("Copy failed");
      }
      function proposalReplacementPreview() {
        const find = $("replaceFind").value;
        const replacement = $("replaceWith").value;
        const scope = $("replaceScope").value;
        const icuSkippedRows = find
          ? rows.filter((row) => {
              const proposalMatch =
                hasProposal(row) && row.proposal.includes(find);
              const finalMatch =
                scope === "all" &&
                ["accepted", "edited", "rejected"].includes(statusOf(row)) &&
                finalEnglish(row).includes(find);
              return (
                (proposalMatch || finalMatch) &&
                [row.proposal, finalEnglish(row)].some(looksLikeIcuRule)
              );
            })
          : [];
        const proposalMatchingRows = find
          ? rows.filter(
              (row) =>
                hasProposal(row) &&
                row.proposal.includes(find) &&
                !looksLikeIcuRule(row.proposal),
            )
          : [];
        const finalMatchingRows =
          find && scope === "all"
            ? rows.filter(
                (row) =>
                  ["accepted", "edited", "rejected"].includes(
                    statusOf(row),
                  ) &&
                  finalEnglish(row).includes(find) &&
                  !looksLikeIcuRule(finalEnglish(row)),
              )
            : [];
        const matchingRows = [
          ...new Set([...proposalMatchingRows, ...finalMatchingRows]),
        ];
        const affectedRows =
          scope === "all"
            ? matchingRows
            : proposalMatchingRows.filter(
                (row) => statusOf(row) === "pending",
              );
        const skippedRows = proposalMatchingRows.filter(
          (row) => !affectedRows.includes(row),
        );
        const decidedRows = affectedRows.filter((row) =>
          ["accepted", "rejected", "edited"].includes(statusOf(row)),
        );
        const decidedFinalRows = affectedRows.filter((row) =>
          ["accepted", "edited", "rejected"].includes(statusOf(row)),
        );
        const affectedProposalRows = affectedRows.filter(
          (row) => hasProposal(row) && row.proposal.includes(find),
        );
        const finalAffectedRows =
          scope === "all"
            ? decidedFinalRows.filter((row) =>
                finalEnglish(row).includes(find),
              )
            : [];
        const proposalOccurrences = affectedProposalRows.reduce(
          (total, row) => total + row.proposal.split(find).length - 1,
          0,
        );
        const finalOccurrences = finalAffectedRows.reduce(
          (total, row) => total + finalEnglish(row).split(find).length - 1,
          0,
        );
        const occurrences = proposalOccurrences + finalOccurrences;
        const preview = $("replacePreview");
        const applyButton = $("applyTermReplacement");
        const zh = languageConfig.toolLanguage === "zh";
        if (!rows.length) {
          preview.className = "replace-preview warning";
          preview.textContent = zh
            ? "请先导入项目和提案。"
            : "Import a project and proposal file first.";
          applyButton.disabled = true;
        } else if (!find) {
          preview.className = "replace-preview";
          preview.textContent = zh
            ? "输入术语以预览受影响的条目。"
            : "Enter a term to preview affected entries.";
          applyButton.disabled = true;
        } else if (!matchingRows.length && icuSkippedRows.length) {
          preview.className = "replace-preview warning";
          preview.textContent = zh
            ? `有 ${icuSkippedRows.length} 个匹配的 ICU 条目受到保护。请在 ICU 编辑器中手动更改分支文本。`
            : `${icuSkippedRows.length} matching ICU entr${icuSkippedRows.length === 1 ? "y is" : "ies are"} protected. Edit branch text manually in the ICU editor.`;
          applyButton.disabled = true;
        } else if (!matchingRows.length) {
          preview.className = "replace-preview warning";
          preview.textContent = zh
            ? "当前范围内没有此精确术语。"
            : "No current proposal or eligible final translation contains this exact term.";
          applyButton.disabled = true;
        } else if (find === replacement) {
          preview.className = "replace-preview warning";
          preview.textContent = zh
            ? "查找术语与替换术语相同。"
            : "The find and replacement terms are identical.";
          applyButton.disabled = true;
        } else if (!affectedRows.length) {
          preview.className = "replace-preview warning";
          preview.textContent = zh
            ? `${matchingRows.length} 条匹配提案不在“仅待审核”范围内。请选择包含已决定条目的范围以更改它们。`
            : `${matchingRows.length} matching proposal${matchingRows.length === 1 ? " is" : "s are"} outside the pending-only scope. Select the scope that includes decided entries to change them.`;
          applyButton.disabled = true;
        } else {
          preview.className = "replace-preview ok";
          preview.textContent = zh
            ? `${affectedRows.length} 个条目将被更改：提案中 ${proposalOccurrences} 处精确匹配${finalOccurrences ? `，以及 ${finalAffectedRows.length} 条已决定的最终译文中 ${finalOccurrences} 处精确匹配` : ""}。${skippedRows.length ? ` ${skippedRows.length} 条非待审核提案因当前范围而跳过。` : ""}审核决定不会更改。`
            : `${affectedRows.length} entr${affectedRows.length === 1 ? "y" : "ies"} will change: ${proposalOccurrences} exact proposal occurrence${proposalOccurrences === 1 ? "" : "s"}${finalOccurrences ? ` and ${finalOccurrences} occurrence${finalOccurrences === 1 ? "" : "s"} in ${finalAffectedRows.length} decided final translation${finalAffectedRows.length === 1 ? "" : "s"}` : ""}.${skippedRows.length ? ` ${skippedRows.length} non-pending proposal${skippedRows.length === 1 ? " is" : "s are"} skipped by the current scope.` : ""}${icuSkippedRows.length ? ` ${icuSkippedRows.length} ICU entr${icuSkippedRows.length === 1 ? "y is" : "ies are"} protected and must be edited manually.` : ""} Review decisions will not change.`;
          applyButton.disabled = false;
        }
        return {
          find,
          replacement,
          scope,
          matchingRows,
          affectedRows,
          skippedRows,
          decidedRows,
          decidedFinalRows,
          affectedProposalRows,
          finalAffectedRows,
          proposalOccurrences,
          finalOccurrences,
          occurrences,
          icuSkippedRows,
        };
      }
      function renderReplacementGlossary() {
        const targetLanguage = currentGlossaryLanguage();
        const entries = replacementGlossary.filter(
          (entry) => entry.target_language === targetLanguage,
        );
        const list = $("glossaryList");
        if (!list) return;
        list.innerHTML = entries.length
          ? entries
              .map(
                (entry) =>
                  `<div class="glossary-entry"><span class="glossary-term" dir="auto">${esc(entry.source_term)}</span><span aria-hidden="true">→</span><span class="glossary-term" dir="auto">${esc(entry.replacement_term)}</span><span class="glossary-meta">${languageConfig.toolLanguage === "zh" ? `已应用 ${entry.application_count} 次 · 共更改 ${entry.total_occurrences_changed} 处` : `Applied ${entry.application_count} time${entry.application_count === 1 ? "" : "s"} · ${entry.total_occurrences_changed} recorded occurrence${entry.total_occurrences_changed === 1 ? "" : "s"} changed`}</span></div>`,
              )
              .join("")
          : `<div class="glossary-empty">${languageConfig.toolLanguage === "zh" ? "当前目标语言尚无已保存规则。" : "No saved rules for the current target language."}</div>`;
        const downloadButton = $("downloadGlossaryJson");
        if (downloadButton)
          downloadButton.disabled = replacementGlossary.length === 0;
      }
      function exportReplacementGlossary() {
        const rules = normalizeReplacementGlossary(replacementGlossary);
        if (!rules.length) {
          notify(
            languageConfig.toolLanguage === "zh"
              ? "还没有可下载的术语规则。"
              : "There are no saved glossary rules to download.",
          );
          return;
        }
        const languages = [...
          new Set(rules.map((entry) => entry.target_language)),
        ].sort();
        const payload = {
          schema_version: 1,
          glossary_type: "target_term_replacement_rules",
          exported_at: new Date().toISOString(),
          current_target_language: currentGlossaryLanguage(),
          language_count: languages.length,
          rule_count: rules.length,
          languages,
          rules,
        };
        download(
          "ulearning_translation_replacement_glossary.json",
          JSON.stringify(payload, null, 2),
        );
        notify(
          languageConfig.toolLanguage === "zh"
            ? `已下载 ${rules.length} 条术语规则（${languages.length} 种目标语言）。`
            : `Glossary JSON downloaded with ${rules.length} rule${rules.length === 1 ? "" : "s"} across ${languages.length} target language${languages.length === 1 ? "" : "s"}.`,
          6000,
        );
      }
      function openTermReplacement() {
        $("replaceFind").value = "";
        $("replaceWith").value = "";
        $("replaceScope").value = "pending";
        applyToolLanguage();
        proposalReplacementPreview();
        renderReplacementGlossary();
        $("replaceTermsModal").classList.add("open");
        requestAnimationFrame(() => $("replaceFind").focus());
      }
      function applyTermReplacement() {
        const preview = proposalReplacementPreview();
        if (
          !preview.find ||
          !preview.affectedRows.length ||
          preview.find === preview.replacement
        )
          return;
        const zh = languageConfig.toolLanguage === "zh";
        const message = zh
          ? `替换 ${preview.affectedRows.length} 个条目中的精确匹配？这将更改提案中的 ${preview.proposalOccurrences} 处${preview.finalOccurrences ? `，以及已决定的最终译文中的 ${preview.finalOccurrences} 处` : ""}。${preview.decidedRows.length ? `其中包含 ${preview.decidedRows.length} 个已决定条目。` : ""}所有审核决定不会更改。`
          : `Replace exact matches across ${preview.affectedRows.length} entr${preview.affectedRows.length === 1 ? "y" : "ies"}? This will change ${preview.proposalOccurrences} proposal occurrence${preview.proposalOccurrences === 1 ? "" : "s"}${preview.finalOccurrences ? ` and ${preview.finalOccurrences} decided final occurrence${preview.finalOccurrences === 1 ? "" : "s"}` : ""}.${preview.decidedRows.length ? ` This includes ${preview.decidedRows.length} decided entr${preview.decidedRows.length === 1 ? "y" : "ies"}.` : ""} All review decisions will remain unchanged.`;
        if (!confirm(message)) return;
        preview.affectedRows.forEach((row) => {
          if (
            preview.scope === "all" &&
            ["accepted", "edited", "rejected"].includes(statusOf(row))
          ) {
            row.finalEnglish = finalEnglish(row)
              .split(preview.find)
              .join(preview.replacement);
          }
          if (hasProposal(row))
            row.proposal = row.proposal
              .split(preview.find)
              .join(preview.replacement);
          checkPlaceholders(row);
        });
        recordReplacementRule(
          preview.find,
          preview.replacement,
          preview.occurrences,
          preview.affectedRows.length,
        );
        $("replaceTermsModal").classList.remove("open");
        render();
        persist();
        notify(
          zh
            ? `已更改 ${preview.affectedRows.length} 个条目中的 ${preview.occurrences} 处，并保存术语规则。`
            : `${preview.occurrences} occurrence${preview.occurrences === 1 ? "" : "s"} replaced across ${preview.affectedRows.length} entr${preview.affectedRows.length === 1 ? "y" : "ies"}; glossary rule saved.`,
        );
      }
      function clearUnableFlag(r) {
        r.unable_to_translate = false;
        r.attentionAt = null;
      }
      function decisionSnapshot(r) {
        return {
          decision: r.decision,
          decisionAt: r.decisionAt,
          finalEnglish: r.finalEnglish,
          pluralModeRequest: r.pluralModeRequest,
          translation_state: r.translation_state,
          translation_state_raw: r.translation_state_raw,
          unable_to_translate: r.unable_to_translate,
          attentionAt: r.attentionAt,
          proposal: r.proposal,
          editedFrom: r.editedFrom,
          editedText: r.editedText,
          doubleChecked: r.doubleChecked === true,
          doubleCheckEdited: r.doubleCheckEdited === true,
          doubleCheckEditedAt: r.doubleCheckEditedAt,
        };
      }
      function restoreDecisionSnapshot(r, snapshot) {
        Object.assign(r, snapshot);
        render();
        persist();
      }
      function sentenceCaseTarget(r) {
        const status = statusOf(r);
        if (["accepted", "edited", "rejected"].includes(status) && typeof r.finalEnglish === "string")
          return { field: "finalEnglish", value: r.finalEnglish };
        if (hasProposal(r)) return { field: "proposal", value: r.proposal };
        return { field: "finalEnglish", value: r.english };
      }
      function applySentenceCase(r) {
        const target = sentenceCaseTarget(r);
        const next = sentenceCaseCandidate(target.value);
        if (!next || next === target.value) return false;
        if (target.field === "proposal") {
          r.proposal = next;
          if (r.decision === "unchanged") r.decision = "pending";
          r.decisionAt = null;
          checkPlaceholders(r);
        } else {
          r.finalEnglish = next;
          r.decision = "edited";
          r.decisionAt = new Date().toISOString();
          clearUnableFlag(r);
          markReviewed(r);
        }
        return true;
      }
      function act(key, action) {
        const r = findRow(key);
        if (!r) return;
        if (action === "toggleIcuView") {
          if (icuRawVisible.has(key)) icuRawVisible.delete(key);
          else icuRawVisible.add(key);
          render();
          return;
        }
        if (action === "doubleCheckToggle") {
          r.doubleChecked = !r.doubleChecked;
          notify(
            r.doubleChecked
              ? (languageConfig.toolLanguage === "zh" ? "已标记为复核完成。" : "Marked as checked.")
              : (languageConfig.toolLanguage === "zh" ? "已返回待复核。" : "Returned to the to-be-checked list."),
          );
          render();
          persist();
          return;
        }
        if (action === "sentenceCase") {
          const before = decisionSnapshot(r);
          if (!applySentenceCase(r)) return;
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已应用句首字母大写；原文未自动更改。"
              : "Sentence case applied manually; the original text was not changed.",
            3000,
            async () => {
              restoreDecisionSnapshot(r, before);
              notify(languageConfig.toolLanguage === "zh" ? "已撤销句首字母大写。" : "Sentence-case change undone.");
            },
          );
          render();
          persist();
          return;
        }
        if (action === "copySource") {
          copyText(r.chinese || "").then(
            () =>
              notify(
                languageConfig.toolLanguage === "zh"
                  ? "已复制源文本。"
                  : `${languageLabel(languageConfig.baseCode)} source text copied.`,
              ),
            () =>
              notify(
                languageConfig.toolLanguage === "zh"
                  ? "无法复制源文本。"
                  : "Could not copy the source text.",
              ),
          );
          return;
        }
        if (action === "toggleUntranslatable") {
          r.unable_to_translate = !r.unable_to_translate;
          r.attentionAt = r.unable_to_translate
            ? new Date().toISOString()
            : null;
          notify(
            r.unable_to_translate
              ? "Flagged as unable to translate."
              : "Unable-to-translate flag removed.",
          );
          render();
          persist();
          return;
        } else if (action === "acceptUnchanged") {
          if (!isUnchangedProposal(r)) return;
          const before = decisionSnapshot(r);
          clearUnableFlag(r);
          r.decision = "accepted";
          r.decisionAt = new Date().toISOString();
          r.finalEnglish = undefined;
          r.pluralModeRequest = null;
          markReviewed(r);
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已接受原有译文，并移至“已检查的未更改提案”。"
              : "Existing translation accepted and moved to Checked unchanged proposals.",
            3000,
            async () => {
              restoreDecisionSnapshot(r, before);
              notify(languageConfig.toolLanguage === "zh" ? "已撤销接受。" : "Acceptance undone.");
            },
          );
        } else if (action === "accept") {
          const icuCheck = validateIcuTranslation(r, r.proposal);
          if (icuCheck.isIcu && !icuCheck.valid) {
            notify(`Cannot accept this ICU proposal: ${icuCheck.error}`, 7000);
            return;
          }
          const before = decisionSnapshot(r);
          clearUnableFlag(r);
          r.decision = "accepted";
          r.decisionAt = new Date().toISOString();
          r.finalEnglish = r.proposal;
          r.pluralModeRequest = null;
          markReviewed(r);
          checkPlaceholders(r);
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已接受提案，并移至“已接受 / 已编辑”。"
              : "Proposal accepted and moved to Accepted / edited.",
            3000,
            async () => {
              restoreDecisionSnapshot(r, before);
              notify(languageConfig.toolLanguage === "zh" ? "已撤销接受。" : "Acceptance undone.");
            },
          );
        } else if (action === "reject") {
          const before = decisionSnapshot(r);
          clearUnableFlag(r);
          r.decision = "rejected";
          r.decisionAt = new Date().toISOString();
          r.finalEnglish = undefined;
          r.pluralModeRequest = null;
          markReviewed(r);
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已拒绝提案，并移至“已拒绝”。"
              : "Proposal rejected and moved to Rejected.",
            3000,
            async () => {
              restoreDecisionSnapshot(r, before);
              notify(languageConfig.toolLanguage === "zh" ? "已撤销拒绝。" : "Rejection undone.");
            },
          );
        } else if (action === "undo") {
          r.decision = differs(r) ? "pending" : "unchanged";
          r.decisionAt = null;
          r.finalEnglish = undefined;
          r.pluralModeRequest = null;
          restoreOriginalTranslationState(r);
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已撤销决定，条目已返回待审核列表。"
              : "Decision undone; the entry returned to the pending queue.",
          );
        } else if (
          ["edit", "editFinal", "editProposal", "editOriginal", "doubleCheckEdit"].includes(
            action,
          )
        ) {
          activeEditKey = key;
          activeEditSource = action;
          activePluralModeDraft =
            r._originalIsPlural === true ||
            normalizedPluralModeRequest(r.pluralModeRequest) != null;
          $("editMeta").textContent =
            `${languageConfig.toolLanguage === "zh" ? "键名" : "Key"}: ${r.key} · ${languageLabel(languageConfig.baseCode)}: ${r.chinese}`;
          let seed =
            action === "editFinal" || action === "doubleCheckEdit"
              ? finalEnglish(r)
              : action === "editProposal"
              ? hasProposal(r)
                ? r.proposal
                : r.english
              : action === "editOriginal"
                ? r.english
                : r.decision === "edited"
                  ? (r.finalEnglish ?? r.proposal ?? r.english)
                  : r.decision === "accepted"
                    ? r.proposal
                    : r.english;
          $("editText").value = seed;
          activeIcuToolsExpanded = looksLikeIcuRule(seed);
          updateIcuToolsVisibility();
          let sourceAnalysis = { arguments: {} };
          try {
            sourceAnalysis = ICU.analyze(
              String(r.chinese ?? ""),
              icuLocale("base"),
            );
          } catch {}
          let targetAnalysis = { arguments: {}, rules: [] };
          try {
            targetAnalysis = ICU.analyze(String(seed ?? ""), icuLocale("target"));
          } catch {}
          const sourceVariables = Object.keys(sourceAnalysis.arguments || {});
          const managedVariables = new Set(
            (targetAnalysis.rules || []).map((rule) => rule.variable),
          );
          const previewVariables = [
            ...new Set([
              ...sourceVariables,
              ...Object.keys(targetAnalysis.arguments || {}),
            ]),
          ];
          const suggestedVariable =
            sourceVariables.find((name) => !managedVariables.has(name)) ||
            sourceVariables[0] ||
            previewVariables[0] ||
            "count";
          $("icuVariableName").value = suggestedVariable;
          $("icuTestValues").value = JSON.stringify(
            Object.fromEntries(
              (previewVariables.length
                ? previewVariables
                : [suggestedVariable]
              ).map((name) => [name, 1]),
            ),
          );
          $("icuPreviewOutput").classList.add("hidden");
          $("icuPreviewOutput").textContent = "";
          applyIcuEditorDirection();
          showPlaceholderWarning(r, $("editText").value);
          renderIcuBranchEditor(r, $("editText").value);
          $("editModal").classList.add("open");
          return;
        }
        page = Math.max(1, page);
        render();
        persist();
      }
      function showPlaceholderWarning(r, value) {
        const icuCheck = validateIcuTranslation(r, value);
        const badge = $("icuStatusBadge");
        const result = $("icuValidationResult");
        badge.className = `icu-badge${icuCheck.isIcu ? icuCheck.valid ? " valid" : " invalid" : ""}`;
        badge.textContent = icuCheck.isIcu
          ? icuCheck.valid
            ? "Valid ICU"
            : "Invalid ICU"
          : "Simple text";
        result.className = `icu-result${icuCheck.isIcu ? icuCheck.valid ? " valid" : " invalid" : ""}`;
        result.textContent = icuCheck.isIcu
          ? icuCheck.valid
            ? `Valid ICU message. ${icuCheck.analysis.rules.length} rule${icuCheck.analysis.rules.length === 1 ? "" : "s"}: ${icuCheck.analysis.rules.map((rule) => `${rule.variable} (${rule.type})`).join(", ")}.`
            : `ICU error: ${icuCheck.error}`
          : "This translation does not contain an ICU rule.";
        $("saveEdit").disabled = icuCheck.isIcu && !icuCheck.valid;
        refreshTolgeePluralControl(r, value);
        if (icuCheck.isIcu) {
          $("placeholderWarning").innerHTML = "";
          return icuCheck;
        }
        const before = placeholders(r.english),
          after = placeholders(value);
        $("placeholderWarning").innerHTML = sameArray(before, after)
          ? ""
          : `<div class="placeholder-warning">⚠ Placeholder/tag difference from original English. Original: ${esc(before.join(" · ") || "(none)")}; edited: ${esc(after.join(" · ") || "(none)")}. Save only if intentional.</div>`;
        return icuCheck;
      }
      function updateIcuToolsVisibility() {
        const panel = $("icuToolsPanel");
        const trigger = $("toggleIcuTools");
        if (!panel || !trigger) return;
        const expanded = !!activeIcuToolsExpanded;
        panel.classList.toggle("hidden", !expanded);
        trigger.setAttribute("aria-expanded", String(expanded));
        trigger.textContent = expanded
          ? languageConfig.toolLanguage === "zh"
            ? "隐藏 ICU"
            : "Hide ICU"
          : languageConfig.toolLanguage === "zh"
            ? "添加 ICU"
            : "Add ICU";
      }
      function refreshTolgeePluralControl(r, value) {
        const setting = $("tolgeePluralSetting");
        const checkbox = $("enableTolgeePluralForms");
        const help = $("tolgeePluralSettingHelp");
        if (!setting || !checkbox || !help) return;
        const zh = languageConfig.toolLanguage === "zh";
        const originalEnabled = r?._originalIsPlural === true;
        const eligibility = tolgeePluralEligibility(value);
        activePluralModeDraft = eligibility.eligible;
        checkbox.checked = activePluralModeDraft;
        checkbox.disabled = true;
        setting.classList.add("disabled");
        if (!eligibility.eligible) {
          help.textContent = zh
            ? originalEnabled
              ? "当前内容没有恰好一条有效复数规则，因此自动指示器已关闭。Tolgee 中原有的设置不会由本工具自动移除。"
              : "没有复数规则或存在多条复数规则，因此此设置自动关闭。"
            : originalEnabled
              ? "The current text does not have exactly one valid plural rule, so the automatic indicator is off. This tool will not remove an existing Tolgee setting."
              : "This is automatically off when there is no plural rule or more than one plural rule.";
          return;
        }
        help.textContent = originalEnabled
          ? zh
            ? `检测到一条有效复数规则（变量“${eligibility.variable}”）；Tolgee 已启用此设置。`
            : `Exactly one valid plural rule was detected for “${eligibility.variable}”; Tolgee already has this setting enabled.`
          : zh
            ? `检测到一条有效复数规则（变量“${eligibility.variable}”）；审核报告将自动请求启用 Tolgee 设置。`
            : `Exactly one valid plural rule was detected for “${eligibility.variable}”; the review report will automatically request the Tolgee setting.`;
      }
      let icuBranchModel = null;
      function simpleIcuBranchText(elements) {
        let output = "";
        for (const element of elements || []) {
          if (element.type === 0) output += element.value;
          else if (element.type === 1) output += `{${element.value}}`;
          else if (element.type === 7) output += "#";
          else return null;
        }
        return stripBidiControls(output);
      }
      function renderIcuBranchEditor(r, value) {
        const editor = $("icuBranchEditor");
        const check = validateIcuTranslation(r, value);
        const ast = check.analysis?.ast;
        const ruleModels = [];
        if (check.isIcu && check.valid && Array.isArray(ast)) {
          ast.forEach((element, elementIndex) => {
            if (element?.type !== 6) return;
            const branches = Object.entries(element.options || {}).map(
              ([selector, option]) => ({
                selector,
                text: simpleIcuBranchText(option.value),
              }),
            );
            if (branches.every((branch) => branch.text != null))
              ruleModels.push({
                elementIndex,
                variable: element.value,
                type:
                  element.pluralType === "ordinal"
                    ? "selectordinal"
                    : "plural",
                selectors: branches.map((branch) => branch.selector),
                branches,
              });
          });
        }
        const serializable =
          Array.isArray(ast) &&
          ast.every((element) => serializeIcuElement(element) != null);
        if (!ruleModels.length || !serializable) {
          editor.classList.add("hidden");
          editor.innerHTML = "";
          icuBranchModel = null;
          return;
        }
        icuBranchModel = {
          ast,
          rules: ruleModels,
        };
        const zh = languageConfig.toolLanguage === "zh";
        const branchDir = isRtlLanguage() ? "rtl" : "ltr";
        editor.innerHTML = `<h4>${esc(zh ? "分别填写每个变量的复数分支" : "Edit plural branches for each variable")}</h4>${ruleModels
          .map(
            (model, ruleIndex) =>
              `<section class="icu-rule-section" data-icu-rule-section="${ruleIndex}"><div class="icu-rule-heading"><span>${esc(model.variable)}</span><span class="icu-rule-kind">${esc(model.type === "selectordinal" ? "Ordinal plural" : "Cardinal plural")}</span></div><div class="icu-branch-grid">${model.branches
                .map((branch) => {
                  const mixedBranch =
                    branchDir === "rtl" &&
                    /[A-Za-z0-9]/.test(branch.text || "");
                  const fieldDir = mixedBranch ? "ltr" : branchDir;
                  return `<label dir="${fieldDir}">${esc(branch.selector)}<textarea data-icu-rule-index="${ruleIndex}" data-icu-branch="${esc(branch.selector)}" dir="${fieldDir}">${esc(branch.text)}</textarea></label>`;
                })
                .join("")}</div></section>`,
          )
          .join("")}`;
        editor.classList.remove("hidden");
      }
      function applyIcuEditorDirection() {
        const rtl = isRtlLanguage();
        const mixedIcu = rtl && looksLikeIcuRule($("editText").value);
        const direction = mixedIcu ? "ltr" : rtl ? "rtl" : "ltr";
        $("editText").dir = direction;
        $("editText").style.direction = direction;
        $("icuTestValues").dir = "ltr";
        $("icuTestValues").style.direction = "ltr";
        $("icuPreviewOutput").dir = rtl ? "rtl" : "ltr";
        $("icuPreviewOutput").classList.toggle("rtl", rtl);
      }
      $("icuBranchEditor").addEventListener("input", (event) => {
        if (!event.target.matches("[data-icu-branch]") || !icuBranchModel)
          return;
        if (isRtlLanguage()) {
          const mixedBranch = /[A-Za-z0-9]/.test(event.target.value || "");
          const fieldDirection = mixedBranch ? "ltr" : "rtl";
          event.target.dir = fieldDirection;
          if (event.target.parentElement) event.target.parentElement.dir = fieldDirection;
        }
        const branchText = Object.fromEntries(
          [...$("icuBranchEditor").querySelectorAll("[data-icu-branch]")].map(
            (field) => [
              `${field.dataset.icuRuleIndex}\u0000${field.dataset.icuBranch}`,
              field.value,
            ],
          ),
        );
        const rulesByElement = new Map(
          icuBranchModel.rules.map((model, ruleIndex) => [
            model.elementIndex,
            { model, ruleIndex },
          ]),
        );
        const rebuilt = icuBranchModel.ast.map((element, elementIndex) => {
          const managed = rulesByElement.get(elementIndex);
          if (!managed) return serializeIcuElement(element);
          const { model, ruleIndex } = managed;
          return `{${model.variable}, ${model.type}, ${model.selectors
            .map(
              (selector) =>
                `${selector} {${branchText[`${ruleIndex}\u0000${selector}`] ?? ""}}`,
            )
            .join(" ")}}`;
        });
        if (rebuilt.some((part) => part == null)) return;
        $("editText").value = rebuilt.join("");
        const r = findRow(activeEditKey);
        if (r) showPlaceholderWarning(r, $("editText").value);
      });
      $("editText").addEventListener("input", () => {
        const r = findRow(activeEditKey);
        if (r) {
          showPlaceholderWarning(r, $("editText").value);
          renderIcuBranchEditor(r, $("editText").value);
          applyIcuEditorDirection();
        }
      });
      $("editFromProposal").onclick = () => {
        const r = findRow(activeEditKey);
        if (!r) return;
        $("editText").value = hasProposal(r) ? r.proposal : r.english;
        if (looksLikeIcuRule($("editText").value))
          activeIcuToolsExpanded = true;
        updateIcuToolsVisibility();
        showPlaceholderWarning(r, $("editText").value);
        renderIcuBranchEditor(r, $("editText").value);
        applyIcuEditorDirection();
      };
      $("editFromOriginal").onclick = () => {
        const r = findRow(activeEditKey);
        if (!r) return;
        $("editText").value = r.english;
        if (looksLikeIcuRule($("editText").value))
          activeIcuToolsExpanded = true;
        updateIcuToolsVisibility();
        showPlaceholderWarning(r, $("editText").value);
        renderIcuBranchEditor(r, $("editText").value);
        applyIcuEditorDirection();
      };
      function splitIcuConnector(value) {
        const text = String(value ?? "");
        const match = text.match(
          /^(.*?)(\s+(?:and|or|with|et|y|e|und)\s+|\s+و\s*|\s*&\s*|[和与及])$/i,
        );
        return match
          ? { phrase: match[1], connector: match[2] }
          : { phrase: text, connector: "" };
      }
      function addTopLevelIcuRule(value, variable, ruleType) {
        const analysis = ICU.analyze(String(value ?? ""), icuLocale("target"));
        if (
          (analysis.rules || []).some(
            (rule) => rule.variable === variable && rule.type === ruleType,
          )
        )
          return { value: String(value ?? ""), alreadyManaged: true };
        const ast = analysis.ast || [];
        const argumentIndex = ast.findIndex(
          (element) => element?.type === 1 && element.value === variable,
        );
        if (argumentIndex < 0) {
          if (Object.prototype.hasOwnProperty.call(analysis.arguments, variable))
            throw Error(
              `{${variable}} is inside another ICU branch. Start from the original translation, then add each quantity variable as a separate rule.`,
            );
          throw Error(
            `The target translation does not contain {${variable}}. Add that placeholder before creating its ICU rule.`,
          );
        }
        let segmentEnd = argumentIndex + 1;
        let connector = "";
        const followingLiteral = ast[segmentEnd]?.type === 0
          ? ast[segmentEnd]
          : null;
        if (followingLiteral) {
          const hasFollowingExpression = segmentEnd + 1 < ast.length;
          const split = hasFollowingExpression
            ? splitIcuConnector(followingLiteral.value)
            : { phrase: followingLiteral.value, connector: "" };
          ast[segmentEnd] = { ...followingLiteral, value: split.phrase };
          connector = split.connector;
          segmentEnd += 1;
        }
        const segment = serializeIcuElements(
          ast.slice(argumentIndex, segmentEnd),
        );
        const before = serializeIcuElements(ast.slice(0, argumentIndex));
        const after = serializeIcuElements(ast.slice(segmentEnd));
        if (segment == null || before == null || after == null)
          throw Error(
            "This message contains ICU syntax that the visual rule builder cannot safely rewrite. Edit the raw ICU message instead.",
          );
        const ordinal = ruleType === "selectordinal";
        const selectors = ICU.pluralCategories(
          icuLocale("target"),
          ordinal ? "ordinal" : "cardinal",
        );
        const rule = `{${variable}, ${ruleType}, ${selectors
          .map((selector) => `${selector} {${segment}}`)
          .join(" ")}}`;
        return {
          value: `${before}${rule}${serializeIcuLiteral(connector)}${after}`,
          alreadyManaged: false,
        };
      }
      $("toggleIcuTools").onclick = () => {
        activeIcuToolsExpanded = !activeIcuToolsExpanded;
        updateIcuToolsVisibility();
      };
      $("createIcuRule").onclick = () => {
        const r = findRow(activeEditKey);
        if (!r) return;
        if (tolgee?.project?.icu_placeholders_enabled === false) {
          notify(
            "ICU creation is blocked because this Tolgee project has ICU placeholders disabled. Ask a project administrator to enable them first.",
            8000,
          );
          return;
        }
        const current = $("editText").value;
        const variable = $("icuVariableName").value.trim();
        try {
          const source = ICU.analyze(
            String(r.chinese ?? ""),
            icuLocale("base"),
          );
          if (!Object.prototype.hasOwnProperty.call(source.arguments, variable))
            throw Error(
              `The source text does not contain {${variable}}. Use a variable already supplied by the application.`,
            );
          const ruleType = $("icuRuleType").value;
          const added = addTopLevelIcuRule(
            current,
            variable,
            ruleType,
          );
          $("editText").value = added.value;
          let previewValues = {};
          try {
            previewValues = JSON.parse($("icuTestValues").value || "{}");
          } catch {}
          const combinedAnalysis = ICU.analyze(
            $("editText").value,
            icuLocale("target"),
          );
          Object.keys(combinedAnalysis.arguments || {}).forEach((name) => {
            if (!Object.prototype.hasOwnProperty.call(previewValues, name))
              previewValues[name] = 1;
          });
          $("icuTestValues").value = JSON.stringify(previewValues);
          showPlaceholderWarning(r, $("editText").value);
          renderIcuBranchEditor(r, $("editText").value);
          applyIcuEditorDirection();
          const managedVariables = new Set(
            (combinedAnalysis.rules || []).map((rule) => rule.variable),
          );
          const nextVariable = Object.keys(source.arguments || {}).find(
            (name) => !managedVariables.has(name),
          );
          if (nextVariable) $("icuVariableName").value = nextVariable;
          notify(
            added.alreadyManaged
              ? `${variable} already has an ICU rule. Its branch editor is shown below.`
              : nextVariable
                ? `ICU rule for ${variable} added. Add ${nextVariable} next, or edit the branches below.`
                : tolgee?.project?.icu_placeholders_enabled == null
                  ? "ICU rule added. Confirm Tolgee ICU placeholders are enabled before pushing."
                  : "ICU rule added. Edit each branch, preview the combined message, then save.",
            6500,
          );
        } catch (error) {
          const result = $("icuValidationResult");
          result.className = "icu-result invalid";
          result.textContent = `Could not create ICU: ${error.message || error}`;
          notify(`Could not create ICU: ${error.message || error}`, 6500);
        }
      };
      $("validateIcuRule").onclick = () => {
        const r = findRow(activeEditKey);
        if (r) {
          showPlaceholderWarning(r, $("editText").value);
          renderIcuBranchEditor(r, $("editText").value);
        }
      };
      $("previewIcuRule").onclick = () => {
        const r = findRow(activeEditKey);
        if (!r) return;
        const check = showPlaceholderWarning(r, $("editText").value);
        const output = $("icuPreviewOutput");
        output.classList.remove("hidden");
        if (!check.isIcu || !check.valid) {
          output.textContent = check.isIcu
            ? "Fix the ICU error before previewing."
            : "Create an ICU rule before previewing.";
          return;
        }
        try {
          const values = JSON.parse($("icuTestValues").value || "{}");
          output.textContent = ICU.format(
            protectRtlIcuBidi($("editText").value),
            icuLocale("target"),
            values,
          );
          applyIcuEditorDirection();
        } catch (error) {
          output.textContent = `Preview error: ${error.message || error}`;
        }
      };
      $("saveEdit").onclick = () => {
        const r = findRow(activeEditKey);
        if (!r) return;
        const before = decisionSnapshot(r);
        const icuCheck = showPlaceholderWarning(r, $("editText").value);
        if (icuCheck.isIcu && !icuCheck.valid) {
          notify(`Fix the ICU error before saving: ${icuCheck.error}`, 7000);
          return;
        }
        const pluralEligibility = tolgeePluralEligibility($("editText").value);
        if (
          r._originalIsPlural !== true &&
          activePluralModeDraft &&
          !pluralEligibility.eligible
        ) {
          notify(
            "Tolgee Use plural forms can only be requested for exactly one valid plural rule.",
            7000,
          );
          return;
        }
        r.pluralModeRequest =
          r._originalIsPlural !== true && activePluralModeDraft
            ? {
                action: "enable",
                plural_arg_name: pluralEligibility.variable,
                rule_type: pluralEligibility.type,
              }
            : null;
        const editedValue = $("editText").value;
        if (activeEditSource === "doubleCheckEdit") {
          // A double-check edit changes the final translation without rewriting
          // the original review decision or labeling it as a human edit.
          r.finalEnglish = editedValue;
          r.doubleChecked = true;
          r.doubleCheckEdited = true;
          r.doubleCheckEditedAt = new Date().toISOString();
          clearUnableFlag(r);
          markReviewed(r);
        } else {
          if (activeEditSource === "editProposal" && isUnchangedProposal(r))
            r.proposal = editedValue;
          r.editedFrom = activeEditSource;
          r.editedText = editedValue;
          r.finalEnglish = editedValue;
          clearUnableFlag(r);
          r.decision = "edited";
          r.decisionAt = new Date().toISOString();
          markReviewed(r);
        }
        $("editModal").classList.remove("open");
        render();
        persist();
        notify(
          languageConfig.toolLanguage === "zh"
            ? "已保存人工编辑。"
            : "Human edit saved.",
          3000,
          async () => {
            restoreDecisionSnapshot(r, before);
            notify(languageConfig.toolLanguage === "zh" ? "已撤销人工编辑。" : "Human edit undone.");
          },
        );
      };
      ["closeEdit", "cancelEdit"].forEach(
        (id) =>
          ($(id).onclick = () => {
            $("editModal").classList.remove("open");
            activeIcuToolsExpanded = false;
            updateIcuToolsVisibility();
          }),
      );
      ["closeScreenshot", "closeScreenshotBottom"].forEach((id) =>
        $(id).addEventListener("click", closeScreenshot),
      );
      $("previousScreenshot").addEventListener("click", () =>
        navigateScreenshot(-1),
      );
      $("nextScreenshot").addEventListener("click", () =>
        navigateScreenshot(1),
      );
      $("screenshotModal").addEventListener("click", (e) => {
        if (e.target.id === "screenshotModal") closeScreenshot();
      });
      document.addEventListener("keydown", (e) => {
        if (!$("screenshotModal").classList.contains("open")) return;
        if (e.key === "Escape") closeScreenshot();
        if (e.key === "ArrowLeft") navigateScreenshot(-1);
        if (e.key === "ArrowRight") navigateScreenshot(1);
      });
      $("list").addEventListener("click", (e) => {
        if (doubleCheckMode) {
          const card = e.target.closest(".double-check-card");
          const finalPanel = e.target.closest(".double-check-card .cols .panelwrap:nth-child(2) .panel");
          if (card && finalPanel) {
            act(card.dataset.doubleCheckKey, "doubleCheckEdit");
            return;
          }
        }
        let b = e.target.closest("[data-act]");
        if (!b) return;
        if (b.dataset.act === "showScreenshot") {
          showScreenshot(b.dataset.key, b.dataset.shotIndex);
          return;
        }
        act(b.dataset.key, b.dataset.act);
      });
      $("list").addEventListener("change", (e) => {
        if (!e.target.matches("[data-icu-preview-input]")) return;
        const next = Number(e.target.value);
        if (!Number.isFinite(next) || next < 0) return;
        const previewNumber = Math.floor(next);
        const previewKey = e.target.dataset.icuPreviewKey;
        if (previewKey) icuPreviewNumbers.set(previewKey, previewNumber);
        else icuPreviewNumber = previewNumber;
        render();
      });
      $("list").addEventListener("keydown", (e) => {
        if (
          doubleCheckMode &&
          (e.key === "Enter" || e.key === " ") &&
          e.target.matches(".double-check-card .cols .panelwrap:nth-child(2) .panel")
        ) {
          e.preventDefault();
          const card = e.target.closest(".double-check-card");
          if (card) act(card.dataset.doubleCheckKey, "doubleCheckEdit");
          return;
        }
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target.matches(".edit-source[data-act]")
        ) {
          e.preventDefault();
          act(e.target.dataset.key, e.target.dataset.act);
        }
      });
      function download(filename, content, mime = "application/json") {
        downloadBlob(filename, new Blob([content], { type: mime }));
      }
      function downloadBlob(filename, blob) {
        let url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      const ZIP_CRC32_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let value = n;
          for (let bit = 0; bit < 8; bit++)
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
          table[n] = value >>> 0;
        }
        return table;
      })();
      function zipCrc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes)
          crc = ZIP_CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
      }
      function zipDateTime(date = new Date()) {
        const year = Math.max(1980, date.getFullYear());
        return {
          time:
            (date.getHours() << 11) |
            (date.getMinutes() << 5) |
            Math.floor(date.getSeconds() / 2),
          date:
            ((year - 1980) << 9) |
            ((date.getMonth() + 1) << 5) |
            date.getDate(),
        };
      }
      function buildStoredZip(files) {
        const encoder = new TextEncoder();
        const stamp = zipDateTime();
        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        let centralSize = 0;
        files.forEach(({ name, content }) => {
          const nameBytes = encoder.encode(name);
          const data = encoder.encode(content);
          const crc = zipCrc32(data);
          const localHeader = new Uint8Array(30);
          const localView = new DataView(localHeader.buffer);
          localView.setUint32(0, 0x04034b50, true);
          localView.setUint16(4, 20, true);
          localView.setUint16(6, 0x0800, true);
          localView.setUint16(8, 0, true);
          localView.setUint16(10, stamp.time, true);
          localView.setUint16(12, stamp.date, true);
          localView.setUint32(14, crc, true);
          localView.setUint32(18, data.length, true);
          localView.setUint32(22, data.length, true);
          localView.setUint16(26, nameBytes.length, true);
          localView.setUint16(28, 0, true);
          localParts.push(localHeader, nameBytes, data);

          const centralHeader = new Uint8Array(46);
          const centralView = new DataView(centralHeader.buffer);
          centralView.setUint32(0, 0x02014b50, true);
          centralView.setUint16(4, 20, true);
          centralView.setUint16(6, 20, true);
          centralView.setUint16(8, 0x0800, true);
          centralView.setUint16(10, 0, true);
          centralView.setUint16(12, stamp.time, true);
          centralView.setUint16(14, stamp.date, true);
          centralView.setUint32(16, crc, true);
          centralView.setUint32(20, data.length, true);
          centralView.setUint32(24, data.length, true);
          centralView.setUint16(28, nameBytes.length, true);
          centralView.setUint16(30, 0, true);
          centralView.setUint16(32, 0, true);
          centralView.setUint16(34, 0, true);
          centralView.setUint16(36, 0, true);
          centralView.setUint32(38, 0, true);
          centralView.setUint32(42, localOffset, true);
          centralParts.push(centralHeader, nameBytes);
          localOffset += localHeader.length + nameBytes.length + data.length;
          centralSize += centralHeader.length + nameBytes.length;
        });
        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, files.length, true);
        endView.setUint16(10, files.length, true);
        endView.setUint32(12, centralSize, true);
        endView.setUint32(16, localOffset, true);
        endView.setUint16(20, 0, true);
        return new Blob([...localParts, ...centralParts, end], {
          type: "application/zip",
        });
      }
      function sourceDocumentFallback(document) {
        const source = clone(document || {});
        // Older saves predate pristine-source storage and only added this
        // tool-owned root field to the imported document.
        delete source.review_config;
        return source;
      }
      function safeProjectFilename(project, suffix, extension = "json") {
        const id = String(project?.id ?? "")
          .replace(/[^\w\-]+/g, "_")
          .replace(/^_+|_+$/g, "");
        const name = String(project?.name || "tolgee")
          .replace(/[^\w\-]+/g, "_")
          .replace(/^_+|_+$/g, "");
        const stem = ["tolgee", id, name && name !== "tolgee" ? name : ""]
          .filter(Boolean)
          .join("_");
        return `${stem}_${suffix}.${extension}`;
      }
      function finalTargetValue(row) {
        const status = statusOf(row);
        const usesSelectedFinal =
          ["accepted", "edited"].includes(status) ||
          (status === "rejected" && typeof row.finalEnglish === "string");
          const selected = usesSelectedFinal ? finalEnglish(row) : row.english;
        return String(
          protectRtlIcuBidi(
              selected ?? "",
            languageConfig.targetCode,
          ),
        );
      }
      function buildFinalDocumentAndReport() {
        if (!tolgee || !Array.isArray(rows))
          throw Error("Import a Tolgee JSON file first.");
        const finalDocument = clone(
          originalTolgeeJson || sourceDocumentFallback(tolgee),
        );
        const projectId = String(finalDocument.project?.id ?? "").trim();
        if (!projectId)
          throw Error("The original JSON is missing project.id.");
        finalDocument.project = {
          ...(finalDocument.project || {}),
          branch: `${projectId}-branch`,
        };
        if (!Array.isArray(finalDocument.translations))
          throw Error("The original JSON no longer contains translations[].");
        if (finalDocument.translations.length !== rows.length)
          throw Error(
            `Export stopped because the original JSON has ${finalDocument.translations.length} entries but the review workspace has ${rows.length}.`,
          );

        const byKeyId = new Map();
        const byObjectId = new Map();
        const byOriginalIndex = new Map();
        rows.forEach((row) => {
          if (row.key_id != null && String(row.key_id).trim() !== "")
            byKeyId.set(String(row.key_id), row);
          if (row.object_id != null && String(row.object_id).trim() !== "")
            byObjectId.set(String(row.object_id), row);
          if (Number.isInteger(row.originalIndex))
            byOriginalIndex.set(row.originalIndex, row);
        });
        const usedRows = new Set();
        const records = [];
        finalDocument.translations.forEach((entry, index) => {
          if (!entry || typeof entry !== "object")
            throw Error(`Invalid original translation entry at index ${index}.`);
          let row =
            entry.key_id != null
              ? byKeyId.get(String(entry.key_id))
              : null;
          if (!row && entry.object_id != null)
            row = byObjectId.get(String(entry.object_id));
          if (!row) row = byOriginalIndex.get(index);
          if (!row)
            throw Error(
              `Could not safely match original translation entry ${index + 1}.`,
            );
          if (
            usedRows.has(row) ||
            String(entry.key ?? "") !== String(row.key ?? "") ||
            String(entry.namespace ?? "") !== String(row.namespace ?? "") ||
            (entry.key_id != null &&
              row.key_id != null &&
              String(entry.key_id) !== String(row.key_id))
          )
            throw Error(
              `Identity validation failed for original translation entry ${index + 1}.`,
            );
          usedRows.add(row);
          const targetField = [
            row._targetField,
            ...languageFieldCandidates(languageConfig.targetCode, "target"),
          ].find(
            (field) =>
              field && Object.prototype.hasOwnProperty.call(entry, field),
          );
          if (!targetField)
            throw Error(
              `Export stopped because target field is missing for ${row.object_id || row.key}.`,
            );
          const originalTarget = String(
            row._originalEnglish ?? entry[targetField] ?? "",
          );
          const finalTarget = finalTargetValue(row);
          const status = statusOf(row);
          const reviewed = ["accepted", "rejected", "edited"].includes(status);
          const acceptedUnchanged =
            status === "accepted" &&
            row.proposal === row.english &&
            typeof row.finalEnglish !== "string";
          const targetChanged = finalTarget !== originalTarget;
          const icuCheck = validateIcuTranslation(row, finalTarget);
          if (targetChanged && icuCheck.isIcu && !icuCheck.valid)
            throw Error(
              `Export stopped because ICU is invalid for ${row.namespace ? `${row.namespace}.` : ""}${row.key}: ${icuCheck.error}`,
            );
          const icuCreated =
            targetChanged &&
            !looksLikeIcuRule(originalTarget) &&
            icuCheck.isIcu &&
            icuCheck.valid;
          const pluralEligibility = tolgeePluralEligibility(finalTarget);
          const pluralModeRequest = normalizedPluralModeRequest(
            row.pluralModeRequest,
          );
          if (
            pluralModeRequest &&
            (!pluralEligibility.eligible ||
              pluralModeRequest.plural_arg_name !==
                pluralEligibility.variable ||
              pluralModeRequest.rule_type !== pluralEligibility.type)
          )
            throw Error(
              `Export stopped because the Tolgee plural-mode request is no longer compatible with the ICU message for ${row.namespace ? `${row.namespace}.` : ""}${row.key}. Reopen the entry and save it again.`,
            );
          const pluralModeChange = pluralModeRequest
            ? {
                action: "enable",
                original_is_plural:
                  typeof row._originalIsPlural === "boolean"
                    ? row._originalIsPlural
                    : null,
                original_plural_arg_name:
                  typeof row._originalPluralArgName === "string"
                    ? row._originalPluralArgName
                    : null,
                is_plural: true,
                plural_arg_name: pluralModeRequest.plural_arg_name,
                rule_type: pluralModeRequest.rule_type,
              }
            : null;
          const changeSource = !targetChanged
            ? null
            : row.doubleCheckEdited
              ? "double_check_edit"
              : status === "edited"
              ? "human_edit"
              : status === "accepted" && !acceptedUnchanged
                ? "accepted_proposal"
                : status === "rejected" &&
                    typeof row.finalEnglish === "string"
                  ? "rejected_final_adjustment"
                  : "sentence_case_normalization";
          entry[targetField] = finalTarget;
          if (reviewed) {
            if (Object.prototype.hasOwnProperty.call(entry, "translation_state"))
              entry.translation_state = "REVIEWED";
            if (
              Object.prototype.hasOwnProperty.call(
                entry,
                "translation_state_raw",
              )
            )
              entry.translation_state_raw = "REVIEWED";
          }
          records.push({
            original_order_index: index,
            object_id: row.object_id ?? null,
            key_id: row.key_id ?? null,
            key: row.key,
            namespace: row.namespace ?? null,
            decision: status,
            reviewed,
            double_check_edited: row.doubleCheckEdited === true,
            accepted_unchanged: acceptedUnchanged,
            unable_to_translate: !!row.unable_to_translate,
            original_target: originalTarget,
            final_target: finalTarget,
            target_changed: targetChanged,
            change_source: changeSource,
            icu: icuCheck.isIcu,
            icu_valid: !icuCheck.isIcu || icuCheck.valid,
            icu_created: icuCreated,
            icu_rules: icuCheck.analysis?.rules?.map((rule) => ({
              variable: rule.variable,
              type: rule.type,
              branches: rule.options,
            })) || [],
            original_is_plural:
              typeof row._originalIsPlural === "boolean"
                ? row._originalIsPlural
                : null,
            original_plural_arg_name:
              typeof row._originalPluralArgName === "string"
                ? row._originalPluralArgName
                : null,
            plural_mode_change: pluralModeChange,
          });
        });
        if (usedRows.size !== rows.length)
          throw Error("Export stopped because not every reviewed row was matched.");

        const count = (predicate) => records.filter(predicate).length;
        const namespaceSummary = {};
        records.forEach((record) => {
          const name = record.namespace ?? "(without namespace)";
          namespaceSummary[name] ||= {
            total_keys: 0,
            reviewed_keys: 0,
            target_values_changed: 0,
            humanly_edited: 0,
          };
          const summary = namespaceSummary[name];
          summary.total_keys += 1;
          if (record.reviewed) summary.reviewed_keys += 1;
          if (record.target_changed) summary.target_values_changed += 1;
          if (record.decision === "edited") summary.humanly_edited += 1;
        });
        const report = {
          schema_version: 1,
          report_type: "translation_review_report",
          generated_at: new Date().toISOString(),
          project: clone(finalDocument.project || tolgee.project || {}),
          base_language: exactLanguageTag("base"),
          target_language: exactLanguageTag("target"),
          order_preserved: true,
          summary: {
            total_keys: records.length,
            reviewed_keys: count((record) => record.reviewed),
            target_values_changed: count((record) => record.target_changed),
            proposals_accepted: count(
              (record) =>
                record.decision === "accepted" &&
                !record.accepted_unchanged,
            ),
            accepted_unchanged: count(
              (record) => record.accepted_unchanged,
            ),
            humanly_edited: count(
              (record) =>
                record.change_source === "human_edit" &&
                !record.double_check_edited,
            ),
            double_check_edited: count(
              (record) => record.double_check_edited,
            ),
            rejected: count((record) => record.decision === "rejected"),
            rejected_with_final_value_change: count(
              (record) =>
                record.decision === "rejected" && record.target_changed,
            ),
            pending_review: count(
              (record) => record.decision === "pending",
            ),
            unchanged_unreviewed: count(
              (record) => record.decision === "unchanged",
            ),
            unable_to_translate: count(
              (record) => record.unable_to_translate,
            ),
            sentence_case_normalized: count(
              (record) =>
                record.change_source === "sentence_case_normalization",
            ),
            icu_entries: count((record) => record.icu),
            icu_entries_created: count((record) => record.icu_created),
            plural_mode_enable_requests: count(
              (record) => record.plural_mode_change?.action === "enable",
            ),
            invalid_icu_entries: count(
              (record) => record.icu && !record.icu_valid,
            ),
          },
          changes_by_namespace: namespaceSummary,
          changed_entries: records.filter((record) => record.target_changed),
          reviewed_entries: records.filter((record) => record.reviewed),
          plural_metadata_changes: records.filter(
            (record) => record.plural_mode_change != null,
          ),
        };
        if (
          report.summary.icu_entries_created > 0 &&
          finalDocument.project?.icu_placeholders_enabled === false
        )
          throw Error(
            "Export stopped because this project has Tolgee ICU placeholders disabled. Enable the setting in Tolgee before exporting newly created ICU translations.",
          );
        return { finalDocument, report };
      }
      function buildReviewPackage(finalDocument, report) {
        const files = [
          {
            name: safeProjectFilename(finalDocument.project, "final_reviewed"),
            content: JSON.stringify(finalDocument, null, 2),
          },
          {
            name: safeProjectFilename(finalDocument.project, "review_report"),
            content: JSON.stringify(report, null, 2),
          },
        ];
        return {
          files,
          filename: safeProjectFilename(
            finalDocument.project,
            "review_package",
            "zip",
          ),
          blob: buildStoredZip(files),
        };
      }
      function exportFinalJson() {
        try {
          const { finalDocument, report } = buildFinalDocumentAndReport();
          const summary = report.summary;
          const branch = finalDocument.project.branch;
          const doubleCheckNote = doubleCheckMode
            ? languageConfig.toolLanguage === "zh"
              ? `复核者编辑 ${summary.double_check_edited} 条。`
              : `${summary.double_check_edited} reviewer edit${summary.double_check_edited === 1 ? "" : "s"}.`
            : "";
          const message =
            languageConfig.toolLanguage === "zh"
              ? `导出包含最终审核 JSON 和审核报告的 ZIP？\n\n目标分支：${branch}\n共 ${summary.total_keys} 条；${summary.target_values_changed} 条目标译文已更改；${summary.icu_entries_created} 条新建 ICU；${summary.plural_mode_enable_requests} 条请求启用 Tolgee 复数模式；${summary.humanly_edited} 条人工编辑；${summary.reviewed_keys} 条已审核。${doubleCheckNote ? ` ${doubleCheckNote}` : ""}`
              : `Export one ZIP containing the final reviewed JSON and matching review report?\n\nDestination branch: ${branch}\n${summary.total_keys} total keys; ${summary.target_values_changed} target values changed; ${summary.icu_entries_created} ICU entries created; ${summary.plural_mode_enable_requests} Tolgee plural-mode enable requests; ${summary.humanly_edited} human edits; ${summary.reviewed_keys} reviewed keys.${doubleCheckNote ? ` ${doubleCheckNote}` : ""}`;
          if (!confirm(message)) return;
          const reviewPackage = buildReviewPackage(finalDocument, report);
          downloadBlob(reviewPackage.filename, reviewPackage.blob);
          notify(
            languageConfig.toolLanguage === "zh"
              ? `审核包已导出。ZIP 包含最终审核 JSON 和审核报告，目标分支为 ${branch}。`
              : `Review package exported. The ZIP contains both required JSON files for ${branch}.`,
            6000,
          );
        } catch (error) {
          notify(
            (languageConfig.toolLanguage === "zh"
              ? "无法导出审核包："
              : "Could not export review package: ") +
              (error.message || "unknown error"),
            8000,
          );
        }
      }
      /* Backups preserve decisions and screenshot metadata, but omit image data to remain reliable. */
      function exportBackup() {
        try {
          const payload = workspaceSnapshot({ backup: true });
          download(
            "ulearning_translation_review_progress_backup.json",
            JSON.stringify(payload, null, 2),
          );
          notify(
            languageConfig.toolLanguage === "zh"
              ? "已下载进度备份。审核决定和截图元数据已保留；图片文件未包含。"
              : "Progress backup downloaded. Decisions and screenshot metadata are preserved; image files are omitted.",
            6000,
          );
        } catch (error) {
          notify(
            (languageConfig.toolLanguage === "zh"
              ? "无法创建进度备份："
              : "Could not create progress backup: ") +
              (error.message || "unknown error"),
            8000,
          );
        }
      }
      function importBackup(data) {
        if (
          !data ||
          data.backup_schema_version !== 1 ||
          !Array.isArray(data.rows) ||
          !data.tolgee
        )
          throw Error(
            "This does not look like a progress backup exported by this tool.",
          );
        tolgee = data.tolgee;
        originalTolgeeJson = data.originalTolgeeJson
          ? clone(data.originalTolgeeJson)
          : sourceDocumentFallback(data.tolgee);
        rows = rowsWithoutScreenshotImages(data.rows).map(normalizePersistedRow);
        languageConfig = {
          ...languageConfig,
          ...(data.languageConfig || tolgee.review_config || {}),
        };
        syncExactLanguageTagsFromProject(tolgee);
        $("setupBaseLanguage").value = languageConfig.baseCode;
        $("setupTargetLanguage").value = languageConfig.targetCode;
        $("setupToolLanguage").value = languageConfig.toolLanguage;
        applyToolLanguage();
        const restoredView = data.currentView;
        currentView =
          restoredView === "doubleToCheck" || restoredView === "doubleChecked"
            ? "pending"
            : restoredView === "needs"
              ? "pending"
              : restoredView || "pending";
        $("pageSize").value = String(data.pageSize || 20);
        page = 1;
        syncProject();
        render();
        persist();
        notify(
          languageConfig.toolLanguage === "zh"
            ? "已恢复审核备份。"
            : "Progress backup restored.",
        );
      }
      function syncProject() {
        let p = tolgee?.project || {};
        const zh = languageConfig.toolLanguage === "zh";
        $("projectTitle").textContent = p.name
          ? `${p.name} · ${zh ? "翻译审核" : "Translation review"}`
          : zh
            ? "翻译审核工作区"
            : "Translation review workspace";
        $("notice").textContent = zh
          ? `Tolgee 项目：${p.name || "未知"}（ID ${p.id ?? "—"}）。已加载 ${rows.length} 条字符串。源语言：${languageLabel(languageConfig.baseCode)}；目标语言：${languageLabel(languageConfig.targetCode)}。`
          : `Tolgee project: ${p.name || "Unknown"} (ID ${p.id ?? "—"}). ${rows.length} strings loaded. Source: ${languageLabel(languageConfig.baseCode)}; target: ${languageLabel(languageConfig.targetCode)}. Existing translation state is retained as metadata.`;
      }
      function readFile(file) {
        return new Promise((resolve, reject) => {
          let reader = new FileReader();
          reader.onload = () => {
            try {
              resolve(JSON.parse(reader.result));
            } catch (e) {
              reject(Error("Invalid JSON in " + file.name + ": " + e.message));
            }
          };
          reader.onerror = () => reject(Error("Could not read " + file.name));
          reader.readAsText(file);
        });
      }
      function openImport() {
        $("modalError").textContent = "";
        $("tolgeeFile").value = "";
        $("proposalFile").value = "";
        $("screenshotsFolder").value = "";
        const baseField =
            LANGUAGES[languageConfig.baseCode]?.field ||
            languageConfig.baseCode,
          targetField =
            LANGUAGES[languageConfig.targetCode]?.field ||
            languageConfig.targetCode;
        $("modalIntro").textContent =
          languageConfig.toolLanguage === "zh"
            ? `当前语言设置：${languageLabel(languageConfig.baseCode)} → ${languageLabel(languageConfig.targetCode)}。请确认 Tolgee JSON 的每个翻译条目包含源语言字段（例如 ${baseField}）和目标语言字段（例如 ${targetField} 或 target_text）。提案 JSON 可单独导入。`
            : `Selected languages: ${languageLabel(languageConfig.baseCode)} → ${languageLabel(languageConfig.targetCode)}. Ensure each Tolgee translation entry contains the source-language field (for example ${baseField}) and target-language field (for example ${targetField} or target_text). The proposal JSON can be imported separately.`;
        $("importModal").classList.add("open");
      }
      function screenshotReferenceCount() {
        return rows.reduce(
          (n, r) =>
            n + (Array.isArray(r.screenshots) ? r.screenshots.length : 0),
          0,
        );
      }
      function finishSetup(allowWithoutFileDestination = false) {
        if (
          !allowWithoutFileDestination &&
          !autosaveDirectoryHandle &&
          !autosaveFileHandle
        ) {
          const msg =
            languageConfig.toolLanguage === "zh"
              ? "请先选择保存文件夹，再打开新项目工作区。"
              : "Choose a saving folder before opening a new project workspace.";
          notify(msg);
          $("setupWizard").classList.remove("hidden");
          $("appShell").classList.add("hidden");
          return false;
        }
        $("setupWizard").classList.add("hidden");
        $("appShell").classList.remove("hidden");
        return true;
      }
      function refreshSetup() {
        const hasSource = !!tolgee;
        $("setupBaseLanguage").disabled = hasSource;
        $("setupTargetLanguage").disabled = hasSource;
        const nshots = screenshotReferenceCount();
        $("setupJsonStatus").textContent = hasSource
          ? languageConfig.toolLanguage === "zh"
            ? `已从 ${tolgee.project?.name || "项目"}（ID ${tolgee.project?.id ?? "—"}）导入 ${rows.length} 个键。`
            : `Imported ${rows.length} keys from ${tolgee.project?.name || "project"} (ID ${tolgee.project?.id ?? "—"}).`
          : languageConfig.toolLanguage === "zh"
            ? "尚未导入 JSON 文件。"
            : "JSON files not imported yet.";
        $("setupJsonStatus").className =
          "setup-status" + (hasSource ? " ok" : "");
        $("setupImportScreenshots").disabled = !hasSource || nshots === 0;
        if (!hasSource) {
          $("setupScreenshotStatus").textContent =
            languageConfig.toolLanguage === "zh"
              ? "请先导入 Tolgee JSON，再加载截图。"
              : "Import the Tolgee JSON before loading screenshots.";
          $("setupScreenshotStatus").className = "setup-status";
          $("setupSkipScreenshots").hidden = true;
        } else if (nshots === 0) {
          setupScreenshotsHandled = true;
          $("setupScreenshotStatus").textContent =
            languageConfig.toolLanguage === "zh"
              ? "项目 JSON 中没有截图关联，无需选择截图文件夹。"
              : "No screenshot associations were found in this project JSON; no screenshot folder is required.";
          $("setupScreenshotStatus").className = "setup-status ok";
          $("setupSkipScreenshots").hidden = true;
        } else if (setupScreenshotsHandled) {
          $("setupScreenshotStatus").textContent =
            languageConfig.toolLanguage === "zh"
              ? "截图步骤已完成或跳过。已匹配的截图可在审核条目中查看。"
              : "Screenshot step completed or skipped. Screenshot images that were matched are available in the review cards.";
          $("setupScreenshotStatus").className = "setup-status ok";
          $("setupSkipScreenshots").hidden = true;
        } else {
          $("setupScreenshotStatus").textContent =
            languageConfig.toolLanguage === "zh"
              ? `找到 ${nshots} 个截图关联。请导入图片文件夹，或明确跳过此步骤。`
              : `${nshots} screenshot association(s) found. Import the folder containing the images, or explicitly skip this step.`;
          $("setupScreenshotStatus").className = "setup-status";
          $("setupSkipScreenshots").hidden = false;
        }
        const ready = hasSource && setupScreenshotsHandled;
        $("setupFolderStep").classList.toggle("setup-step-locked", !ready);
        $("setupChooseFolder").disabled = !ready;
        $("setupContinueBrowser").hidden = true;
        $("setupContinueBrowser").disabled = true;
        $("setupFolderStatus").textContent = ready
          ? window.showDirectoryPicker
            ? languageConfig.toolLanguage === "zh"
              ? "请选择保存文件夹。未选择文件夹时，无法启动新项目工作区。"
              : "Select the saving folder. A new project workspace cannot start until a folder is selected."
            : languageConfig.toolLanguage === "zh"
              ? "此浏览器不支持文件夹访问。请使用支持文件夹访问的 Chrome 或 Edge。"
              : "This browser does not support folder access. Use Chrome or Edge with folder-access support."
          : languageConfig.toolLanguage === "zh"
            ? "请先完成第 2 步。"
            : "Complete step 2 before continuing.";
        $("setupFolderStatus").className =
          "setup-status" +
          (ready ? (window.showDirectoryPicker ? "" : " error") : "");
      }
      function updateLanguageConfigFromUI() {
        const next = {
          baseCode: $("setupBaseLanguage").value,
          targetCode: $("setupTargetLanguage").value,
          baseTag: $("setupBaseLanguage").value,
          targetTag: $("setupTargetLanguage").value,
          toolLanguage: $("setupToolLanguage").value,
        };
        if (next.baseCode === next.targetCode) {
          notify(
            next.toolLanguage === "zh"
              ? "源语言和目标语言不能相同。"
              : "The source and target languages must be different.",
          );
          $("setupBaseLanguage").value = languageConfig.baseCode;
          $("setupTargetLanguage").value = languageConfig.targetCode;
          return;
        }
        languageConfig = next;
        if (tolgee) tolgee.review_config = clone(languageConfig);
        applyToolLanguage();
        refreshSetup();
        render();
        persist();
      }
      ["setupBaseLanguage", "setupTargetLanguage", "setupToolLanguage"].forEach(
        (id) => $(id).addEventListener("change", updateLanguageConfigFromUI),
      );
      document.querySelectorAll("[data-theme-selector]").forEach((selector) =>
        selector.addEventListener("change", () => {
          applyTheme(selector.value);
        }),
      );
      $("liveToolLanguage").addEventListener("change", async () => {
        languageConfig.toolLanguage = $("liveToolLanguage").value;
        if (tolgee) tolgee.review_config = clone(languageConfig);
        $("setupToolLanguage").value = languageConfig.toolLanguage;
        applyToolLanguage();
        refreshSetup();
        render();
        await persist();
        notify(
          languageConfig.toolLanguage === "zh"
            ? "界面语言已切换。"
            : "Interface language changed.",
        );
      });
      $("importFilesTop").addEventListener("click", openImport);
      $("importScreenshotsTop").addEventListener("click", () => {
        $("setupScreenshotsInput").value = "";
        $("setupScreenshotsInput").click();
      });
      $("setupImportJsons").addEventListener("click", openImport);
      function openRestoreBackupModal(context = "workspace") {
        restoreModalContext = context;
        $("restoreBackupFile").value = "";
        $("restoreScreenshotsFolder").value = "";
        $("restoreBackupError").textContent = "";
        $("continueRestoreBackup").disabled = true;
        const doubleCheck = context === "doubleCheck";
        $("restoreBackupTitle").textContent = doubleCheck ? "Conduct double check" : "Restore review progress";
        $("restoreBackupIntro").textContent = doubleCheck
          ? "Select a progress backup JSON. The optional screenshots folder can be added now; no original or proposal JSON is required."
          : "Select the progress backup JSON. You may also select the screenshots folder now so screenshot images are available immediately.";
        $("restoreBackupModal").classList.add("open");
      }
      function closeRestoreBackupModal() {
        $("restoreBackupModal").classList.remove("open");
        $("restoreBackupError").textContent = "";
      }
      async function finishRestoredSetup(screenshotResult = null) {
        setupScreenshotsHandled =
          screenshotReferenceCount() === 0 || screenshotResult !== null;
        refreshSetup();
        $("setupJsonStatus").textContent =
          `Restored ${rows.length} reviewed entries from ${tolgee.project?.name || "project"} (ID ${tolgee.project?.id ?? "—"}).`;
        $("setupJsonStatus").className = "setup-status ok";
        $("setupScreenshotStatus").textContent = screenshotResult
          ? languageConfig.toolLanguage === "zh"
            ? `已恢复审核决定，并匹配 ${screenshotResult.matched} 张截图${screenshotResult.missing ? `；${screenshotResult.missing} 个截图引用未找到` : ""}。`
            : `Review decisions were restored and ${screenshotResult.matched} screenshot image(s) matched${screenshotResult.missing ? `; ${screenshotResult.missing} reference(s) were not found` : ""}.`
          : languageConfig.toolLanguage === "zh"
            ? "审核决定和截图元数据已恢复。未选择截图文件夹；需要时可稍后导入。"
            : "Review decisions and screenshot metadata were restored. No screenshot folder was selected; it can be imported later.";
        $("setupScreenshotStatus").className = "setup-status ok";
        $("setupSkipScreenshots").hidden = true;
        finishSetup(true);
        await persist();
      }
      $("setupRestoreBackup").addEventListener("click", () =>
        openRestoreBackupModal("setup"),
      );
      $("setupDoubleCheck").addEventListener("click", () =>
        openRestoreBackupModal("doubleCheck"),
      );
      function validateDoubleCheckBackup(data) {
        const backupRows = Array.isArray(data?.rows) ? data.rows : [];
        const pending = backupRows.filter((row) => {
          const proposal = typeof row?.proposal === "string" ? row.proposal : "";
          const original = typeof row?.english === "string" ? row.english : "";
          const changedProposal = proposal.trim() !== "" && proposal !== original;
          const decision = row?.decision || (changedProposal ? "pending" : "unchanged");
          return changedProposal && !["accepted", "rejected", "edited"].includes(decision);
        });
        const uncheckedUnchanged = backupRows.filter((row) => {
          const proposal = typeof row?.proposal === "string" ? row.proposal : "";
          const original = typeof row?.english === "string" ? row.english : "";
          const decision = row?.decision || "unchanged";
          return proposal.trim() !== "" && proposal === original && !row?.unable_to_translate && !["accepted", "edited"].includes(decision);
        });
        return { pending, uncheckedUnchanged };
      }
      $("restoreBackupFile").addEventListener("change", () => {
        $("continueRestoreBackup").disabled =
          !$("restoreBackupFile").files[0];
        $("restoreBackupError").textContent = "";
      });
      ["closeRestoreBackup", "cancelRestoreBackup"].forEach(
        (id) => ($(id).onclick = closeRestoreBackupModal),
      );
      $("restoreBackupModal").addEventListener("click", (event) => {
        if (event.target.id === "restoreBackupModal")
          closeRestoreBackupModal();
      });
      $("continueRestoreBackup").onclick = async () => {
        const backupFile = $("restoreBackupFile").files[0];
        if (!backupFile) return;
        $("continueRestoreBackup").disabled = true;
        $("restoreBackupError").textContent = "";
        try {
          const backup = await readFile(backupFile);
          if (
            !backup ||
            backup.backup_schema_version !== 1 ||
            !backup.tolgee ||
            !Array.isArray(backup.rows)
          )
            throw Error(
              "This file is not a valid Translation Review Desk progress backup. Choose a JSON created by Download backup or the tool's save/ folder.",
            );
          if (restoreModalContext === "doubleCheck") {
            const issues = validateDoubleCheckBackup(backup);
            if (issues.pending.length || issues.uncheckedUnchanged.length) {
              const details = [
                issues.pending.length ? `${issues.pending.length} pending review entr${issues.pending.length === 1 ? "y" : "ies"}` : "",
                issues.uncheckedUnchanged.length ? `${issues.uncheckedUnchanged.length} unchecked unchanged proposal${issues.uncheckedUnchanged.length === 1 ? "" : "s"}` : "",
              ].filter(Boolean).join(" and ");
              throw Error(`Double-check requires a completed review backup. This backup still contains ${details}. Finish the normal review workflow first, then download a new backup.`);
            }
          }
          autosaveFileHandle = null;
          autosaveDirectoryHandle = null;
          await clearStoredHandle("autosaveFileHandle");
          await clearStoredHandle("autosaveDirectoryHandle");
          setAutosaveStatus(
            "Backup restored. Choose Project → Change saving location to enable file autosave on this device.",
          );
          if (restoreModalContext !== "doubleCheck")
            configureDoubleCheckMode(false);
          importBackup(backup);
          const screenshotFiles = [
            ...$("restoreScreenshotsFolder").files,
          ];
          const screenshotResult = screenshotFiles.length
            ? await attachScreenshotFiles(screenshotFiles)
            : null;
          closeRestoreBackupModal();
          if (restoreModalContext === "doubleCheck") {
            configureDoubleCheckMode(true);
            currentView = "doubleToCheck";
            closeRestoreBackupModal();
            finishSetup(true);
            refreshSetup();
            render();
            await persist();
            notify(
              languageConfig.toolLanguage === "zh"
                ? `双重复核已开始：${rows.length} 条字符串已加载。`
                : `Double-check started with ${rows.length} strings loaded.`,
              5000,
            );
          } else if (restoreModalContext === "setup")
            await finishRestoredSetup(screenshotResult);
          else {
            setupScreenshotsHandled =
              screenshotReferenceCount() === 0 || screenshotResult !== null;
            document
              .querySelectorAll(".nav[data-view]")
              .forEach((button) =>
                button.classList.toggle(
                  "active",
                  button.dataset.view === currentView,
                ),
              );
            refreshSetup();
            render();
            await persist();
          }
          notify(
            languageConfig.toolLanguage === "zh"
              ? `备份已恢复${screenshotResult ? `，并匹配 ${screenshotResult.matched} 张截图` : "；未选择截图文件夹"}。`
              : `Backup restored${screenshotResult ? ` with ${screenshotResult.matched} screenshot image(s) matched` : "; no screenshot folder was selected"}.`,
          );
        } catch (e) {
          $("restoreBackupError").textContent =
            "Could not restore backup: " + e.message;
          $("continueRestoreBackup").disabled = false;
        }
      };
      $("setupImportScreenshots").addEventListener("click", () =>
        $("setupScreenshotsInput").click(),
      );
      $("setupSkipScreenshots").addEventListener("click", () => {
        setupScreenshotsHandled = true;
        refreshSetup();
        notify(
          "Screenshot step skipped. Screenshot metadata is retained, but images not loaded will not display.",
        );
      });
      $("setupChooseFolder").addEventListener("click", () =>
        chooseAutosaveFile(true),
      );
      $("setupContinueBrowser").addEventListener("click", () => {
        notify(
          languageConfig.toolLanguage === "zh"
            ? "新项目必须先选择保存文件夹。请使用支持文件夹访问的 Chrome 或 Edge。"
            : "A new project requires a selected saving folder. Please use Chrome or Edge with folder-access support.",
        );
      });
      $("setupScreenshotsInput").addEventListener("change", async () => {
        const files = [...$("setupScreenshotsInput").files];
        if (!files.length) return;
        try {
          const result = await attachScreenshotFiles(files);
          setupScreenshotsHandled = true;
          refreshSetup();
          await persist();
          notify(
            `${result.matched} screenshot image(s) matched to entries${result.missing ? `; ${result.missing} reference(s) not found` : ""}.`,
          );
        } catch (e) {
          notify("Could not load screenshots: " + e.message);
        }
        $("setupScreenshotsInput").value = "";
      });
      ["closeModal", "cancelModal"].forEach(
        (id) =>
          ($(id).onclick = () => $("importModal").classList.remove("open")),
      );
      $("loadFiles").onclick = async () => {
        try {
          const tf = $("tolgeeFile").files[0],
            pf = $("proposalFile").files[0];
          let sf = [...$("screenshotsFolder").files],
            messages = [];
          let sourceData = null;
          if (tf) sourceData = await readFile(tf);
          if (sourceData) {
            originalTolgeeJson = clone(sourceData);
            const parsed = parseTolgee(clone(sourceData));
            tolgee = parsed.data;
            syncExactLanguageTagsFromProject(tolgee);
            tolgee.review_config = clone(languageConfig);
            rows = parsed.parsed;
            autosaveFileHandle = null;
            await clearStoredHandle("autosaveFileHandle");
            setupScreenshotsHandled = false;
            proposalCount = 0;
            page = 1;
            currentView = "pending";
            if (pf) {
              const proposalData = await readFile(pf);
              if (
                proposalData.project?.id != null &&
                String(proposalData.project.id) !== String(tolgee.project.id)
              )
                throw Error(
                  "Proposal project ID does not match the imported Tolgee project. No proposals were applied.",
                );
              if (
                proposalData.project?.branch &&
                proposalData.project.branch !== tolgee.project.branch
              )
                throw Error(
                  "Proposal branch does not match the imported review branch. No proposals were applied.",
                );
              const result = matchProposals(parseProposals(proposalData));
              messages.push(`${result.matched} proposals matched`);
              if (result.unmatched.length)
                messages.push(
                  `${result.unmatched.length} unmatched proposal keys`,
                );
              if (result.dupes.length)
                messages.push(
                  `${result.dupes.length} duplicate proposals ignored`,
                );
            } else
              messages.push(
                languageConfig.toolLanguage === "zh"
                  ? "未导入提案文件；保留原目标译文"
                  : "No proposal file imported; original target translations are unchanged",
              );
            syncProject();
          } else if (pf) {
            if (!tolgee)
              throw Error(
                "Import the original Tolgee JSON before importing proposals.",
              );
            const result = matchProposals(parseProposals(await readFile(pf)));
            messages.push(`${result.matched} proposals matched`);
            if (result.unmatched.length)
              messages.push(
                `${result.unmatched.length} unmatched proposal keys`,
              );
            if (result.dupes.length)
              messages.push(
                `${result.dupes.length} duplicate proposals ignored`,
              );
          } else if (!sf.length)
            throw Error(
              "Choose a Tolgee JSON, proposal JSON, or screenshots folder.",
            );
          if (sf.length) {
            if (!rows.length)
              throw Error(
                "Import the Tolgee JSON first so screenshots can be matched to entries.",
              );
            const screenshotResult = await attachScreenshotFiles(sf);
            setupScreenshotsHandled = true;
            messages.push(
              `${screenshotResult.matched} screenshots matched to entries`,
            );
            if (screenshotResult.missing)
              messages.push(
                `${screenshotResult.missing} screenshot references not found`,
              );
          }
          if (tolgee && screenshotReferenceCount() === 0)
            setupScreenshotsHandled = true;
          $("importModal").classList.remove("open");
          document
            .querySelectorAll(".nav[data-view]")
            .forEach((b) =>
              b.classList.toggle("active", b.dataset.view === currentView),
            );
          refreshSetup();
          render();
          await persist();
          notify(messages.join(" · "));
        } catch (e) {
          $("modalError").textContent = e.message;
        }
      };
      $("exportTop").onclick = exportFinalJson;
      $("replaceTermsTop").onclick = openTermReplacement;
      ["closeReplaceTerms", "cancelReplaceTerms"].forEach(
        (id) =>
          ($(id).onclick = () =>
            $("replaceTermsModal").classList.remove("open")),
      );
      ["replaceFind", "replaceWith"].forEach((id) =>
        $(id).addEventListener("input", proposalReplacementPreview),
      );
      $("replaceScope").addEventListener(
        "change",
        proposalReplacementPreview,
      );
      $("applyTermReplacement").onclick = applyTermReplacement;
      $("downloadGlossaryJson").onclick = exportReplacementGlossary;
      $("replaceTermsModal").addEventListener("click", (event) => {
        if (event.target.id === "replaceTermsModal")
          $("replaceTermsModal").classList.remove("open");
      });
      document.addEventListener("keydown", (event) => {
        if (
          event.key === "Escape" &&
          $("replaceTermsModal").classList.contains("open")
        )
          $("replaceTermsModal").classList.remove("open");
        if (
          event.key === "Escape" &&
          $("restoreBackupModal").classList.contains("open")
        )
          closeRestoreBackupModal();
      });
      $("autosaveFileTop").onclick = () => chooseAutosaveFile(false);
      document.querySelectorAll("[data-stat-view]").forEach((el) => {
        const go = () => setView(el.dataset.statView);
        el.addEventListener("click", go);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        });
      });
      $("backupTop").onclick = exportBackup;
      $("restoreTop").onclick = () => openRestoreBackupModal("workspace");
      $("resetTop").onclick = async () => {
        if (
          !confirm(
            "Clear the current local workspace and autosave? Download a progress backup first if you may need these decisions.",
          )
        )
          return;
        configureDoubleCheckMode(false);
        tolgee = null;
        originalTolgeeJson = null;
        rows = [];
        currentView = "pending";
        page = 1;
        proposalCount = 0;
        setupScreenshotsHandled = false;
        try {
          if (db)
            await new Promise((resolve) => {
              let tx = db.transaction(STORE, "readwrite");
              tx.objectStore(STORE).delete("active");
              tx.oncomplete = resolve;
              tx.onerror = resolve;
            });
          localStorage.removeItem(STORE_KEY);
        } catch (e) {}
        $("projectTitle").textContent = "Translation review workspace";
        $("notice").textContent =
          "Start by importing the Tolgee JSON extracted from the import package. Then import the separate proposal JSON generated by ChatGPT.";
        render();
        refreshSetup();
        $("appShell").classList.add("hidden");
        $("setupWizard").classList.remove("hidden");
        notify("Local workspace cleared. Import files to begin a new setup.");
      };
      [
        "q",
        "confidence",
        "onlyIssues",
        "sort",
        "pageSize",
      ].forEach((id) =>
        $(id).addEventListener(id === "q" ? "input" : "change", () => {
          page = 1;
          render();
        }),
      );
      function selectedSearchScopes() {
        return [
          ...document.querySelectorAll(
            "#searchScopeMenu input[type=checkbox]:checked",
          ),
        ].map((el) => el.value);
      }
      function updateSearchScopeCaption() {
        const selected = selectedSearchScopes(),
          allScopes = document.querySelectorAll(
            "#searchScopeMenu input[type=checkbox]",
          ),
          caption = $("searchScopeCaption");
        if (!caption) return;
        if (selected.length === allScopes.length)
          caption.textContent = tr("searchInAll");
        else if (selected.length === 1) {
          const input = document.querySelector(
            `#searchScopeMenu input[value="${selected[0]}"]`,
          );
          caption.textContent =
            input?.parentElement?.querySelector("span")?.textContent ||
            tr("searchInAll");
        } else
          caption.textContent = tr("searchInCount").replace(
            "{count}",
            selected.length,
          );
      }
      $("searchScopeTrigger").addEventListener("click", () => {
        const wrap = $("searchScope"),
          open = !wrap.classList.contains("open");
        wrap.classList.toggle("open", open);
        $("searchScopeTrigger").setAttribute("aria-expanded", String(open));
      });
      document
        .querySelectorAll("#searchScopeMenu input[type=checkbox]")
        .forEach((el) =>
          el.addEventListener("change", (event) => {
            if (!selectedSearchScopes().length) event.target.checked = true;
            page = 1;
            updateSearchScopeCaption();
            render();
          }),
        );
      $("selectAllSearchScopes").addEventListener("click", () => {
        document
          .querySelectorAll("#searchScopeMenu input[type=checkbox]")
          .forEach((el) => (el.checked = true));
        page = 1;
        updateSearchScopeCaption();
        render();
      });
      document.addEventListener("click", (e) => {
        const wrap = $("searchScope");
        if (wrap && !wrap.contains(e.target)) {
          wrap.classList.remove("open");
          $("searchScopeTrigger").setAttribute("aria-expanded", "false");
        }
      });
      document
        .querySelectorAll(".nav[data-view]")
        .forEach((b) =>
          b.addEventListener("click", () => {
            setView(b.dataset.view);
            const layout = document.querySelector(".layout");
            if (layout?.classList.contains("mobile-nav-open")) {
              layout.classList.remove("mobile-nav-open");
              $("mobileNavToggle")?.setAttribute("aria-expanded", "false");
            }
          }),
        );
      $("mobileNavToggle")?.addEventListener("click", () => {
        const layout = document.querySelector(".layout");
        if (!layout) return;
        const open = layout.classList.toggle("mobile-nav-open");
        $("mobileNavToggle").setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", (event) => {
        const menu = $("projectMenu");
        if (menu?.open && !menu.contains(event.target)) menu.open = false;
      });
      document
        .querySelectorAll(".project-menu-popover button")
        .forEach((button) =>
          button.addEventListener("click", () => {
            const menu = $("projectMenu");
            if (menu) menu.open = false;
          }),
        );
      function movePage(n) {
        let arr = visibleRows(),
          pages = Math.max(
            1,
            Math.ceil(arr.length / (Number($("pageSize").value) || 20)),
          );
        page = Math.max(1, Math.min(pages, page + n));
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      $("firstPage").onclick = () => {
        page = 1;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      $("prevPage").onclick = $("prevBottom").onclick = () => movePage(-1);
      $("nextPage").onclick = $("nextBottom").onclick = () => movePage(1);
      $("lastPage").onclick = () => {
        page = Math.max(
          1,
          Math.ceil(visibleRows().length / (Number($("pageSize").value) || 20)),
        );
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      (async () => {
        db = await openDB();
        if (db) {
          try {
            autosaveFileHandle = await new Promise((resolve) => {
              let req = db
                .transaction(STORE, "readonly")
                .objectStore(STORE)
                .get("autosaveFileHandle");
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
            if (autosaveFileHandle) {
              let perm = await autosaveFileHandle.queryPermission({
                mode: "readwrite",
              });
              setAutosaveStatus(
                "Backup file remembered: " +
                  autosaveFileHandle.name +
                  " (direct autosave)" +
                  (perm === "granted" ? "" : " — permission may need renewal"),
                perm === "granted" ? "ok" : "",
              );
            } else {
              autosaveDirectoryHandle = await new Promise((resolve) => {
                let req = db
                  .transaction(STORE, "readonly")
                  .objectStore(STORE)
                  .get("autosaveDirectoryHandle");
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
              });
              if (autosaveDirectoryHandle) {
                let perm = await autosaveDirectoryHandle.queryPermission({
                  mode: "readwrite",
                });
                setAutosaveStatus(
                  "Tool folder remembered: " +
                    autosaveDirectoryHandle.name +
                    " (save/ will hold project JSON files)" +
                    (perm === "granted"
                      ? ""
                      : " — permission may need renewal"),
                  perm === "granted" ? "ok" : "",
                );
              }
            }
          } catch (e) {
            autosaveDirectoryHandle = null;
            autosaveFileHandle = null;
          }
        }
        let old = await restoreAutosave();
        if (old && old.tolgee && Array.isArray(old.rows) && old.rows.length) {
          tolgee = old.tolgee;
          originalTolgeeJson = old.originalTolgeeJson
            ? clone(old.originalTolgeeJson)
            : sourceDocumentFallback(old.tolgee);
          languageConfig = {
            ...languageConfig,
            ...(old.languageConfig || tolgee.review_config || {}),
          };
          syncExactLanguageTagsFromProject(tolgee);
          $("setupBaseLanguage").value = languageConfig.baseCode;
          $("setupTargetLanguage").value = languageConfig.targetCode;
          $("setupToolLanguage").value = languageConfig.toolLanguage;
          applyToolLanguage();
          rows = rowsWithoutScreenshotImages(old.rows).map(normalizePersistedRow);
          currentView =
            old.currentView === "needs"
              ? "pending"
              : old.currentView || "pending";
          $("pageSize").value = String(old.pageSize || 20);
          syncProject();
          document
            .querySelectorAll(".nav[data-view]")
            .forEach((b) =>
              b.classList.toggle("active", b.dataset.view === currentView),
            );
          finishSetup(true);
          notify("Previous local workspace restored.");
        } else {
          applyToolLanguage();
          refreshSetup();
          $("setupWizard").classList.remove("hidden");
          $("appShell").classList.add("hidden");
        }
        render();
      })();
