(() => {
  function B(e, t) {
    let n = t && t.cache ? t.cache : ce,
      i = t && t.serializer ? t.serializer : ae;
    return (t && t.strategy ? t.strategy : re)(e, { cache: n, serializer: i });
  }
  function se(e) {
    return e == null || typeof e == "number" || typeof e == "boolean";
  }
  function G(e, t, n, i) {
    let r = se(i) ? i : n(i),
      s = t.get(r);
    return (typeof s > "u" && ((s = e.call(this, i)), t.set(r, s)), s);
  }
  function U(e, t, n) {
    let i = Array.prototype.slice.call(arguments, 3),
      r = n(i),
      s = t.get(r);
    return (typeof s > "u" && ((s = e.apply(this, i)), t.set(r, s)), s);
  }
  function I(e, t, n, i, r) {
    return n.bind(t, e, i, r);
  }
  function re(e, t) {
    let n = e.length === 1 ? G : U;
    return I(e, this, n, t.cache.create(), t.serializer);
  }
  function oe(e, t) {
    return I(e, this, U, t.cache.create(), t.serializer);
  }
  function he(e, t) {
    return I(e, this, G, t.cache.create(), t.serializer);
  }
  var ae = function () {
      return JSON.stringify(arguments);
    },
    ue = class {
      constructor() {
        this.cache = Object.create(null);
      }
      get(e) {
        return this.cache[e];
      }
      set(e, t) {
        this.cache[e] = t;
      }
    },
    ce = {
      create: function () {
        return new ue();
      },
    },
    d = { variadic: oe, monadic: he };
  var le =
    /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
  function $(e) {
    let t = {};
    return (
      e.replace(le, (n) => {
        let i = n.length;
        switch (n[0]) {
          case "G":
            t.era = i === 4 ? "long" : i === 5 ? "narrow" : "short";
            break;
          case "y":
            t.year = i === 2 ? "2-digit" : "numeric";
            break;
          case "Y":
          case "u":
          case "U":
          case "r":
            throw new RangeError(
              "`Y/u/U/r` (year) patterns are not supported, use `y` instead",
            );
          case "q":
          case "Q":
            throw new RangeError("`q/Q` (quarter) patterns are not supported");
          case "M":
          case "L":
            t.month = ["numeric", "2-digit", "short", "long", "narrow"][i - 1];
            break;
          case "w":
          case "W":
            throw new RangeError("`w/W` (week) patterns are not supported");
          case "d":
            t.day = ["numeric", "2-digit"][i - 1];
            break;
          case "D":
          case "F":
          case "g":
            throw new RangeError(
              "`D/F/g` (day) patterns are not supported, use `d` instead",
            );
          case "E":
            t.weekday = i === 4 ? "long" : i === 5 ? "narrow" : "short";
            break;
          case "e":
            if (i < 4)
              throw new RangeError(
                "`e..eee` (weekday) patterns are not supported",
              );
            t.weekday = ["short", "long", "narrow", "short"][i - 3];
            break;
          case "c":
            if (i < 4)
              throw new RangeError(
                "`c..ccc` (weekday) patterns are not supported",
              );
            t.weekday = ["short", "long", "narrow", "short"][i - 3];
            break;
          case "a":
            t.hour12 = !0;
            break;
          case "b":
          case "B":
            throw new RangeError(
              "`b/B` (period) patterns are not supported, use `a` instead",
            );
          case "h":
            ((t.hourCycle = "h12"), (t.hour = ["numeric", "2-digit"][i - 1]));
            break;
          case "H":
            ((t.hourCycle = "h23"), (t.hour = ["numeric", "2-digit"][i - 1]));
            break;
          case "K":
            ((t.hourCycle = "h11"), (t.hour = ["numeric", "2-digit"][i - 1]));
            break;
          case "k":
            ((t.hourCycle = "h24"), (t.hour = ["numeric", "2-digit"][i - 1]));
            break;
          case "j":
          case "J":
          case "C":
            throw new RangeError(
              "`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead",
            );
          case "m":
            t.minute = ["numeric", "2-digit"][i - 1];
            break;
          case "s":
            t.second = ["numeric", "2-digit"][i - 1];
            break;
          case "S":
          case "A":
            throw new RangeError(
              "`S/A` (second) patterns are not supported, use `s` instead",
            );
          case "z":
            t.timeZoneName = i < 4 ? "short" : "long";
            break;
          case "Z":
          case "O":
          case "v":
          case "V":
          case "X":
          case "x":
            throw new RangeError(
              "`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead",
            );
        }
        return "";
      }),
      t
    );
  }
  var fe = /[\t-\r \x85\u200E\u200F\u2028\u2029]/i;
  function X(e) {
    if (e.length === 0) throw new Error("Number skeleton cannot be empty");
    let t = e.split(fe).filter((i) => i.length > 0),
      n = [];
    for (let i of t) {
      let r = i.split("/");
      if (r.length === 0) throw new Error("Invalid number skeleton");
      let [s, ...l] = r;
      for (let a of l)
        if (a.length === 0) throw new Error("Invalid number skeleton");
      n.push({ stem: s, options: l });
    }
    return n;
  }
  function pe(e) {
    return e.replace(/^(.*?)-/, "");
  }
  var k = /^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,
    j = /^(@+)?(\+|#+)?[rs]?$/g,
    me = /(\*)(0+)|(#+)(0+)|(0+)/g,
    z = /^(0+)$/;
  function x(e) {
    let t = {};
    return (
      e[e.length - 1] === "r"
        ? (t.roundingPriority = "morePrecision")
        : e[e.length - 1] === "s" && (t.roundingPriority = "lessPrecision"),
      e.replace(j, function (n, i, r) {
        return (
          typeof r != "string"
            ? ((t.minimumSignificantDigits = i.length),
              (t.maximumSignificantDigits = i.length))
            : r === "+"
              ? (t.minimumSignificantDigits = i.length)
              : i[0] === "#"
                ? (t.maximumSignificantDigits = i.length)
                : ((t.minimumSignificantDigits = i.length),
                  (t.maximumSignificantDigits =
                    i.length + (typeof r == "string" ? r.length : 0))),
          ""
        );
      }),
      t
    );
  }
  function Z(e) {
    switch (e) {
      case "sign-auto":
        return { signDisplay: "auto" };
      case "sign-accounting":
      case "()":
        return { currencySign: "accounting" };
      case "sign-always":
      case "+!":
        return { signDisplay: "always" };
      case "sign-accounting-always":
      case "()!":
        return { signDisplay: "always", currencySign: "accounting" };
      case "sign-except-zero":
      case "+?":
        return { signDisplay: "exceptZero" };
      case "sign-accounting-except-zero":
      case "()?":
        return { signDisplay: "exceptZero", currencySign: "accounting" };
      case "sign-never":
      case "+_":
        return { signDisplay: "never" };
    }
  }
  function ge(e) {
    let t;
    if (
      (e[0] === "E" && e[1] === "E"
        ? ((t = { notation: "engineering" }), (e = e.slice(2)))
        : e[0] === "E" && ((t = { notation: "scientific" }), (e = e.slice(1))),
      t)
    ) {
      let n = e.slice(0, 2);
      if (
        (n === "+!"
          ? ((t.signDisplay = "always"), (e = e.slice(2)))
          : n === "+?" && ((t.signDisplay = "exceptZero"), (e = e.slice(2))),
        !z.test(e))
      )
        throw new Error("Malformed concise eng/scientific notation");
      t.minimumIntegerDigits = e.length;
    }
    return t;
  }
  function V(e) {
    let t = {},
      n = Z(e);
    return n || t;
  }
  function W(e) {
    let t = {};
    for (let n of e) {
      switch (n.stem) {
        case "percent":
        case "%":
          t.style = "percent";
          continue;
        case "%x100":
          ((t.style = "percent"), (t.scale = 100));
          continue;
        case "currency":
          ((t.style = "currency"), (t.currency = n.options[0]));
          continue;
        case "group-off":
        case ",_":
          t.useGrouping = !1;
          continue;
        case "precision-integer":
        case ".":
          t.maximumFractionDigits = 0;
          continue;
        case "measure-unit":
          ((t.style = "unit"), (t.unit = pe(n.options[0])));
          continue;
        case "unit":
          ((t.style = "unit"), (t.unit = n.options[0]));
          continue;
        case "compact-short":
        case "K":
          ((t.notation = "compact"), (t.compactDisplay = "short"));
          continue;
        case "compact-long":
        case "KK":
          ((t.notation = "compact"), (t.compactDisplay = "long"));
          continue;
        case "scientific":
          t = {
            ...t,
            notation: "scientific",
            ...n.options.reduce((s, l) => ({ ...s, ...V(l) }), {}),
          };
          continue;
        case "engineering":
          t = {
            ...t,
            notation: "engineering",
            ...n.options.reduce((s, l) => ({ ...s, ...V(l) }), {}),
          };
          continue;
        case "notation-simple":
          t.notation = "standard";
          continue;
        case "unit-width-narrow":
          ((t.currencyDisplay = "narrowSymbol"), (t.unitDisplay = "narrow"));
          continue;
        case "unit-width-short":
          ((t.currencyDisplay = "code"), (t.unitDisplay = "short"));
          continue;
        case "unit-width-full-name":
          ((t.currencyDisplay = "name"), (t.unitDisplay = "long"));
          continue;
        case "unit-width-iso-code":
          t.currencyDisplay = "symbol";
          continue;
        case "scale":
          t.scale = parseFloat(n.options[0]);
          continue;
        case "rounding-mode-floor":
          t.roundingMode = "floor";
          continue;
        case "rounding-mode-ceiling":
          t.roundingMode = "ceil";
          continue;
        case "rounding-mode-down":
          t.roundingMode = "trunc";
          continue;
        case "rounding-mode-up":
          t.roundingMode = "expand";
          continue;
        case "rounding-mode-half-even":
          t.roundingMode = "halfEven";
          continue;
        case "rounding-mode-half-down":
          t.roundingMode = "halfTrunc";
          continue;
        case "rounding-mode-half-up":
          t.roundingMode = "halfExpand";
          continue;
        case "integer-width":
          if (n.options.length > 1)
            throw new RangeError(
              "integer-width stems only accept a single optional option",
            );
          n.options[0].replace(me, function (s, l, a, o, c, h) {
            if (l) t.minimumIntegerDigits = a.length;
            else {
              if (o && c)
                throw new Error(
                  "We currently do not support maximum integer digits",
                );
              if (h)
                throw new Error(
                  "We currently do not support exact integer digits",
                );
            }
            return "";
          });
          continue;
      }
      if (z.test(n.stem)) {
        t.minimumIntegerDigits = n.stem.length;
        continue;
      }
      if (k.test(n.stem)) {
        if (n.options.length > 1)
          throw new RangeError(
            "Fraction-precision stems only accept a single optional option",
          );
        n.stem.replace(k, function (l, a, o, c, h, u) {
          return (
            o === "*"
              ? (t.minimumFractionDigits = a.length)
              : c && c[0] === "#"
                ? (t.maximumFractionDigits = c.length)
                : h && u
                  ? ((t.minimumFractionDigits = h.length),
                    (t.maximumFractionDigits = h.length + u.length))
                  : ((t.minimumFractionDigits = a.length),
                    (t.maximumFractionDigits = a.length)),
            ""
          );
        });
        let s = n.options[0];
        s === "w"
          ? (t = { ...t, trailingZeroDisplay: "stripIfInteger" })
          : s && (t = { ...t, ...x(s) });
        continue;
      }
      if (j.test(n.stem)) {
        t = { ...t, ...x(n.stem) };
        continue;
      }
      let i = Z(n.stem);
      i && (t = { ...t, ...i });
      let r = ge(n.stem);
      r && (t = { ...t, ...r });
    }
    return t;
  }
  var be = (function (e) {
    return (
      (e[(e.EXPECT_ARGUMENT_CLOSING_BRACE = 1)] =
        "EXPECT_ARGUMENT_CLOSING_BRACE"),
      (e[(e.EMPTY_ARGUMENT = 2)] = "EMPTY_ARGUMENT"),
      (e[(e.MALFORMED_ARGUMENT = 3)] = "MALFORMED_ARGUMENT"),
      (e[(e.EXPECT_ARGUMENT_TYPE = 4)] = "EXPECT_ARGUMENT_TYPE"),
      (e[(e.INVALID_ARGUMENT_TYPE = 5)] = "INVALID_ARGUMENT_TYPE"),
      (e[(e.EXPECT_ARGUMENT_STYLE = 6)] = "EXPECT_ARGUMENT_STYLE"),
      (e[(e.INVALID_NUMBER_SKELETON = 7)] = "INVALID_NUMBER_SKELETON"),
      (e[(e.INVALID_DATE_TIME_SKELETON = 8)] = "INVALID_DATE_TIME_SKELETON"),
      (e[(e.EXPECT_NUMBER_SKELETON = 9)] = "EXPECT_NUMBER_SKELETON"),
      (e[(e.EXPECT_DATE_TIME_SKELETON = 10)] = "EXPECT_DATE_TIME_SKELETON"),
      (e[(e.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE = 11)] =
        "UNCLOSED_QUOTE_IN_ARGUMENT_STYLE"),
      (e[(e.EXPECT_SELECT_ARGUMENT_OPTIONS = 12)] =
        "EXPECT_SELECT_ARGUMENT_OPTIONS"),
      (e[(e.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE = 13)] =
        "EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE"),
      (e[(e.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE = 14)] =
        "INVALID_PLURAL_ARGUMENT_OFFSET_VALUE"),
      (e[(e.EXPECT_SELECT_ARGUMENT_SELECTOR = 15)] =
        "EXPECT_SELECT_ARGUMENT_SELECTOR"),
      (e[(e.EXPECT_PLURAL_ARGUMENT_SELECTOR = 16)] =
        "EXPECT_PLURAL_ARGUMENT_SELECTOR"),
      (e[(e.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT = 17)] =
        "EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT"),
      (e[(e.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT = 18)] =
        "EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT"),
      (e[(e.INVALID_PLURAL_ARGUMENT_SELECTOR = 19)] =
        "INVALID_PLURAL_ARGUMENT_SELECTOR"),
      (e[(e.DUPLICATE_PLURAL_ARGUMENT_SELECTOR = 20)] =
        "DUPLICATE_PLURAL_ARGUMENT_SELECTOR"),
      (e[(e.DUPLICATE_SELECT_ARGUMENT_SELECTOR = 21)] =
        "DUPLICATE_SELECT_ARGUMENT_SELECTOR"),
      (e[(e.MISSING_OTHER_CLAUSE = 22)] = "MISSING_OTHER_CLAUSE"),
      (e[(e.INVALID_TAG = 23)] = "INVALID_TAG"),
      (e[(e.INVALID_TAG_NAME = 25)] = "INVALID_TAG_NAME"),
      (e[(e.UNMATCHED_CLOSING_TAG = 26)] = "UNMATCHED_CLOSING_TAG"),
      (e[(e.UNCLOSED_TAG = 27)] = "UNCLOSED_TAG"),
      e
    );
  })({});
  function N(e) {
    return e.type === 0;
  }
  function q(e) {
    return e.type === 1;
  }
  function L(e) {
    return e.type === 2;
  }
  function w(e) {
    return e.type === 3;
  }
  function R(e) {
    return e.type === 4;
  }
  function C(e) {
    return e.type === 5;
  }
  function O(e) {
    return e.type === 6;
  }
  function Y(e) {
    return e.type === 7;
  }
  function M(e) {
    return e.type === 8;
  }
  function v(e) {
    return !!(e && typeof e == "object" && e.type === 0);
  }
  function S(e) {
    return !!(e && typeof e == "object" && e.type === 1);
  }
  var K = /[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,
    Ee =
      /([^\t-\r -\/:-@\[-\^`\{-~\x85\xA0-\xA7\xA9\xAB\xAC\xAE\xB0\xB1\xB6\xBB\xBF\xD7\xF7\u1680\u2000-\u200A\u2010-\u2029\u202F-\u203E\u2041-\u2053\u2055-\u205F\u2190-\u245F\u2500-\u2775\u2794-\u2BFF\u2E00-\u2E7F\u3000-\u3003\u3008-\u3020\u3030\uFD3E\uFD3F\uFE45\uFE46]*)/g,
    y = {
      "001": ["H", "h"],
      419: ["h", "H", "hB", "hb"],
      AC: ["H", "h", "hb", "hB"],
      AD: ["H", "hB"],
      AE: ["h", "hB", "hb", "H"],
      AF: ["H", "hb", "hB", "h"],
      AG: ["h", "hb", "H", "hB"],
      AI: ["H", "h", "hb", "hB"],
      AL: ["h", "H", "hB"],
      AM: ["H", "hB"],
      AO: ["H", "hB"],
      AR: ["H", "h", "hB", "hb"],
      AS: ["h", "H"],
      AT: ["H", "hB"],
      AU: ["h", "hb", "H", "hB"],
      AW: ["H", "hB"],
      AX: ["H"],
      AZ: ["H", "hB", "h"],
      BA: ["H", "hB", "h"],
      BB: ["h", "hb", "H", "hB"],
      BD: ["h", "hB", "H"],
      BE: ["H", "hB"],
      BF: ["H", "hB"],
      BG: ["H", "hB", "h"],
      BH: ["h", "hB", "hb", "H"],
      BI: ["H", "h"],
      BJ: ["H", "hB"],
      BL: ["H", "hB"],
      BM: ["h", "hb", "H", "hB"],
      BN: ["hb", "hB", "h", "H"],
      BO: ["h", "H", "hB", "hb"],
      BQ: ["H"],
      BR: ["H", "hB"],
      BS: ["h", "hb", "H", "hB"],
      BT: ["h", "H"],
      BW: ["H", "h", "hb", "hB"],
      BY: ["H", "h"],
      BZ: ["H", "h", "hb", "hB"],
      CA: ["h", "hb", "H", "hB"],
      CC: ["H", "h", "hb", "hB"],
      CD: ["hB", "H"],
      CF: ["H", "h", "hB"],
      CG: ["H", "hB"],
      CH: ["H", "hB", "h"],
      CI: ["H", "hB"],
      CK: ["H", "h", "hb", "hB"],
      CL: ["H", "h", "hB", "hb"],
      CM: ["H", "h", "hB"],
      CN: ["H", "hB", "hb", "h"],
      CO: ["h", "H", "hB", "hb"],
      CP: ["H"],
      CR: ["h", "H", "hB", "hb"],
      CU: ["h", "H", "hB", "hb"],
      CV: ["H", "hB"],
      CW: ["H", "hB"],
      CX: ["H", "h", "hb", "hB"],
      CY: ["h", "H", "hb", "hB"],
      CZ: ["H"],
      DE: ["H", "hB"],
      DG: ["H", "h", "hb", "hB"],
      DJ: ["h", "H"],
      DK: ["H"],
      DM: ["h", "hb", "H", "hB"],
      DO: ["h", "H", "hB", "hb"],
      DZ: ["h", "hB", "hb", "H"],
      EA: ["H", "h", "hB", "hb"],
      EC: ["h", "H", "hB", "hb"],
      EE: ["H", "hB"],
      EG: ["h", "hB", "hb", "H"],
      EH: ["h", "hB", "hb", "H"],
      ER: ["h", "H"],
      ES: ["H", "hB", "h", "hb"],
      ET: ["hB", "hb", "h", "H"],
      FI: ["H"],
      FJ: ["h", "hb", "H", "hB"],
      FK: ["H", "h", "hb", "hB"],
      FM: ["h", "hb", "H", "hB"],
      FO: ["H", "h"],
      FR: ["H", "hB"],
      GA: ["H", "hB"],
      GB: ["H", "h", "hb", "hB"],
      GD: ["h", "hb", "H", "hB"],
      GE: ["H", "hB", "h"],
      GF: ["H", "hB"],
      GG: ["H", "h", "hb", "hB"],
      GH: ["h", "H"],
      GI: ["H", "h", "hb", "hB"],
      GL: ["H", "h"],
      GM: ["h", "hb", "H", "hB"],
      GN: ["H", "hB"],
      GP: ["H", "hB"],
      GQ: ["H", "hB", "h", "hb"],
      GR: ["h", "H", "hb", "hB"],
      GS: ["H", "h", "hb", "hB"],
      GT: ["h", "H", "hB", "hb"],
      GU: ["h", "hb", "H", "hB"],
      GW: ["H", "hB"],
      GY: ["h", "hb", "H", "hB"],
      HK: ["h", "hB", "hb", "H"],
      HN: ["h", "H", "hB", "hb"],
      HR: ["H", "hB"],
      HT: ["H", "hB"],
      HU: ["H", "h"],
      IC: ["H", "h", "hB", "hb"],
      ID: ["H"],
      IE: ["H", "h", "hb", "hB"],
      IL: ["H", "hB"],
      IM: ["H", "h", "hb", "hB"],
      IN: ["h", "H"],
      IO: ["H", "h", "hb", "hB"],
      IQ: ["h", "hB", "hb", "H"],
      IR: ["hB", "H"],
      IS: ["H"],
      IT: ["H", "hB"],
      JE: ["H", "h", "hb", "hB"],
      JM: ["h", "hb", "H", "hB"],
      JO: ["h", "hB", "hb", "H"],
      JP: ["H", "K", "h"],
      KE: ["hB", "hb", "H", "h"],
      KG: ["H", "h", "hB", "hb"],
      KH: ["hB", "h", "H", "hb"],
      KI: ["h", "hb", "H", "hB"],
      KM: ["H", "h", "hB", "hb"],
      KN: ["h", "hb", "H", "hB"],
      KP: ["h", "H", "hB", "hb"],
      KR: ["h", "H", "hB", "hb"],
      KW: ["h", "hB", "hb", "H"],
      KY: ["h", "hb", "H", "hB"],
      KZ: ["H", "hB"],
      LA: ["H", "hb", "hB", "h"],
      LB: ["h", "hB", "hb", "H"],
      LC: ["h", "hb", "H", "hB"],
      LI: ["H", "hB", "h"],
      LK: ["H", "h", "hB", "hb"],
      LR: ["h", "hb", "H", "hB"],
      LS: ["h", "H"],
      LT: ["H", "h", "hb", "hB"],
      LU: ["H", "h", "hB"],
      LV: ["H", "hB", "hb", "h"],
      LY: ["h", "hB", "hb", "H"],
      MA: ["H", "h", "hB", "hb"],
      MC: ["H", "hB"],
      MD: ["H", "hB"],
      ME: ["H", "hB", "h"],
      MF: ["H", "hB"],
      MG: ["H", "h"],
      MH: ["h", "hb", "H", "hB"],
      MK: ["H", "h", "hb", "hB"],
      ML: ["H"],
      MM: ["hB", "hb", "H", "h"],
      MN: ["H", "h", "hb", "hB"],
      MO: ["h", "hB", "hb", "H"],
      MP: ["h", "hb", "H", "hB"],
      MQ: ["H", "hB"],
      MR: ["h", "hB", "hb", "H"],
      MS: ["H", "h", "hb", "hB"],
      MT: ["H", "h"],
      MU: ["H", "h"],
      MV: ["H", "h"],
      MW: ["h", "hb", "H", "hB"],
      MX: ["h", "H", "hB", "hb"],
      MY: ["hb", "hB", "h", "H"],
      MZ: ["H", "hB"],
      NA: ["h", "H", "hB", "hb"],
      NC: ["H", "hB"],
      NE: ["H"],
      NF: ["H", "h", "hb", "hB"],
      NG: ["H", "h", "hb", "hB"],
      NI: ["h", "H", "hB", "hb"],
      NL: ["H", "hB"],
      NO: ["H", "h"],
      NP: ["H", "h", "hB"],
      NR: ["H", "h", "hb", "hB"],
      NU: ["H", "h", "hb", "hB"],
      NZ: ["h", "hb", "H", "hB"],
      OM: ["h", "hB", "hb", "H"],
      PA: ["h", "H", "hB", "hb"],
      PE: ["h", "H", "hB", "hb"],
      PF: ["H", "h", "hB"],
      PG: ["h", "H"],
      PH: ["h", "hB", "hb", "H"],
      PK: ["h", "hB", "H"],
      PL: ["H", "h"],
      PM: ["H", "hB"],
      PN: ["H", "h", "hb", "hB"],
      PR: ["h", "H", "hB", "hb"],
      PS: ["h", "hB", "hb", "H"],
      PT: ["H", "hB"],
      PW: ["h", "H"],
      PY: ["H", "h", "hB", "hb"],
      QA: ["h", "hB", "hb", "H"],
      RE: ["H", "hB"],
      RO: ["H", "hB"],
      RS: ["H", "hB", "h"],
      RU: ["H"],
      RW: ["hB", "hb", "H", "h"],
      SA: ["h", "hB", "hb", "H"],
      SB: ["h", "hb", "H", "hB"],
      SC: ["H", "h", "hB"],
      SD: ["h", "hB", "hb", "H"],
      SE: ["H"],
      SG: ["h", "hb", "H", "hB"],
      SH: ["H", "h", "hb", "hB"],
      SI: ["H", "hB"],
      SJ: ["H"],
      SK: ["H"],
      SL: ["h", "hb", "H", "hB"],
      SM: ["H", "h", "hB"],
      SN: ["H", "h", "hB"],
      SO: ["h", "H"],
      SR: ["H", "hB"],
      SS: ["h", "hb", "H", "hB"],
      ST: ["H", "hB"],
      SV: ["h", "H", "hB", "hb"],
      SX: ["H", "h", "hb", "hB"],
      SY: ["h", "hB", "hb", "H"],
      SZ: ["h", "hb", "H", "hB"],
      TA: ["H", "h", "hb", "hB"],
      TC: ["h", "hb", "H", "hB"],
      TD: ["h", "H", "hB"],
      TF: ["H", "h", "hB"],
      TG: ["H", "hB"],
      TH: ["H", "h"],
      TJ: ["H", "h"],
      TL: ["H", "hB", "hb", "h"],
      TM: ["H", "h"],
      TN: ["h", "hB", "hb", "H"],
      TO: ["h", "H"],
      TR: ["H", "hB"],
      TT: ["h", "hb", "H", "hB"],
      TW: ["hB", "hb", "h", "H"],
      TZ: ["hB", "hb", "H", "h"],
      UA: ["H", "hB", "h"],
      UG: ["hB", "hb", "H", "h"],
      UM: ["h", "hb", "H", "hB"],
      US: ["h", "hb", "H", "hB"],
      UY: ["H", "h", "hB", "hb"],
      UZ: ["H", "hB", "h"],
      VA: ["H", "h", "hB"],
      VC: ["h", "hb", "H", "hB"],
      VE: ["h", "H", "hB", "hb"],
      VG: ["h", "hb", "H", "hB"],
      VI: ["h", "hb", "H", "hB"],
      VN: ["H", "h"],
      VU: ["h", "H"],
      WF: ["H", "hB"],
      WS: ["h", "H"],
      XK: ["H", "hB", "h"],
      YE: ["h", "hB", "hb", "H"],
      YT: ["H", "hB"],
      ZA: ["H", "h", "hb", "hB"],
      ZM: ["H", "hB"],
      ZW: ["H", "h"],
      "af-ZA": ["H", "h", "hB", "hb"],
      "ar-001": ["h", "hB", "hb", "H"],
      "ca-ES": ["H", "h", "hB"],
      "en-001": ["h", "hb", "H", "hB"],
      "en-HK": ["h", "hb", "H", "hB"],
      "en-IL": ["H", "h", "hb", "hB"],
      "en-MY": ["h", "hb", "H", "hB"],
      "es-BR": ["H", "h", "hB", "hb"],
      "es-ES": ["H", "h", "hB", "hb"],
      "es-GQ": ["H", "h", "hB", "hb"],
      "fr-CA": ["H", "h", "hB"],
      "gl-ES": ["H", "h", "hB"],
      "gu-IN": ["hB", "hb", "h", "H"],
      "hi-IN": ["hB", "h", "H"],
      "it-CH": ["H", "h", "hB"],
      "it-IT": ["H", "h", "hB"],
      "kn-IN": ["hB", "h", "H"],
      "ku-SY": ["H", "hB"],
      "ml-IN": ["hB", "h", "H"],
      "mr-IN": ["hB", "hb", "h", "H"],
      "pa-IN": ["hB", "hb", "h", "H"],
      "ta-IN": ["hB", "h", "hb", "H"],
      "te-IN": ["hB", "h", "H"],
      "zu-ZA": ["H", "hB", "hb", "h"],
    };
  function He(e, t) {
    let n = "";
    for (let i = 0; i < e.length; i++) {
      let r = e.charAt(i);
      if (r === "j") {
        let s = 0;
        for (; i + 1 < e.length && e.charAt(i + 1) === r; ) (s++, i++);
        let l = 1 + (s & 1),
          a = s < 2 ? 1 : 3 + (s >> 1),
          o = "a",
          c = ye(t);
        for ((c == "H" || c == "k") && (a = 0); a-- > 0; ) n += o;
        for (; l-- > 0; ) n = c + n;
      } else r === "J" ? (n += "H") : (n += r);
    }
    return n;
  }
  function ye(e) {
    let t = e.hourCycle;
    if (t === void 0) {
      let r = e;
      t = r.getHourCycles?.()[0] ?? r.hourCycles?.[0];
    }
    if (t)
      switch (t) {
        case "h24":
          return "k";
        case "h23":
          return "H";
        case "h12":
          return "h";
        case "h11":
          return "K";
        default:
          throw new Error("Invalid hourCycle");
      }
    let n = e.language,
      i;
    return (
      n !== "root" && (i = e.maximize().region),
      (y[`${n}-${i}`] ||
        y[i || ""] ||
        y[n || ""] ||
        y[`${n}-001`] ||
        y["001"])[0].charAt(0)
    );
  }
  var Be = new RegExp(`^${K.source}*`),
    de = new RegExp(`${K.source}*$`);
  function f(e, t) {
    return { start: e, end: t };
  }
  var Se = !!Object.fromEntries,
    Te = !!String.prototype.trimStart,
    Ae = !!String.prototype.trimEnd,
    Q = Se
      ? Object.fromEntries
      : function (t) {
          let n = {};
          for (let [i, r] of t) n[i] = r;
          return n;
        },
    Ie = Te
      ? function (t) {
          return t.trimStart();
        }
      : function (t) {
          return t.replace(Be, "");
        },
    Pe = Ae
      ? function (t) {
          return t.trimEnd();
        }
      : function (t) {
          return t.replace(de, "");
        },
    J = _e();
  function _e() {
    try {
      let e = new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu");
      if (e.exec("a ")?.[1] === "a") return e;
    } catch {}
    return Ee;
  }
  function Ne(e, t) {
    return ((J.lastIndex = t), J.exec(e)[1] ?? "");
  }
  function Le(e) {
    if (e.length === 0) return null;
    let t = 1,
      n = 1;
    for (let i = 0; i < e.length; ) {
      let r = e.charCodeAt(i);
      switch (r) {
        case 35:
        case 39:
        case 60:
        case 123:
        case 125:
          return null;
      }
      if (r === 10) (t++, (n = 1), i++);
      else if ((n++, r >= 55296 && r <= 56319 && i + 1 < e.length)) {
        let s = e.charCodeAt(i + 1);
        i += s >= 56320 && s <= 57343 ? 2 : 1;
      } else i++;
    }
    return { offset: e.length, line: t, column: n };
  }
  var we = class {
    constructor(e, t = {}) {
      ((this.message = e),
        (this.position = { offset: 0, line: 1, column: 1 }),
        (this.ignoreTag = !!t.ignoreTag),
        (this.locale = t.locale),
        (this.requiresOtherClause = !!t.requiresOtherClause),
        (this.shouldParseSkeletons = !!t.shouldParseSkeletons),
        (this.captureEscapes = !!t.captureEscapes));
    }
    parse() {
      if (this.offset() !== 0) throw Error("parser can only be used once");
      if (this.message.length > 0) {
        let e = this.message.charCodeAt(0);
        if (e !== 35 && e !== 39 && e !== 60 && e !== 123 && e !== 125) {
          let t = Le(this.message);
          if (t) {
            let n = this.clonePosition();
            return (
              (this.position = t),
              {
                val: [
                  {
                    type: 0,
                    value: this.message,
                    ...(this.captureEscapes && { rawValue: this.message }),
                    location: f(n, this.clonePosition()),
                  },
                ],
                err: null,
              }
            );
          }
        }
      }
      return this.parseMessage(0, "", !1);
    }
    parseMessage(e, t, n) {
      let i = [];
      for (; !this.isEOF(); ) {
        let r = this.char();
        if (r === 123) {
          let s = this.parseArgument(e, n);
          if (s.err) return s;
          i.push(s.val);
        } else {
          if (r === 125 && e > 0) break;
          if (r === 35 && (t === "plural" || t === "selectordinal")) {
            let s = this.clonePosition();
            (this.bump(),
              i.push({ type: 7, location: f(s, this.clonePosition()) }));
          } else if (r === 60 && !this.ignoreTag && this.peek() === 47) {
            if (n) break;
            return this.error(
              26,
              f(this.clonePosition(), this.clonePosition()),
            );
          } else if (r === 60 && !this.ignoreTag && P(this.peek() || 0)) {
            let s = this.parseTag(e, t);
            if (s.err) return s;
            i.push(s.val);
          } else {
            let s = this.parseLiteral(e, t);
            if (s.err) return s;
            i.push(s.val);
          }
        }
      }
      return { val: i, err: null };
    }
    parseTag(e, t) {
      let n = this.clonePosition();
      this.bump();
      let i = this.parseTagName();
      if ((this.bumpSpace(), this.bumpIf("/>")))
        return {
          val: {
            type: 0,
            value: `<${i}/>`,
            location: f(n, this.clonePosition()),
          },
          err: null,
        };
      if (this.bumpIf(">")) {
        let r = this.parseMessage(e + 1, t, !0);
        if (r.err) return r;
        let s = r.val,
          l = this.clonePosition();
        if (this.bumpIf("</")) {
          if (this.isEOF() || !P(this.char()))
            return this.error(23, f(l, this.clonePosition()));
          let a = this.clonePosition();
          return i !== this.parseTagName()
            ? this.error(26, f(a, this.clonePosition()))
            : (this.bumpSpace(),
              this.bumpIf(">")
                ? {
                    val: {
                      type: 8,
                      value: i,
                      children: s,
                      location: f(n, this.clonePosition()),
                    },
                    err: null,
                  }
                : this.error(23, f(l, this.clonePosition())));
        } else return this.error(27, f(n, this.clonePosition()));
      } else return this.error(23, f(n, this.clonePosition()));
    }
    parseTagName() {
      let e = this.offset();
      for (this.bump(); !this.isEOF() && Ce(this.char()); ) this.bump();
      return this.message.slice(e, this.offset());
    }
    parseLiteral(e, t) {
      let n = this.clonePosition(),
        i = "";
      for (;;) {
        let s = this.tryParseQuote(t);
        if (s) {
          i += s;
          continue;
        }
        let l = this.tryParseUnquoted(e, t);
        if (l) {
          i += l;
          continue;
        }
        let a = this.tryParseLeftAngleBracket();
        if (a) {
          i += a;
          continue;
        }
        break;
      }
      let r = f(n, this.clonePosition());
      return {
        val: {
          type: 0,
          value: i,
          location: r,
          ...(this.captureEscapes && {
            rawValue: this.message.slice(n.offset, this.offset()),
          }),
        },
        err: null,
      };
    }
    tryParseLeftAngleBracket() {
      return !this.isEOF() &&
        this.char() === 60 &&
        (this.ignoreTag || !Re(this.peek() || 0))
        ? (this.bump(), "<")
        : null;
    }
    tryParseQuote(e) {
      if (this.isEOF() || this.char() !== 39) return null;
      switch (this.peek()) {
        case 39:
          return (this.bump(), this.bump(), "'");
        case 123:
        case 60:
        case 62:
        case 125:
          break;
        case 35:
          if (e === "plural" || e === "selectordinal") break;
          return null;
        default:
          return null;
      }
      this.bump();
      let t = [this.char()];
      for (this.bump(); !this.isEOF(); ) {
        let n = this.char();
        if (n === 39)
          if (this.peek() === 39) (t.push(39), this.bump());
          else {
            this.bump();
            break;
          }
        else t.push(n);
        this.bump();
      }
      return String.fromCodePoint(...t);
    }
    tryParseUnquoted(e, t) {
      if (this.isEOF()) return null;
      let n = this.char();
      return n === 60 ||
        n === 123 ||
        (n === 35 && (t === "plural" || t === "selectordinal")) ||
        (n === 125 && e > 0)
        ? null
        : (this.bump(), String.fromCodePoint(n));
    }
    parseArgument(e, t) {
      let n = this.clonePosition();
      if ((this.bump(), this.bumpSpace(), this.isEOF()))
        return this.error(1, f(n, this.clonePosition()));
      if (this.char() === 125)
        return (this.bump(), this.error(2, f(n, this.clonePosition())));
      let i = this.parseIdentifierIfPossible().value;
      if (!i) return this.error(3, f(n, this.clonePosition()));
      if ((this.bumpSpace(), this.isEOF()))
        return this.error(1, f(n, this.clonePosition()));
      switch (this.char()) {
        case 125:
          return (
            this.bump(),
            {
              val: { type: 1, value: i, location: f(n, this.clonePosition()) },
              err: null,
            }
          );
        case 44:
          return (
            this.bump(),
            this.bumpSpace(),
            this.isEOF()
              ? this.error(1, f(n, this.clonePosition()))
              : this.parseArgumentOptions(e, t, i, n)
          );
        default:
          return this.error(3, f(n, this.clonePosition()));
      }
    }
    parseIdentifierIfPossible() {
      let e = this.clonePosition(),
        t = this.offset(),
        n = Ne(this.message, t),
        i = t + n.length;
      return (
        this.bumpTo(i),
        { value: n, location: f(e, this.clonePosition()) }
      );
    }
    parseArgumentOptions(e, t, n, i) {
      let r = this.clonePosition(),
        s = this.parseIdentifierIfPossible().value,
        l = this.clonePosition();
      switch (s) {
        case "":
          return this.error(4, f(r, l));
        case "number":
        case "date":
        case "time": {
          this.bumpSpace();
          let a = null;
          if (this.bumpIf(",")) {
            this.bumpSpace();
            let h = this.clonePosition(),
              u = this.parseSimpleArgStyleIfPossible();
            if (u.err) return u;
            let p = Pe(u.val);
            if (p.length === 0)
              return this.error(
                6,
                f(this.clonePosition(), this.clonePosition()),
              );
            a = { style: p, styleLocation: f(h, this.clonePosition()) };
          }
          let o = this.tryParseArgumentClose(i);
          if (o.err) return o;
          let c = f(i, this.clonePosition());
          if (a && a.style.startsWith("::")) {
            let h = Ie(a.style.slice(2));
            if (s === "number") {
              let u = this.parseNumberSkeletonFromString(h, a.styleLocation);
              return u.err
                ? u
                : {
                    val: { type: 2, value: n, location: c, style: u.val },
                    err: null,
                  };
            } else {
              if (h.length === 0) return this.error(10, c);
              let u = h;
              this.locale && (u = He(h, this.locale));
              let p = {
                type: 1,
                pattern: u,
                location: a.styleLocation,
                parsedOptions: this.shouldParseSkeletons ? $(u) : {},
              };
              return {
                val: {
                  type: s === "date" ? 3 : 4,
                  value: n,
                  location: c,
                  style: p,
                },
                err: null,
              };
            }
          }
          return {
            val: {
              type: s === "number" ? 2 : s === "date" ? 3 : 4,
              value: n,
              location: c,
              style: a?.style ?? null,
            },
            err: null,
          };
        }
        case "plural":
        case "selectordinal":
        case "select": {
          let a = this.clonePosition();
          if ((this.bumpSpace(), !this.bumpIf(",")))
            return this.error(12, f(a, { ...a }));
          this.bumpSpace();
          let o = this.parseIdentifierIfPossible(),
            c = 0;
          if (s !== "select" && o.value === "offset") {
            if (!this.bumpIf(":"))
              return this.error(
                13,
                f(this.clonePosition(), this.clonePosition()),
              );
            this.bumpSpace();
            let m = this.tryParseDecimalInteger(13, 14);
            if (m.err) return m;
            (this.bumpSpace(),
              (o = this.parseIdentifierIfPossible()),
              (c = m.val));
          }
          let h = this.tryParsePluralOrSelectOptions(e, s, t, o);
          if (h.err) return h;
          let u = this.tryParseArgumentClose(i);
          if (u.err) return u;
          let p = f(i, this.clonePosition());
          return s === "select"
            ? {
                val: { type: 5, value: n, options: Q(h.val), location: p },
                err: null,
              }
            : {
                val: {
                  type: 6,
                  value: n,
                  options: Q(h.val),
                  offset: c,
                  pluralType: s === "plural" ? "cardinal" : "ordinal",
                  location: p,
                },
                err: null,
              };
        }
        default:
          return this.error(5, f(r, l));
      }
    }
    tryParseArgumentClose(e) {
      return this.isEOF() || this.char() !== 125
        ? this.error(1, f(e, this.clonePosition()))
        : (this.bump(), { val: !0, err: null });
    }
    parseSimpleArgStyleIfPossible() {
      let e = 0,
        t = this.clonePosition();
      for (; !this.isEOF(); )
        switch (this.char()) {
          case 39: {
            this.bump();
            let n = this.clonePosition();
            if (!this.bumpUntil("'"))
              return this.error(11, f(n, this.clonePosition()));
            this.bump();
            break;
          }
          case 123:
            ((e += 1), this.bump());
            break;
          case 125:
            if (e > 0) e -= 1;
            else
              return {
                val: this.message.slice(t.offset, this.offset()),
                err: null,
              };
            break;
          default:
            this.bump();
        }
      return { val: this.message.slice(t.offset, this.offset()), err: null };
    }
    parseNumberSkeletonFromString(e, t) {
      let n = [];
      try {
        n = X(e);
      } catch {
        return this.error(7, t);
      }
      return {
        val: {
          type: 0,
          tokens: n,
          location: t,
          parsedOptions: this.shouldParseSkeletons ? W(n) : {},
        },
        err: null,
      };
    }
    tryParsePluralOrSelectOptions(e, t, n, i) {
      let r = !1,
        s = [],
        l = new Set(),
        { value: a, location: o } = i;
      for (;;) {
        if (a.length === 0) {
          let p = this.clonePosition();
          if (t !== "select" && this.bumpIf("=")) {
            let m = this.tryParseDecimalInteger(16, 19);
            if (m.err) return m;
            ((o = f(p, this.clonePosition())),
              (a = this.message.slice(p.offset, this.offset())));
          } else break;
        }
        if (l.has(a)) return this.error(t === "select" ? 21 : 20, o);
        (a === "other" && (r = !0), this.bumpSpace());
        let c = this.clonePosition();
        if (!this.bumpIf("{"))
          return this.error(
            t === "select" ? 17 : 18,
            f(this.clonePosition(), this.clonePosition()),
          );
        let h = this.parseMessage(e + 1, t, n);
        if (h.err) return h;
        let u = this.tryParseArgumentClose(c);
        if (u.err) return u;
        (s.push([a, { value: h.val, location: f(c, this.clonePosition()) }]),
          l.add(a),
          this.bumpSpace(),
          ({ value: a, location: o } = this.parseIdentifierIfPossible()));
      }
      return s.length === 0
        ? this.error(
            t === "select" ? 15 : 16,
            f(this.clonePosition(), this.clonePosition()),
          )
        : this.requiresOtherClause && !r
          ? this.error(22, f(this.clonePosition(), this.clonePosition()))
          : { val: s, err: null };
    }
    tryParseDecimalInteger(e, t) {
      let n = 1,
        i = this.clonePosition();
      this.bumpIf("+") || (this.bumpIf("-") && (n = -1));
      let r = !1,
        s = 0;
      for (; !this.isEOF(); ) {
        let a = this.char();
        if (a >= 48 && a <= 57)
          ((r = !0), (s = s * 10 + (a - 48)), this.bump());
        else break;
      }
      let l = f(i, this.clonePosition());
      return r
        ? ((s *= n),
          Number.isSafeInteger(s) ? { val: s, err: null } : this.error(t, l))
        : this.error(e, l);
    }
    offset() {
      return this.position.offset;
    }
    isEOF() {
      return this.offset() === this.message.length;
    }
    clonePosition() {
      return {
        offset: this.position.offset,
        line: this.position.line,
        column: this.position.column,
      };
    }
    char() {
      let e = this.position.offset;
      if (e >= this.message.length) throw Error("out of bound");
      let t = this.message.codePointAt(e);
      if (t === void 0)
        throw Error(`Offset ${e} is at invalid UTF-16 code unit boundary`);
      return t;
    }
    error(e, t) {
      return {
        val: null,
        err: { kind: e, message: this.message, location: t },
      };
    }
    bump() {
      if (this.isEOF()) return;
      let e = this.char();
      e === 10
        ? ((this.position.line += 1),
          (this.position.column = 1),
          (this.position.offset += 1))
        : ((this.position.column += 1),
          (this.position.offset += e < 65536 ? 1 : 2));
    }
    bumpIf(e) {
      let t = this.offset();
      if (this.message.slice(t, t + e.length) === e) {
        for (let n = 0; n < e.length; n++) this.bump();
        return !0;
      }
      return !1;
    }
    bumpUntil(e) {
      let t = this.offset(),
        n = this.message.indexOf(e, t);
      return n >= 0
        ? (this.bumpTo(n), !0)
        : (this.bumpTo(this.message.length), !1);
    }
    bumpTo(e) {
      if (this.offset() > e)
        throw Error(
          `targetOffset ${e} must be greater than or equal to the current offset ${this.offset()}`,
        );
      for (e = Math.min(e, this.message.length); ; ) {
        let t = this.offset();
        if (t === e) break;
        if (t > e)
          throw Error(
            `targetOffset ${e} is at invalid UTF-16 code unit boundary`,
          );
        if ((this.bump(), this.isEOF())) break;
      }
    }
    bumpSpace() {
      for (; !this.isEOF() && Oe(this.char()); ) this.bump();
    }
    peek() {
      if (this.isEOF()) return null;
      let e = this.char(),
        t = this.offset();
      return this.message.charCodeAt(t + (e >= 65536 ? 2 : 1)) ?? null;
    }
  };
  function P(e) {
    return (e >= 97 && e <= 122) || (e >= 65 && e <= 90);
  }
  function Re(e) {
    return P(e) || e === 47;
  }
  function Ce(e) {
    return (
      e === 45 ||
      e === 46 ||
      (e >= 48 && e <= 57) ||
      e === 95 ||
      (e >= 97 && e <= 122) ||
      (e >= 65 && e <= 90) ||
      e == 183 ||
      (e >= 192 && e <= 214) ||
      (e >= 216 && e <= 246) ||
      (e >= 248 && e <= 893) ||
      (e >= 895 && e <= 8191) ||
      (e >= 8204 && e <= 8205) ||
      (e >= 8255 && e <= 8256) ||
      (e >= 8304 && e <= 8591) ||
      (e >= 11264 && e <= 12271) ||
      (e >= 12289 && e <= 55295) ||
      (e >= 63744 && e <= 64975) ||
      (e >= 65008 && e <= 65533) ||
      (e >= 65536 && e <= 983039)
    );
  }
  function Oe(e) {
    return (
      (e >= 9 && e <= 13) ||
      e === 32 ||
      e === 133 ||
      (e >= 8206 && e <= 8207) ||
      e === 8232 ||
      e === 8233
    );
  }
  function _(e) {
    e.forEach((t) => {
      if ((delete t.location, C(t) || O(t)))
        for (let n in t.options)
          (delete t.options[n].location, _(t.options[n].value));
      else
        (L(t) && v(t.style)) || ((w(t) || R(t)) && S(t.style))
          ? delete t.style.location
          : M(t) && _(t.children);
    });
  }
  function ee(e, t = {}) {
    t = { shouldParseSkeletons: !0, requiresOtherClause: !0, ...t };
    let n = new we(e, t).parse();
    if (n.err) {
      let i = SyntaxError(be[n.err.kind]);
      throw (
        (i.location = n.err.location),
        (i.originalMessage = n.err.message),
        i
      );
    }
    return (t?.captureLocation || _(n.val), n.val);
  }
  var A = class extends Error {
      constructor(e, t, n) {
        (super(e), (this.code = t), (this.originalMessage = n));
      }
      toString() {
        return `[formatjs Error: ${this.code}] ${this.message}`;
      }
    },
    te = class extends A {
      constructor(e, t, n, i) {
        super(
          `Invalid values for "${e}": "${t}". Options are "${Object.keys(n).join('", "')}"`,
          "INVALID_VALUE",
          i,
        );
      }
    },
    Me = class extends A {
      constructor(e, t, n) {
        super(`Value for "${e}" must be of type ${t}`, "INVALID_VALUE", n);
      }
    },
    ve = class extends A {
      constructor(e, t) {
        super(
          `The intl string context variable "${e}" was not provided to the string "${t}"`,
          "MISSING_VALUE",
          t,
        );
      }
    };
  function De(e) {
    return e.length < 2
      ? e
      : e.reduce((t, n) => {
          let i = t[t.length - 1];
          return (
            !i || i.type !== 0 || n.type !== 0
              ? t.push(n)
              : (i.value += n.value),
            t
          );
        }, []);
  }
  function Fe(e) {
    return typeof e == "function";
  }
  function T(e, t, n, i, r, s, l) {
    if (e.length === 1 && N(e[0])) return [{ type: 0, value: e[0].value }];
    let a = [];
    for (let o of e) {
      if (N(o)) {
        a.push({ type: 0, value: o.value });
        continue;
      }
      if (Y(o)) {
        typeof s == "number" &&
          a.push({ type: 0, value: n.getNumberFormat(t).format(s) });
        continue;
      }
      let { value: c } = o;
      if (!(r && c in r)) throw new ve(c, l);
      let h = r[c];
      if (q(o)) {
        ((!h ||
          typeof h == "string" ||
          typeof h == "number" ||
          typeof h == "bigint") &&
          (h =
            typeof h == "string" || typeof h == "number" || typeof h == "bigint"
              ? String(h)
              : ""),
          a.push({ type: typeof h == "string" ? 0 : 1, value: h }));
        continue;
      }
      if (w(o)) {
        let u =
          typeof o.style == "string"
            ? i.date[o.style]
            : S(o.style)
              ? o.style.parsedOptions
              : void 0;
        a.push({ type: 0, value: n.getDateTimeFormat(t, u).format(h) });
        continue;
      }
      if (R(o)) {
        let u =
          typeof o.style == "string"
            ? i.time[o.style]
            : S(o.style)
              ? o.style.parsedOptions
              : i.time.medium;
        a.push({ type: 0, value: n.getDateTimeFormat(t, u).format(h) });
        continue;
      }
      if (L(o)) {
        let u =
          typeof o.style == "string"
            ? i.number[o.style]
            : v(o.style)
              ? o.style.parsedOptions
              : void 0;
        if (u && u.scale) {
          let p = u.scale || 1;
          if (typeof h == "bigint") {
            if (!Number.isInteger(p))
              throw new TypeError(
                `Cannot apply fractional scale ${p} to bigint value. Scale must be an integer when formatting bigint.`,
              );
            h = h * BigInt(p);
          } else h = h * p;
        }
        a.push({ type: 0, value: n.getNumberFormat(t, u).format(h) });
        continue;
      }
      if (M(o)) {
        let { children: u, value: p } = o,
          m = r[p];
        if (!Fe(m)) throw new Me(p, "function", l);
        let b = m(T(u, t, n, i, r, s).map((H) => H.value));
        (Array.isArray(b) || (b = [b]),
          a.push(
            ...b.map((H) => ({ type: typeof H == "string" ? 0 : 1, value: H })),
          ));
      }
      if (C(o)) {
        let u = h,
          p =
            (Object.prototype.hasOwnProperty.call(o.options, u)
              ? o.options[u]
              : void 0) || o.options.other;
        if (!p) throw new te(o.value, h, Object.keys(o.options), l);
        a.push(...T(p.value, t, n, i, r));
        continue;
      }
      if (O(o)) {
        let u = `=${h}`,
          p = Object.prototype.hasOwnProperty.call(o.options, u)
            ? o.options[u]
            : void 0;
        if (!p) {
          if (!Intl.PluralRules)
            throw new A(
              `Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`,
              "MISSING_INTL_API",
              l,
            );
          let b = typeof h == "bigint" ? Number(h) : h,
            H = n
              .getPluralRules(t, { type: o.pluralType })
              .select(b - (o.offset || 0));
          p =
            (Object.prototype.hasOwnProperty.call(o.options, H)
              ? o.options[H]
              : void 0) || o.options.other;
        }
        if (!p) throw new te(o.value, h, Object.keys(o.options), l);
        let m = typeof h == "bigint" ? Number(h) : h;
        a.push(...T(p.value, t, n, i, r, m - (o.offset || 0)));
        continue;
      }
    }
    return De(a);
  }
  function Ge(e, t) {
    return t
      ? {
          ...e,
          ...t,
          ...Object.keys(e).reduce(
            (n, i) => ((n[i] = { ...e[i], ...t[i] }), n),
            {},
          ),
        }
      : e;
  }
  function Ue(e, t) {
    return t
      ? Object.keys(e).reduce((n, i) => ((n[i] = Ge(e[i], t[i])), n), { ...e })
      : e;
  }
  function D(e) {
    return {
      create() {
        return {
          get(t) {
            return e[t];
          },
          set(t, n) {
            e[t] = n;
          },
        };
      },
    };
  }
  function ke(e = { number: {}, dateTime: {}, pluralRules: {} }) {
    return {
      getNumberFormat: B((...t) => new Intl.NumberFormat(...t), {
        cache: D(e.number),
        strategy: d.variadic,
      }),
      getDateTimeFormat: B((...t) => new Intl.DateTimeFormat(...t), {
        cache: D(e.dateTime),
        strategy: d.variadic,
      }),
      getPluralRules: B((...t) => new Intl.PluralRules(...t), {
        cache: D(e.pluralRules),
        strategy: d.variadic,
      }),
    };
  }
  var xe = class E {
      constructor(t, n = E.defaultLocale, i, r) {
        if (
          ((this.formatterCache = {
            number: {},
            dateTime: {},
            pluralRules: {},
          }),
          (this.format = (s) => {
            let l = this.formatToParts(s);
            if (l.length === 1) return l[0].value;
            let a = l.reduce(
              (o, c) => (
                !o.length || c.type !== 0 || typeof o[o.length - 1] != "string"
                  ? o.push(c.value)
                  : (o[o.length - 1] += c.value),
                o
              ),
              [],
            );
            return a.length <= 1 ? a[0] || "" : a;
          }),
          (this.formatToParts = (s) =>
            T(
              this.ast,
              this.locales,
              this.formatters,
              this.formats,
              s,
              void 0,
              this.message,
            )),
          (this.resolvedOptions = () => ({
            locale:
              this.resolvedLocale?.toString() ||
              Intl.NumberFormat.supportedLocalesOf(this.locales)[0],
          })),
          (this.getAst = () => this.ast),
          (this.locales = n),
          (this.resolvedLocale = E.resolveLocale(n)),
          typeof t == "string")
        ) {
          if (((this.message = t), !E.__parse))
            throw new TypeError(
              "IntlMessageFormat.__parse must be set to process `message` of type `string`",
            );
          let { ...s } = r || {};
          this.ast = E.__parse(t, { ...s, locale: this.resolvedLocale });
        } else this.ast = t;
        if (!Array.isArray(this.ast))
          throw new TypeError("A message must be provided as a String or AST.");
        ((this.formats = Ue(E.formats, i)),
          (this.formatters = (r && r.formatters) || ke(this.formatterCache)));
      }
      static {
        this.memoizedDefaultLocale = null;
      }
      static get defaultLocale() {
        return (
          E.memoizedDefaultLocale ||
            (E.memoizedDefaultLocale =
              new Intl.NumberFormat().resolvedOptions().locale),
          E.memoizedDefaultLocale
        );
      }
      static {
        this.resolveLocale = (t) => {
          if (typeof Intl.Locale > "u") return;
          let n = Intl.NumberFormat.supportedLocalesOf(t);
          return n.length > 0
            ? new Intl.Locale(n[0])
            : new Intl.Locale(typeof t == "string" ? t : t[0]);
        };
      }
      static {
        this.__parse = ee;
      }
      static {
        this.formats = {
          number: {
            integer: { maximumFractionDigits: 0 },
            currency: { style: "currency" },
            percent: { style: "percent" },
          },
          date: {
            short: { month: "numeric", day: "numeric", year: "2-digit" },
            medium: { month: "short", day: "numeric", year: "numeric" },
            long: { month: "long", day: "numeric", year: "numeric" },
            full: {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            },
          },
          time: {
            short: { hour: "numeric", minute: "numeric" },
            medium: { hour: "numeric", minute: "numeric", second: "numeric" },
            long: {
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              timeZoneName: "short",
            },
            full: {
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              timeZoneName: "short",
            },
          },
        };
      }
    },
    F = xe;
  var g = {
    literal: 0,
    argument: 1,
    number: 2,
    date: 3,
    time: 4,
    select: 5,
    plural: 6,
    pound: 7,
    tag: 8,
  };
  function Ve(e) {
    return e.type === g.argument
      ? "argument"
      : e.type === g.number
        ? "number"
        : e.type === g.date
          ? "date"
          : e.type === g.time
            ? "time"
            : e.type === g.select
              ? "select"
              : e.type === g.plural
                ? e.pluralType === "ordinal"
                  ? "selectordinal"
                  : "plural"
                : null;
  }
  function ne(e, t = "en") {
    let i = new F(String(e ?? ""), t, void 0, { ignoreTag: !0 }).getAst(),
      r = new Map(),
      s = [];
    function l(a, o = []) {
      for (let c of a || []) {
        let h = Ve(c);
        if (h) {
          let u = r.get(c.value);
          if (u && u !== h && u !== "argument" && h !== "argument")
            throw new Error(
              `Variable "${c.value}" is used as both ${u} and ${h}.`,
            );
          r.set(c.value, u && u !== "argument" ? u : h);
        }
        if (c.type === g.select || c.type === g.plural) {
          let u = Object.keys(c.options || {});
          if (!u.includes("other"))
            throw new Error(
              `The ${h} rule for "${c.value}" must include other.`,
            );
          if (c.type === g.plural) {
            let p = new Set([
                ...new Intl.PluralRules(t, {
                  type: c.pluralType === "ordinal" ? "ordinal" : "cardinal",
                }).resolvedOptions().pluralCategories,
                "other",
              ]),
              m = u.filter((b) => !b.startsWith("=") && !p.has(b));
            if (m.length)
              throw new Error(
                `The ${h} rule for "${c.value}" contains invalid ${t} branch${m.length === 1 ? "" : "es"}: ${m.join(", ")}.`,
              );
          }
          s.push({
            variable: c.value,
            type: h,
            options: u,
            offset: c.offset || 0,
            scope: [...o],
          });
          for (let [p, m] of Object.entries(c.options || {}))
            l(m.value, [...o, `${c.value}:${p}`]);
        } else c.type === g.tag && l(c.children, o);
      }
    }
    return (
      l(i),
      {
        ast: i,
        arguments: Object.fromEntries(r),
        rules: s,
        isIcu: s.length > 0,
      }
    );
  }
  function $e(e, t, n) {
    let r = new F(String(e ?? ""), t, void 0, { ignoreTag: !0 }).format(
      n || {},
    );
    return Array.isArray(r) ? r.join("") : String(r);
  }
  function ie(e, t = "cardinal") {
    let n = new Intl.PluralRules(e, { type: t }).resolvedOptions()
      .pluralCategories;
    return ["zero", "one", "two", "few", "many", "other"].filter(
      (r) => r === "other" || n.includes(r),
    );
  }
  function Xe(e, t, n, i = !1) {
    let r = String(t || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(r))
      throw new Error("Use a variable name such as count or folderCount.");
    let s = String(e ?? "");
    ne(s, n);
    let l = ie(n, i ? "ordinal" : "cardinal");
    return `{${r}, ${i ? "selectordinal" : "plural"}, ${l.map((o) => `${o} {${s}}`).join(" ")}}`;
  }
  window.UTranslateICU = {
    analyze: ne,
    format: $e,
    pluralCategories: ie,
    createPlural: Xe,
  };
})();
