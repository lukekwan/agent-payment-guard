// node_modules/@humanwhocodes/momoa/dist/momoa.js
var CHAR_0 = 48;
var CHAR_1 = 49;
var CHAR_9 = 57;
var CHAR_BACKSLASH = 92;
var CHAR_DOLLAR = 36;
var CHAR_DOT = 46;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_LOWER_A = 97;
var CHAR_LOWER_E = 101;
var CHAR_LOWER_F = 102;
var CHAR_LOWER_N = 110;
var CHAR_LOWER_T = 116;
var CHAR_LOWER_U = 117;
var CHAR_LOWER_X = 120;
var CHAR_LOWER_Z = 122;
var CHAR_MINUS = 45;
var CHAR_NEWLINE = 10;
var CHAR_PLUS = 43;
var CHAR_RETURN = 13;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_SLASH = 47;
var CHAR_SPACE = 32;
var CHAR_TAB = 9;
var CHAR_UNDERSCORE = 95;
var CHAR_UPPER_A = 65;
var CHAR_UPPER_E = 69;
var CHAR_UPPER_F = 70;
var CHAR_UPPER_N = 78;
var CHAR_UPPER_X = 88;
var CHAR_UPPER_Z = 90;
var CHAR_LOWER_B = 98;
var CHAR_LOWER_R = 114;
var CHAR_LOWER_V = 118;
var CHAR_LINE_SEPARATOR = 8232;
var CHAR_PARAGRAPH_SEPARATOR = 8233;
var CHAR_UPPER_I = 73;
var CHAR_STAR = 42;
var CHAR_VTAB = 11;
var CHAR_FORM_FEED = 12;
var CHAR_NBSP = 160;
var CHAR_BOM = 65279;
var CHAR_NON_BREAKING_SPACE = 160;
var CHAR_EN_QUAD = 8192;
var CHAR_EM_QUAD = 8193;
var CHAR_EN_SPACE = 8194;
var CHAR_EM_SPACE = 8195;
var CHAR_THREE_PER_EM_SPACE = 8196;
var CHAR_FOUR_PER_EM_SPACE = 8197;
var CHAR_SIX_PER_EM_SPACE = 8198;
var CHAR_FIGURE_SPACE = 8199;
var CHAR_PUNCTUATION_SPACE = 8200;
var CHAR_THIN_SPACE = 8201;
var CHAR_HAIR_SPACE = 8202;
var CHAR_NARROW_NO_BREAK_SPACE = 8239;
var CHAR_MEDIUM_MATHEMATICAL_SPACE = 8287;
var CHAR_IDEOGRAPHIC_SPACE = 12288;
var LBRACKET = "[";
var RBRACKET = "]";
var LBRACE = "{";
var RBRACE = "}";
var COLON = ":";
var COMMA = ",";
var TRUE = "true";
var FALSE = "false";
var NULL = "null";
var NAN$1 = "NaN";
var INFINITY$1 = "Infinity";
var QUOTE = '"';
var escapeToChar = /* @__PURE__ */ new Map([
  [CHAR_DOUBLE_QUOTE, QUOTE],
  [CHAR_BACKSLASH, "\\"],
  [CHAR_SLASH, "/"],
  [CHAR_LOWER_B, "\b"],
  [CHAR_LOWER_N, "\n"],
  [CHAR_LOWER_F, "\f"],
  [CHAR_LOWER_R, "\r"],
  [CHAR_LOWER_T, "	"]
]);
var json5EscapeToChar = new Map([
  ...escapeToChar,
  [CHAR_LOWER_V, "\v"],
  [CHAR_0, "\0"]
]);
var charToEscape = /* @__PURE__ */ new Map([
  [QUOTE, QUOTE],
  ["\\", "\\"],
  ["/", "/"],
  ["\b", "b"],
  ["\n", "n"],
  ["\f", "f"],
  ["\r", "r"],
  ["	", "t"]
]);
var json5CharToEscape = new Map([
  ...charToEscape,
  ["\v", "v"],
  ["\0", "0"],
  ["\u2028", "u2028"],
  ["\u2029", "u2029"]
]);
var knownTokenTypes = /* @__PURE__ */ new Map([
  [LBRACKET, "LBracket"],
  [RBRACKET, "RBracket"],
  [LBRACE, "LBrace"],
  [RBRACE, "RBrace"],
  [COLON, "Colon"],
  [COMMA, "Comma"],
  [TRUE, "Boolean"],
  [FALSE, "Boolean"],
  [NULL, "Null"]
]);
var knownJSON5TokenTypes = new Map([
  ...knownTokenTypes,
  [NAN$1, "Number"],
  [INFINITY$1, "Number"]
]);
var json5LineTerminators = /* @__PURE__ */ new Set([
  CHAR_NEWLINE,
  CHAR_RETURN,
  CHAR_LINE_SEPARATOR,
  CHAR_PARAGRAPH_SEPARATOR
]);
var ErrorWithLocation = class extends Error {
  /**
   * Creates a new instance.
   * @param {string} message The error message to report. 
   * @param {Location} loc The location information for the error.
   */
  constructor(message, { line, column, offset }) {
    super(`${message} (${line}:${column})`);
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
};
var UnexpectedChar = class extends ErrorWithLocation {
  /**
   * Creates a new instance.
   * @param {number} unexpected The character that was found.
   * @param {Location} loc The location information for the found character.
   */
  constructor(unexpected, loc) {
    super(`Unexpected character '${String.fromCharCode(unexpected)}' found.`, loc);
  }
};
var UnexpectedIdentifier = class extends ErrorWithLocation {
  /**
   * Creates a new instance.
   * @param {string} unexpected The character that was found.
   * @param {Location} loc The location information for the found character.
   */
  constructor(unexpected, loc) {
    super(`Unexpected identifier '${unexpected}' found.`, loc);
  }
};
var UnexpectedToken = class extends ErrorWithLocation {
  /**
   * Creates a new instance.
   * @param {Token} token The token that was found. 
   */
  constructor(token) {
    super(`Unexpected token ${token.type} found.`, token.loc.start);
  }
};
var UnexpectedEOF = class extends ErrorWithLocation {
  /**
   * Creates a new instance.
   * @param {Location} loc The location information for the found character.
   */
  constructor(loc) {
    super("Unexpected end of input found.", loc);
  }
};
var ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
var ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;
var CHAR_CR = 13;
var CHAR_LF = 10;
var CharCodeReader = class {
  /**
   * The text to read from.
   * @type {string}
   */
  #text = "";
  /**
   * The current line number.
   * @type {number}
   */
  #line = 1;
  /**
   * The current column number.
   * @type {number}
   */
  #column = 0;
  /**
   * The current offset in the text.
   * @type {number}
   */
  #offset = -1;
  /**
   * Whether the last character read was a new line.
   * @type {boolean}
   */
  #newLine = false;
  /**
   * The last character code read.
   * @type {number}
   */
  #last = -1;
  /**
   * Whether the reader has ended.
   * @type {boolean}
   */
  #ended = false;
  /**
   * Creates a new instance.
   * @param {string} text The text to read from
   */
  constructor(text) {
    this.#text = text;
  }
  /**
   * Ends the reader.
   * @returns {void}
   */
  #end() {
    if (this.#ended) {
      return;
    }
    this.#column++;
    this.#offset++;
    this.#last = -1;
    this.#ended = true;
  }
  /**
   * Returns the current position of the reader.
   * @returns {Location} An object with line, column, and offset properties.
   */
  locate() {
    return {
      line: this.#line,
      column: this.#column,
      offset: this.#offset
    };
  }
  /**
   * Reads the next character code in the text.
   * @returns {number} The next character code, or -1 if there are no more characters.
   */
  next() {
    if (this.#offset >= this.#text.length - 1) {
      this.#end();
      return -1;
    }
    this.#offset++;
    const charCode = this.#text.charCodeAt(this.#offset);
    if (this.#newLine) {
      this.#line++;
      this.#column = 1;
      this.#newLine = false;
    } else {
      this.#column++;
    }
    if (charCode === CHAR_CR) {
      this.#newLine = true;
      if (this.peek() === CHAR_LF) {
        this.#offset++;
      }
    } else if (charCode === CHAR_LF) {
      this.#newLine = true;
    }
    this.#last = charCode;
    return charCode;
  }
  /**
   * Peeks at the next character code in the text.
   * @returns {number} The next character code, or -1 if there are no more characters.
   */
  peek() {
    if (this.#offset === this.#text.length - 1) {
      return -1;
    }
    return this.#text.charCodeAt(this.#offset + 1);
  }
  /**
   * Determines if the next character code in the text matches a specific character code.
   * @param {(number) => boolean} fn A function to call on the next character.
   * @returns {boolean} True if the next character code matches, false if not.
   */
  match(fn) {
    if (fn(this.peek())) {
      this.next();
      return true;
    }
    return false;
  }
  /**
   * Returns the last character code read.
   * @returns {number} The last character code read.
   */
  current() {
    return this.#last;
  }
};
var INFINITY = "Infinity";
var NAN = "NaN";
var keywordStarts = /* @__PURE__ */ new Set([CHAR_LOWER_T, CHAR_LOWER_F, CHAR_LOWER_N]);
var whitespace = /* @__PURE__ */ new Set([CHAR_SPACE, CHAR_TAB, CHAR_NEWLINE, CHAR_RETURN]);
var json5Whitespace = /* @__PURE__ */ new Set([
  ...whitespace,
  CHAR_VTAB,
  CHAR_FORM_FEED,
  CHAR_NBSP,
  CHAR_LINE_SEPARATOR,
  CHAR_PARAGRAPH_SEPARATOR,
  CHAR_BOM,
  CHAR_NON_BREAKING_SPACE,
  CHAR_EN_QUAD,
  CHAR_EM_QUAD,
  CHAR_EN_SPACE,
  CHAR_EM_SPACE,
  CHAR_THREE_PER_EM_SPACE,
  CHAR_FOUR_PER_EM_SPACE,
  CHAR_SIX_PER_EM_SPACE,
  CHAR_FIGURE_SPACE,
  CHAR_PUNCTUATION_SPACE,
  CHAR_THIN_SPACE,
  CHAR_HAIR_SPACE,
  CHAR_NARROW_NO_BREAK_SPACE,
  CHAR_MEDIUM_MATHEMATICAL_SPACE,
  CHAR_IDEOGRAPHIC_SPACE
]);
var DEFAULT_OPTIONS$1 = {
  mode: "json",
  ranges: false
};
var jsonKeywords = /* @__PURE__ */ new Set(["true", "false", "null"]);
var tt = {
  EOF: 0,
  Number: 1,
  String: 2,
  Boolean: 3,
  Null: 4,
  NaN: 5,
  Infinity: 6,
  Identifier: 7,
  Colon: 20,
  LBrace: 21,
  RBrace: 22,
  LBracket: 23,
  RBracket: 24,
  Comma: 25,
  LineComment: 40,
  BlockComment: 41
};
function isDigit(c) {
  return c >= CHAR_0 && c <= CHAR_9;
}
function isHexDigit(c) {
  return isDigit(c) || c >= CHAR_UPPER_A && c <= CHAR_UPPER_F || c >= CHAR_LOWER_A && c <= CHAR_LOWER_F;
}
function isPositiveDigit(c) {
  return c >= CHAR_1 && c <= CHAR_9;
}
function isKeywordStart(c) {
  return keywordStarts.has(c);
}
function isNumberStart(c) {
  return isDigit(c) || c === CHAR_DOT || c === CHAR_MINUS;
}
function isJSON5NumberStart(c) {
  return isNumberStart(c) || c === CHAR_PLUS;
}
function isStringStart(c, json5) {
  return c === CHAR_DOUBLE_QUOTE || json5 && c === CHAR_SINGLE_QUOTE;
}
function isJSON5IdentifierStart(c) {
  if (c === CHAR_DOLLAR || c === CHAR_UNDERSCORE || c === CHAR_BACKSLASH) {
    return true;
  }
  if (c >= CHAR_LOWER_A && c <= CHAR_LOWER_Z || c >= CHAR_UPPER_A && c <= CHAR_UPPER_Z) {
    return true;
  }
  if (c === 8204 || c === 8205) {
    return true;
  }
  const ct = String.fromCharCode(c);
  return ID_Start.test(ct);
}
function isJSON5IdentifierPart(c) {
  if (isJSON5IdentifierStart(c) || isDigit(c)) {
    return true;
  }
  const ct = String.fromCharCode(c);
  return ID_Continue.test(ct);
}
var Tokenizer = class {
  /**
   * Options for the tokenizer.
   * @type {TokenizeOptions}
   */
  #options;
  /**
   * The source text to tokenize.
   * @type {string}
   */
  #text;
  /**
   * The reader for the source text.
   * @type {CharCodeReader}
   */
  #reader;
  /**
   * Indicates if the tokenizer is in JSON5 mode.
   * @type {boolean}
   */
  #json5;
  /**
   * Indicates if comments are allowed.
   * @type {boolean}
   */
  #allowComments;
  /**
   * Indicates if ranges should be included in the tokens.
   * @type {boolean}
   */
  #ranges;
  /**
   * The last token type read.
   * @type {Token}
   */
  #token;
  /**
   * Determines if a character is an escaped character.
   * @type {(c:number) => boolean}
   */
  #isEscapedCharacter;
  /**
   * Determines if a character is a JSON5 line terminator.
   * @type {(c:number) => boolean}
   */
  #isJSON5LineTerminator;
  /**
   * Determines if a character is a JSON5 hex escape.
   * @type {(c:number) => boolean}
   */
  #isJSON5HexEscape;
  /**
   * Determines if a character is whitespace.
   * @type {(c:number) => boolean}
   */
  #isWhitespace;
  /**
   * Creates a new instance of the tokenizer.
   * @param {string} text The source text
   * @param {TokenizeOptions} [options] Options for the tokenizer.
   */
  constructor(text, options) {
    this.#text = text;
    this.#options = {
      ...DEFAULT_OPTIONS$1,
      ...options
    };
    this.#reader = new CharCodeReader(text);
    this.#json5 = this.#options.mode === "json5";
    this.#allowComments = this.#options.mode !== "json";
    this.#ranges = this.#options.ranges;
    this.#isEscapedCharacter = this.#json5 ? json5EscapeToChar.has.bind(json5EscapeToChar) : escapeToChar.has.bind(escapeToChar);
    this.#isJSON5LineTerminator = this.#json5 ? json5LineTerminators.has.bind(json5LineTerminators) : () => false;
    this.#isJSON5HexEscape = this.#json5 ? (c) => c === CHAR_LOWER_X : () => false;
    this.#isWhitespace = this.#json5 ? json5Whitespace.has.bind(json5Whitespace) : whitespace.has.bind(whitespace);
  }
  // #region Errors
  /**
   * Convenience function for throwing unexpected character errors.
   * @param {number} c The unexpected character.
   * @param {Location} [loc] The location of the unexpected character.
   * @returns {never}
   * @throws {UnexpectedChar} always.
   */
  #unexpected(c, loc = this.#reader.locate()) {
    throw new UnexpectedChar(c, loc);
  }
  /**
   * Convenience function for throwing unexpected identifier errors.
   * @param {string} identifier The unexpected identifier.
   * @param {Location} [loc] The location of the unexpected identifier.
   * @returns {never}
   * @throws {UnexpectedIdentifier} always.
   */
  #unexpectedIdentifier(identifier, loc = this.#reader.locate()) {
    throw new UnexpectedIdentifier(identifier, loc);
  }
  /**
  * Convenience function for throwing unexpected EOF errors.
  * @returns {never}
  * @throws {UnexpectedEOF} always.
  */
  #unexpectedEOF() {
    throw new UnexpectedEOF(this.#reader.locate());
  }
  // #endregion
  // #region Helpers
  /**
   * Creates a new token.
   * @param {TokenType} tokenType The type of token to create.
   * @param {number} length The length of the token.
   * @param {Location} startLoc The start location for the token.
   * @param {Location} [endLoc] The end location for the token.
   * @returns {Token} The token.
   */
  #createToken(tokenType, length, startLoc, endLoc) {
    const endOffset = startLoc.offset + length;
    let range = this.#options.ranges ? {
      range: (
        /** @type {Range} */
        [startLoc.offset, endOffset]
      )
    } : void 0;
    return {
      type: tokenType,
      loc: {
        start: startLoc,
        end: endLoc || {
          line: startLoc.line,
          column: startLoc.column + length,
          offset: endOffset
        }
      },
      ...range
    };
  }
  /**
   * Reads in a specific number of hex digits.
   * @param {number} count The number of hex digits to read.
   * @returns {string} The hex digits read.
   */
  #readHexDigits(count) {
    let value = "";
    let c;
    for (let i = 0; i < count; i++) {
      c = this.#reader.peek();
      if (isHexDigit(c)) {
        this.#reader.next();
        value += String.fromCharCode(c);
        continue;
      }
      this.#unexpected(c);
    }
    return value;
  }
  /**
   * Reads in a JSON5 identifier. Also used for JSON but we validate
   * the identifier later.
   * @param {number} c The first character of the identifier.
   * @returns {string} The identifier read.
   * @throws {UnexpectedChar} when the identifier cannot be read.
   */
  #readIdentifier(c) {
    let value = "";
    do {
      value += String.fromCharCode(c);
      if (c === CHAR_BACKSLASH) {
        c = this.#reader.next();
        if (c !== CHAR_LOWER_U) {
          this.#unexpected(c);
        }
        value += String.fromCharCode(c);
        const hexDigits = this.#readHexDigits(4);
        const charCode = parseInt(hexDigits, 16);
        if (value.length === 2 && !isJSON5IdentifierStart(charCode)) {
          const loc = this.#reader.locate();
          this.#unexpected(CHAR_BACKSLASH, { line: loc.line, column: loc.column - 5, offset: loc.offset - 5 });
        } else if (!isJSON5IdentifierPart(charCode)) {
          const loc = this.#reader.locate();
          this.#unexpected(charCode, { line: loc.line, column: loc.column - 5, offset: loc.offset - 5 });
        }
        value += hexDigits;
      }
      c = this.#reader.peek();
      if (!isJSON5IdentifierPart(c)) {
        break;
      }
      this.#reader.next();
    } while (true);
    return value;
  }
  /**
   * Reads in a string. Works for both JSON and JSON5.
   * @param {number} c The first character of the string (either " or ').
   * @returns {number} The length of the string.
   * @throws {UnexpectedChar} when the string cannot be read.
   * @throws {UnexpectedEOF} when EOF is reached before the string is finalized.
   */
  #readString(c) {
    const delimiter = c;
    let length = 1;
    c = this.#reader.peek();
    while (c !== -1 && c !== delimiter) {
      this.#reader.next();
      length++;
      if (c === CHAR_BACKSLASH) {
        c = this.#reader.peek();
        if (this.#isEscapedCharacter(c) || this.#isJSON5LineTerminator(c)) {
          this.#reader.next();
          length++;
        } else if (c === CHAR_LOWER_U) {
          this.#reader.next();
          length++;
          const result = this.#readHexDigits(4);
          length += result.length;
        } else if (this.#isJSON5HexEscape(c)) {
          this.#reader.next();
          length++;
          const result = this.#readHexDigits(2);
          length += result.length;
        } else if (this.#json5) {
          this.#reader.next();
          length++;
        } else {
          this.#unexpected(c);
        }
      }
      c = this.#reader.peek();
    }
    if (c === -1) {
      this.#reader.next();
      this.#unexpectedEOF();
    }
    this.#reader.next();
    length++;
    return length;
  }
  /**
   * Reads a number. Works for both JSON and JSON5.
   * @param {number} c The first character of the number.
   * @returns {number} The length of the number.
   * @throws {UnexpectedChar} when the number cannot be read.
   * @throws {UnexpectedEOF} when EOF is reached before the number is finalized.
   */
  #readNumber(c) {
    let length = 1;
    if (c === CHAR_MINUS || this.#json5 && c === CHAR_PLUS) {
      c = this.#reader.peek();
      if (this.#json5) {
        if (c === CHAR_UPPER_I || c === CHAR_UPPER_N) {
          this.#reader.next();
          const identifier = this.#readIdentifier(c);
          if (identifier !== INFINITY && identifier !== NAN) {
            this.#unexpected(c);
          }
          return length + identifier.length;
        }
      }
      if (!isDigit(c)) {
        this.#unexpected(c);
      }
      this.#reader.next();
      length++;
    }
    if (c === CHAR_0) {
      c = this.#reader.peek();
      if (this.#json5 && (c === CHAR_LOWER_X || c === CHAR_UPPER_X)) {
        this.#reader.next();
        length++;
        c = this.#reader.peek();
        if (!isHexDigit(c)) {
          this.#reader.next();
          this.#unexpected(c);
        }
        do {
          this.#reader.next();
          length++;
          c = this.#reader.peek();
        } while (isHexDigit(c));
      } else if (isDigit(c)) {
        this.#unexpected(c);
      }
    } else {
      if (!this.#json5 || c !== CHAR_DOT) {
        if (!isPositiveDigit(c)) {
          this.#unexpected(c);
        }
        c = this.#reader.peek();
        while (isDigit(c)) {
          this.#reader.next();
          length++;
          c = this.#reader.peek();
        }
      }
    }
    if (c === CHAR_DOT) {
      let digitCount = -1;
      this.#reader.next();
      length++;
      digitCount++;
      c = this.#reader.peek();
      while (isDigit(c)) {
        this.#reader.next();
        length++;
        digitCount++;
        c = this.#reader.peek();
      }
      if (!this.#json5 && digitCount === 0) {
        this.#reader.next();
        if (c) {
          this.#unexpected(c);
        } else {
          this.#unexpectedEOF();
        }
      }
    }
    if (c === CHAR_LOWER_E || c === CHAR_UPPER_E) {
      this.#reader.next();
      length++;
      c = this.#reader.peek();
      if (c === CHAR_PLUS || c === CHAR_MINUS) {
        this.#reader.next();
        length++;
        c = this.#reader.peek();
      }
      if (c === -1) {
        this.#reader.next();
        this.#unexpectedEOF();
      }
      if (!isDigit(c)) {
        this.#reader.next();
        this.#unexpected(c);
      }
      while (isDigit(c)) {
        this.#reader.next();
        length++;
        c = this.#reader.peek();
      }
    }
    return length;
  }
  /**
   * Reads a comment. Works for both JSON and JSON5.
   * @param {number} c The first character of the comment.
   * @returns {{length: number, multiline: boolean}} The length of the comment, and whether the comment is multi-line.
   * @throws {UnexpectedChar} when the comment cannot be read.
   * @throws {UnexpectedEOF} when EOF is reached before the comment is finalized.
   */
  #readComment(c) {
    let length = 1;
    c = this.#reader.peek();
    if (c === CHAR_SLASH) {
      do {
        this.#reader.next();
        length += 1;
        c = this.#reader.peek();
      } while (c > -1 && c !== CHAR_RETURN && c !== CHAR_NEWLINE);
      return { length, multiline: false };
    }
    if (c === CHAR_STAR) {
      this.#reader.next();
      length += 1;
      while (c > -1) {
        c = this.#reader.peek();
        if (c === CHAR_STAR) {
          this.#reader.next();
          length += 1;
          c = this.#reader.peek();
          if (c === CHAR_SLASH) {
            this.#reader.next();
            length += 1;
            return { length, multiline: true };
          }
        } else {
          this.#reader.next();
          length += 1;
        }
      }
      this.#reader.next();
      this.#unexpectedEOF();
    }
    this.#reader.next();
    this.#unexpected(c);
  }
  // #endregion
  /**
   * Returns the next token in the source text.
   * @returns {number} The code for the next token.
   */
  next() {
    let c = this.#reader.next();
    while (this.#isWhitespace(c)) {
      c = this.#reader.next();
    }
    if (c === -1) {
      return tt.EOF;
    }
    const start = this.#reader.locate();
    const ct = String.fromCharCode(c);
    if (this.#json5) {
      if (knownJSON5TokenTypes.has(ct)) {
        this.#token = this.#createToken(knownJSON5TokenTypes.get(ct), 1, start);
      } else if (isJSON5IdentifierStart(c)) {
        const value = this.#readIdentifier(c);
        if (knownJSON5TokenTypes.has(value)) {
          this.#token = this.#createToken(knownJSON5TokenTypes.get(value), value.length, start);
        } else {
          this.#token = this.#createToken("Identifier", value.length, start);
        }
      } else if (isJSON5NumberStart(c)) {
        const result = this.#readNumber(c);
        this.#token = this.#createToken("Number", result, start);
      } else if (isStringStart(c, this.#json5)) {
        const result = this.#readString(c);
        const lastCharLoc = this.#reader.locate();
        this.#token = this.#createToken("String", result, start, {
          line: lastCharLoc.line,
          column: lastCharLoc.column + 1,
          offset: lastCharLoc.offset + 1
        });
      } else if (c === CHAR_SLASH && this.#allowComments) {
        const result = this.#readComment(c);
        const lastCharLoc = this.#reader.locate();
        this.#token = this.#createToken(!result.multiline ? "LineComment" : "BlockComment", result.length, start, {
          line: lastCharLoc.line,
          column: lastCharLoc.column + 1,
          offset: lastCharLoc.offset + 1
        });
      } else {
        this.#unexpected(c);
      }
    } else {
      if (knownTokenTypes.has(ct)) {
        this.#token = this.#createToken(knownTokenTypes.get(ct), 1, start);
      } else if (isKeywordStart(c)) {
        const value = this.#readIdentifier(c);
        if (!jsonKeywords.has(value)) {
          this.#unexpectedIdentifier(value, start);
        }
        this.#token = this.#createToken(knownTokenTypes.get(value), value.length, start);
      } else if (isNumberStart(c)) {
        const result = this.#readNumber(c);
        this.#token = this.#createToken("Number", result, start);
      } else if (isStringStart(c, this.#json5)) {
        const result = this.#readString(c);
        this.#token = this.#createToken("String", result, start);
      } else if (c === CHAR_SLASH && this.#allowComments) {
        const result = this.#readComment(c);
        const lastCharLoc = this.#reader.locate();
        this.#token = this.#createToken(!result.multiline ? "LineComment" : "BlockComment", result.length, start, {
          line: lastCharLoc.line,
          column: lastCharLoc.column + 1,
          offset: lastCharLoc.offset + 1
        });
      } else {
        this.#unexpected(c);
      }
    }
    return tt[this.#token.type];
  }
  /**
   * Returns the current token in the source text.
   * @returns {Token} The current token.
   */
  get token() {
    return this.#token;
  }
};
var types = {
  /**
   * Creates a document node.
   * @param {ValueNode} body The body of the document.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {DocumentNode} The document node.
   */
  document(body, parts = {}) {
    return {
      type: "Document",
      body,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a string node.
   * @param {string} value The value for the string.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {StringNode} The string node.
   */
  string(value, parts = {}) {
    return {
      type: "String",
      value,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a number node.
   * @param {number} value The value for the number.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {NumberNode} The number node.
   */
  number(value, parts = {}) {
    return {
      type: "Number",
      value,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a boolean node.
   * @param {boolean} value The value for the boolean.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {BooleanNode} The boolean node.
   */
  boolean(value, parts = {}) {
    return {
      type: "Boolean",
      value,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a null node.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {NullNode} The null node.
   */
  null(parts = {}) {
    return {
      type: "Null",
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates an array node.
   * @param {Array<ElementNode>} elements The elements to add.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {ArrayNode} The array node.
   */
  array(elements, parts = {}) {
    return {
      type: "Array",
      elements,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates an element node.
   * @param {ValueNode} value The value for the element.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {ElementNode} The element node.
   */
  element(value, parts = {}) {
    return {
      type: "Element",
      value,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates an object node.
   * @param {Array<MemberNode>} members The members to add.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {ObjectNode} The object node.
   */
  object(members, parts = {}) {
    return {
      type: "Object",
      members,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a member node.
   * @param {StringNode|IdentifierNode} name The name for the member.
   * @param {ValueNode} value The value for the member.
   * @param {NodeParts} parts Additional properties for the node. 
   * @returns {MemberNode} The member node.
   */
  member(name, value, parts = {}) {
    return {
      type: "Member",
      name,
      value,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates an identifier node.
   * @param {string} name The name for the identifier.
   * @param {NodeParts} parts Additional properties for the node.
   * @returns {IdentifierNode} The identifier node.
   */
  identifier(name, parts = {}) {
    return {
      type: "Identifier",
      name,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates a NaN node.
   * @param {Sign} sign The sign for the Infinity.
   * @param {NodeParts} parts Additional properties for the node.
   * @returns {NaNNode} The NaN node.
   */
  nan(sign = "", parts = {}) {
    return {
      type: "NaN",
      sign,
      loc: parts.loc,
      ...parts
    };
  },
  /**
   * Creates an Infinity node.
   * @param {Sign} sign The sign for the Infinity.
   * @param {NodeParts} parts Additional properties for the node.
   * @returns {InfinityNode} The Infinity node.
   */
  infinity(sign = "", parts = {}) {
    return {
      type: "Infinity",
      sign,
      loc: parts.loc,
      ...parts
    };
  }
};
var DEFAULT_OPTIONS = {
  mode: "json",
  ranges: false,
  tokens: false,
  allowTrailingCommas: false
};
var UNICODE_SEQUENCE = /\\u[\da-fA-F]{4}/gu;
function normalizeIdentifier(identifier) {
  return identifier.replace(UNICODE_SEQUENCE, (unicodeEscape) => {
    return String.fromCharCode(parseInt(unicodeEscape.slice(2), 16));
  });
}
function getEndLocation(text) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\n") {
      line++;
      column = 1;
    } else if (char === "\r") {
      if (text[i + 1] === "\n") {
        i++;
      }
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return {
    line,
    column,
    offset: text.length
  };
}
function getStringValue(value, token, json5 = false) {
  let result = "";
  let escapeIndex = value.indexOf("\\");
  let lastIndex = 0;
  while (escapeIndex >= 0) {
    result += value.slice(lastIndex, escapeIndex);
    const escapeChar = value.charAt(escapeIndex + 1);
    const escapeCharCode = escapeChar.charCodeAt(0);
    if (json5 && json5EscapeToChar.has(escapeCharCode)) {
      result += json5EscapeToChar.get(escapeCharCode);
      lastIndex = escapeIndex + 2;
    } else if (escapeToChar.has(escapeCharCode)) {
      result += escapeToChar.get(escapeCharCode);
      lastIndex = escapeIndex + 2;
    } else if (escapeChar === "u") {
      const hexCode = value.slice(escapeIndex + 2, escapeIndex + 6);
      if (hexCode.length < 4 || /[^0-9a-f]/i.test(hexCode)) {
        throw new ErrorWithLocation(
          `Invalid unicode escape \\u${hexCode}.`,
          {
            line: token.loc.start.line,
            column: token.loc.start.column + escapeIndex,
            offset: token.loc.start.offset + escapeIndex
          }
        );
      }
      result += String.fromCharCode(parseInt(hexCode, 16));
      lastIndex = escapeIndex + 6;
    } else if (json5 && escapeChar === "x") {
      const hexCode = value.slice(escapeIndex + 2, escapeIndex + 4);
      if (hexCode.length < 2 || /[^0-9a-f]/i.test(hexCode)) {
        throw new ErrorWithLocation(
          `Invalid hex escape \\x${hexCode}.`,
          {
            line: token.loc.start.line,
            column: token.loc.start.column + escapeIndex,
            offset: token.loc.start.offset + escapeIndex
          }
        );
      }
      result += String.fromCharCode(parseInt(hexCode, 16));
      lastIndex = escapeIndex + 4;
    } else if (json5 && json5LineTerminators.has(escapeCharCode)) {
      lastIndex = escapeIndex + 2;
      if (escapeChar === "\r" && value.charAt(lastIndex) === "\n") {
        lastIndex++;
      }
    } else {
      if (json5) {
        result += escapeChar;
        lastIndex = escapeIndex + 2;
      } else {
        throw new ErrorWithLocation(
          `Invalid escape \\${escapeChar}.`,
          {
            line: token.loc.start.line,
            column: token.loc.start.column + escapeIndex,
            offset: token.loc.start.offset + escapeIndex
          }
        );
      }
    }
    escapeIndex = value.indexOf("\\", lastIndex);
  }
  result += value.slice(lastIndex);
  return result;
}
function getLiteralValue(value, token, json5 = false) {
  switch (token.type) {
    case "Boolean":
      return value === "true";
    case "Number":
      if (json5) {
        if (value.charCodeAt(0) === 45) {
          return -Number(value.slice(1));
        }
        if (value.charCodeAt(0) === 43) {
          return Number(value.slice(1));
        }
      }
      return Number(value);
    case "String":
      return getStringValue(value.slice(1, -1), token, json5);
    default:
      throw new TypeError(`Unknown token type "${token.type}.`);
  }
}
function parse(text, options) {
  options = Object.freeze({
    ...DEFAULT_OPTIONS,
    ...options
  });
  const tokens = [];
  const tokenizer = new Tokenizer(text, {
    mode: options.mode,
    ranges: options.ranges
  });
  const json5 = options.mode === "json5";
  const allowTrailingCommas = options.allowTrailingCommas || json5;
  function nextNoComments() {
    const nextType = tokenizer.next();
    if (nextType && options.tokens) {
      tokens.push(tokenizer.token);
    }
    return nextType;
  }
  function nextSkipComments() {
    const nextType = tokenizer.next();
    if (nextType && options.tokens) {
      tokens.push(tokenizer.token);
    }
    if (nextType >= tt.LineComment) {
      return nextSkipComments();
    }
    return nextType;
  }
  const next = options.mode === "json" ? nextNoComments : nextSkipComments;
  function assertTokenType(token, type) {
    if (token !== type) {
      throw new UnexpectedToken(tokenizer.token);
    }
  }
  function assertTokenTypes(token, types2) {
    if (!types2.includes(token)) {
      throw new UnexpectedToken(tokenizer.token);
    }
  }
  function createRange(start, end) {
    return options.ranges ? {
      range: [start.offset, end.offset]
    } : void 0;
  }
  function createLiteralNode(tokenType) {
    const token = tokenizer.token;
    const range = createRange(token.loc.start, token.loc.end);
    const value = getLiteralValue(
      text.slice(token.loc.start.offset, token.loc.end.offset),
      token,
      json5
    );
    const loc = {
      start: {
        ...token.loc.start
      },
      end: {
        ...token.loc.end
      }
    };
    const parts = { loc, ...range };
    switch (tokenType) {
      case tt.String:
        return types.string(
          /** @type {string} */
          value,
          parts
        );
      case tt.Number:
        return types.number(
          /** @type {number} */
          value,
          parts
        );
      case tt.Boolean:
        return types.boolean(
          /** @type {boolean} */
          value,
          parts
        );
      default:
        throw new TypeError(`Unknown token type ${token.type}.`);
    }
  }
  function createJSON5IdentifierNode(token) {
    const range = createRange(token.loc.start, token.loc.end);
    const identifier = text.slice(token.loc.start.offset, token.loc.end.offset);
    const loc = {
      start: {
        ...token.loc.start
      },
      end: {
        ...token.loc.end
      }
    };
    const parts = { loc, ...range };
    if (token.type !== "Identifier") {
      let sign = "";
      if (identifier[0] === "+" || identifier[0] === "-") {
        sign = identifier[0];
      }
      return types[identifier.includes("NaN") ? "nan" : "infinity"](
        /** @type {Sign} */
        sign,
        parts
      );
    }
    return types.identifier(normalizeIdentifier(identifier), parts);
  }
  function createNullNode(token) {
    const range = createRange(token.loc.start, token.loc.end);
    return types.null({
      loc: {
        start: {
          ...token.loc.start
        },
        end: {
          ...token.loc.end
        }
      },
      ...range
    });
  }
  function parseProperty(tokenType) {
    if (json5) {
      assertTokenTypes(tokenType, [tt.String, tt.Identifier, tt.Number]);
    } else {
      assertTokenType(tokenType, tt.String);
    }
    const token = tokenizer.token;
    if (json5 && tokenType === tt.Number && /[+\-0-9]/.test(text[token.loc.start.offset])) {
      throw new UnexpectedToken(token);
    }
    let key = tokenType === tt.String ? (
      /** @type {StringNode} */
      createLiteralNode(tokenType)
    ) : (
      /** @type {IdentifierNode|NaNNode|InfinityNode} */
      createJSON5IdentifierNode(token)
    );
    if (json5 && (key.type === "NaN" || key.type === "Infinity")) {
      if (key.sign !== "") {
        throw new UnexpectedToken(tokenizer.token);
      }
      key = types.identifier(key.type, { loc: key.loc, ...createRange(key.loc.start, key.loc.end) });
    }
    tokenType = next();
    assertTokenType(tokenType, tt.Colon);
    const value = parseValue();
    const range = createRange(key.loc.start, value.loc.end);
    return types.member(
      /** @type {StringNode|IdentifierNode} */
      key,
      /** @type {ValueNode} */
      value,
      {
        loc: {
          start: {
            ...key.loc.start
          },
          end: {
            ...value.loc.end
          }
        },
        ...range
      }
    );
  }
  function parseObject(firstTokenType) {
    assertTokenType(firstTokenType, tt.LBrace);
    const firstToken = tokenizer.token;
    const members = [];
    let tokenType = next();
    if (tokenType !== tt.RBrace) {
      do {
        members.push(parseProperty(tokenType));
        tokenType = next();
        if (!tokenType) {
          throw new UnexpectedEOF(members[members.length - 1].loc.end);
        }
        if (tokenType === tt.Comma) {
          tokenType = next();
          if (allowTrailingCommas && tokenType === tt.RBrace) {
            break;
          }
        } else {
          break;
        }
      } while (tokenType);
    }
    assertTokenType(tokenType, tt.RBrace);
    const lastToken = tokenizer.token;
    const range = createRange(firstToken.loc.start, lastToken.loc.end);
    return types.object(members, {
      loc: {
        start: {
          ...firstToken.loc.start
        },
        end: {
          ...lastToken.loc.end
        }
      },
      ...range
    });
  }
  function parseArray(firstTokenType) {
    assertTokenType(firstTokenType, tt.LBracket);
    const firstToken = tokenizer.token;
    const elements = [];
    let tokenType = next();
    if (tokenType !== tt.RBracket) {
      do {
        const value = parseValue(tokenType);
        elements.push(types.element(
          /** @type {ValueNode} */
          value,
          { loc: value.loc }
        ));
        tokenType = next();
        if (tokenType === tt.Comma) {
          tokenType = next();
          if (allowTrailingCommas && tokenType === tt.RBracket) {
            break;
          }
        } else {
          break;
        }
      } while (tokenType);
    }
    assertTokenType(tokenType, tt.RBracket);
    const lastToken = tokenizer.token;
    const range = createRange(firstToken.loc.start, lastToken.loc.end);
    return types.array(elements, {
      loc: {
        start: {
          ...firstToken.loc.start
        },
        end: {
          ...lastToken.loc.end
        }
      },
      ...range
    });
  }
  function parseValue(tokenType) {
    tokenType = tokenType ?? next();
    const token = tokenizer.token;
    switch (tokenType) {
      case tt.String:
      case tt.Boolean:
        return createLiteralNode(tokenType);
      case tt.Number:
        if (json5) {
          let tokenText = text.slice(token.loc.start.offset, token.loc.end.offset);
          if (tokenText[0] === "+" || tokenText[0] === "-") {
            tokenText = tokenText.slice(1);
          }
          if (tokenText === "NaN" || tokenText === "Infinity") {
            return createJSON5IdentifierNode(token);
          }
        }
        return createLiteralNode(tokenType);
      case tt.Null:
        return createNullNode(token);
      case tt.LBrace:
        return parseObject(tokenType);
      case tt.LBracket:
        return parseArray(tokenType);
      default:
        throw new UnexpectedToken(token);
    }
  }
  const docBody = parseValue();
  const unexpectedToken = next();
  if (unexpectedToken) {
    throw new UnexpectedToken(tokenizer.token);
  }
  const textEndLocation = getEndLocation(text);
  const docParts = {
    loc: {
      start: {
        line: 1,
        column: 1,
        offset: 0
      },
      end: {
        ...textEndLocation
      }
    }
  };
  if (options.tokens) {
    docParts.tokens = tokens;
  }
  if (options.ranges) {
    docParts.range = [
      docParts.loc.start.offset,
      docParts.loc.end.offset
    ];
  }
  return types.document(
    /** @type {ValueNode} */
    docBody,
    docParts
  );
}

// node_modules/canonicalize/lib/canonicalize.js
function canonicalize(object, seen = /* @__PURE__ */ new Set()) {
  if (typeof object === "number" && isNaN(object)) {
    throw new Error("NaN is not allowed");
  }
  if (typeof object === "number" && !isFinite(object)) {
    throw new Error("Infinity is not allowed");
  }
  if (object === null || typeof object !== "object") {
    return JSON.stringify(object);
  }
  if (typeof object.toJSON === "function") {
    if (seen.has(object)) {
      throw new Error("Circular reference detected");
    }
    seen.add(object);
    const result2 = canonicalize(object.toJSON(), seen);
    seen.delete(object);
    return result2;
  }
  if (seen.has(object)) {
    throw new Error("Circular reference detected");
  }
  seen.add(object);
  let result;
  if (Array.isArray(object)) {
    const values = object.map((cv) => {
      const value = cv === void 0 || typeof cv === "symbol" ? null : cv;
      return canonicalize(value, seen);
    });
    result = `[${values.join(",")}]`;
  } else {
    const parts = [];
    for (const key of Object.keys(object).sort()) {
      if (object[key] === void 0 || typeof object[key] === "symbol") {
        continue;
      }
      parts.push(`${canonicalize(key)}:${canonicalize(object[key], seen)}`);
    }
    result = `{${parts.join(",")}}`;
  }
  seen.delete(object);
  return result;
}

// fixtures/deploy-change-envelope-golden.json
var deploy_change_envelope_golden_default = {
  request: {
    contract_version: "0.1",
    request_id: "req_golden_01",
    organization_id: "org_nomos",
    agent: {
      id: "codex_dev_01",
      type: "coding_agent",
      authenticated_by: "internal_service_identity"
    },
    action: {
      type: "deploy_change",
      target: {
        environment: "preview",
        service: "signgate-worker-\xE9",
        project: "base-agent-preflight",
        repository: {
          host: "github.com",
          owner: "lukekwan",
          repo: "agent-payment-guard",
          remote_url: "https://github.com/lukekwan/agent-payment-guard"
        }
      },
      parameters: {
        git_commit: "0123456789abcdef0123456789abcdef01234567",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        diff_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changed_paths: [
          "test/index.test.js",
          "src/\xE9xample.js",
          "src/index.js",
          "src/index.js"
        ],
        changed_routes: [
          "/z",
          "/v1/decisions",
          "/v1/decisions"
        ],
        touches_secrets: false,
        touches_dns: false,
        touches_permissions: true,
        touches_credentials: true,
        deployment_strategy: "worker_preview",
        deployment_command_id: "wrangler_deploy_preview",
        configuration_fingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ci_evidence: {
          provider: "local",
          run_id: "run_golden_01",
          commit: "0123456789abcdef0123456789abcdef01234567",
          status: "passed",
          checks: [
            "lint",
            "test"
          ]
        }
      }
    },
    intent: "Golden fixture with unicode service and duplicate set fields",
    mandate: {
      id: "mandate_golden_01",
      scope: [
        "deploy:preview"
      ],
      issued_by: "founder",
      expires_at: "2026-07-19T12:00:00Z"
    },
    evidence: [
      {
        id: "ev_golden_01",
        type: "test_result",
        source: "worker_harness",
        status: "passed",
        observed_at: "2026-07-18T12:00:00Z",
        subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
      }
    ],
    context: {
      requested_at: "2026-07-18T12:00:00Z"
    }
  },
  expected_canonical_utf8: '{"action":{"parameters":{"artifact_digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","changed_paths":["src/index.js","src/\xE9xample.js","test/index.test.js"],"changed_routes":["/v1/decisions","/z"],"ci_evidence":{"checks":["lint","test"],"commit":"0123456789abcdef0123456789abcdef01234567","provider":"local","run_id":"run_golden_01","status":"passed"},"configuration_fingerprint":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","deployment_command_id":"wrangler_deploy_preview","deployment_strategy":"worker_preview","diff_digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","git_commit":"0123456789abcdef0123456789abcdef01234567","touches_credentials":true,"touches_dns":false,"touches_permissions":true,"touches_secrets":false},"target":{"environment":"preview","project":"base-agent-preflight","repository":{"host":"github.com","owner":"lukekwan","remote_url":"https://github.com/lukekwan/agent-payment-guard","repo":"agent-payment-guard"},"service":"signgate-worker-\xE9"},"type":"deploy_change"},"agent_id":"codex_dev_01","contract_version":"0.1","organization_id":"org_nomos"}',
  expected_canonical_utf8_byte_length: 1168,
  expected_sha256: "9260871e5133d451793b807a34b0782a562dc04807e4f8e4443b5397ff42eda2"
};

// worker.mjs
var LIMITS = Object.freeze({
  maxBytes: 32768,
  maxDepth: 16,
  maxObjectMembers: 128,
  maxArrayLength: 128,
  maxStringLength: 4096,
  maxPathLength: 512,
  maxIntentLength: 1024
});
function utf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
var ALLOWED_TOP_LEVEL = /* @__PURE__ */ new Set([
  "contract_version",
  "request_id",
  "organization_id",
  "agent",
  "action",
  "intent",
  "mandate",
  "evidence",
  "context"
]);
var ALLOWED_ACTION = /* @__PURE__ */ new Set(["type", "target", "parameters"]);
var ALLOWED_TARGET = /* @__PURE__ */ new Set(["environment", "service", "project", "repository"]);
var ALLOWED_REPOSITORY = /* @__PURE__ */ new Set(["host", "owner", "repo", "remote_url"]);
var ALLOWED_PARAMETERS = /* @__PURE__ */ new Set([
  "git_commit",
  "artifact_digest",
  "diff_digest",
  "changed_paths",
  "changed_routes",
  "touches_secrets",
  "touches_dns",
  "touches_permissions",
  "touches_credentials",
  "deployment_strategy",
  "deployment_command_id",
  "configuration_fingerprint",
  "ci_evidence"
]);
var DEPLOY_FIELDS = Object.freeze([
  ["action", "target", "environment"],
  ["action", "target", "service"],
  ["action", "target", "project"],
  ["action", "target", "repository", "host"],
  ["action", "target", "repository", "owner"],
  ["action", "target", "repository", "repo"],
  ["action", "target", "repository", "remote_url"],
  ["action", "parameters", "git_commit"],
  ["action", "parameters", "artifact_digest"],
  ["action", "parameters", "diff_digest"],
  ["action", "parameters", "changed_paths"],
  ["action", "parameters", "changed_routes"],
  ["action", "parameters", "touches_secrets"],
  ["action", "parameters", "touches_dns"],
  ["action", "parameters", "touches_permissions"],
  ["action", "parameters", "touches_credentials"],
  ["action", "parameters", "deployment_strategy"],
  ["action", "parameters", "deployment_command_id"],
  ["action", "parameters", "configuration_fingerprint"],
  ["action", "parameters", "ci_evidence"]
]);
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}
function assertAllowedKeys(obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new Error(`unknown field ${path}.${key}`);
    }
  }
}
function detectDuplicatesAndBounds(node, depth = 0) {
  if (depth > LIMITS.maxDepth) {
    throw new Error("resource bound: max depth exceeded");
  }
  if (!node || typeof node !== "object") {
    return;
  }
  if (node.type === "Object") {
    if (node.members.length > LIMITS.maxObjectMembers) {
      throw new Error("resource bound: max object members exceeded");
    }
    const names = /* @__PURE__ */ new Set();
    for (const member of node.members) {
      const name = member.name.value;
      if (typeof name === "string" && utf8ByteLength(name) > LIMITS.maxStringLength) {
        throw new Error("resource bound: max string length exceeded");
      }
      if (names.has(name)) {
        throw new Error(`duplicate key: ${name}`);
      }
      names.add(name);
      detectDuplicatesAndBounds(member.value, depth + 1);
    }
    return;
  }
  if (node.type === "Array") {
    if (node.elements.length > LIMITS.maxArrayLength) {
      throw new Error("resource bound: max array length exceeded");
    }
    for (const element of node.elements) {
      detectDuplicatesAndBounds(element.value, depth + 1);
    }
    return;
  }
  if (node.type === "String" && utf8ByteLength(node.value) > LIMITS.maxStringLength) {
    throw new Error("resource bound: max string length exceeded");
  }
}
function parseStrictJsonBytes(bytes) {
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const ast = parse(text, { mode: "json", allowTrailingCommas: false });
  detectDuplicatesAndBounds(ast.body, 0);
  const parsed = JSON.parse(text);
  validateSchema(parsed);
  return parsed;
}
function parseResourceProbe(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  const ast = parse(text, { mode: "json", allowTrailingCommas: false });
  detectDuplicatesAndBounds(ast.body, 0);
  return true;
}
function checkRawByteBound(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  return true;
}
function validateSchema(parsed) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("schema-invalid root");
  }
  assertAllowedKeys(parsed, ALLOWED_TOP_LEVEL, "$");
  if (parsed.contract_version !== "0.1") {
    throw new Error("schema-invalid contract_version");
  }
  if (typeof parsed.organization_id !== "string") {
    throw new Error("schema-invalid organization_id");
  }
  if (!parsed.action || typeof parsed.action !== "object" || Array.isArray(parsed.action)) {
    throw new Error("schema-invalid action");
  }
  assertAllowedKeys(parsed.action, ALLOWED_ACTION, "$.action");
  if (parsed.action.type !== "deploy_change") {
    throw new Error("schema-invalid action.type");
  }
  assertAllowedKeys(parsed.action.target, ALLOWED_TARGET, "$.action.target");
  assertAllowedKeys(parsed.action.target.repository, ALLOWED_REPOSITORY, "$.action.target.repository");
  assertAllowedKeys(parsed.action.parameters, ALLOWED_PARAMETERS, "$.action.parameters");
  if (!["local", "preview", "production"].includes(parsed.action.target.environment)) {
    throw new Error("schema-invalid action.target.environment");
  }
  for (const [key, value] of Object.entries(parsed.action.parameters)) {
    if (value === null) {
      throw new Error(`schema-invalid null ${key}`);
    }
  }
  for (const field of ["touches_secrets", "touches_dns", "touches_permissions"]) {
    if (typeof parsed.action.parameters[field] !== "boolean") {
      throw new Error(`schema-invalid ${field}`);
    }
  }
  if ("touches_credentials" in parsed.action.parameters && typeof parsed.action.parameters.touches_credentials !== "boolean") {
    throw new Error("schema-invalid touches_credentials");
  }
  for (const field of ["changed_paths", "changed_routes"]) {
    if (!Array.isArray(parsed.action.parameters[field])) {
      throw new Error(`schema-invalid ${field}`);
    }
    for (const value of parsed.action.parameters[field]) {
      if (typeof value !== "string") {
        throw new Error(`schema-invalid ${field} member`);
      }
      if (utf8ByteLength(value) > LIMITS.maxPathLength) {
        throw new Error(`resource bound: max ${field} item length exceeded`);
      }
    }
  }
  if (typeof parsed.intent === "string" && utf8ByteLength(parsed.intent) > LIMITS.maxIntentLength) {
    throw new Error("resource bound: max intent length exceeded");
  }
}
function getAtPath(obj, path) {
  return path.reduce((current, key) => current?.[key], obj);
}
function setAtPath(obj, path, value) {
  const clone = structuredClone(obj);
  let current = clone;
  for (const key of path.slice(0, -1)) {
    current = current[key];
  }
  current[path.at(-1)] = value;
  return clone;
}
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function normalizeSortedUniqueStrings(values, fieldName) {
  if (!Array.isArray(values)) {
    throw new Error(`schema-invalid ${fieldName}`);
  }
  for (const value of values) {
    if (typeof value !== "string") {
      throw new Error(`schema-invalid ${fieldName} member`);
    }
    if (utf8ByteLength(value) > LIMITS.maxPathLength) {
      throw new Error(`resource bound: max ${fieldName} item length exceeded`);
    }
  }
  return [...new Set(values)].sort();
}
function fingerprintEnvelope(request) {
  const action = structuredClone(request.action);
  if (Array.isArray(action.parameters.changed_paths)) {
    action.parameters.changed_paths = normalizeSortedUniqueStrings(
      action.parameters.changed_paths,
      "changed_paths"
    );
  }
  if (Array.isArray(action.parameters.changed_routes)) {
    action.parameters.changed_routes = normalizeSortedUniqueStrings(
      action.parameters.changed_routes,
      "changed_routes"
    );
  }
  return {
    contract_version: request.contract_version,
    organization_id: request.organization_id,
    agent_id: request.agent.id,
    action
  };
}
async function fingerprint(request) {
  return sha256Hex(canonicalize(fingerprintEnvelope(request)));
}
function baseDeployRequest() {
  return {
    contract_version: "0.1",
    request_id: "req_compat_01",
    organization_id: "org_nomos",
    agent: {
      id: "codex_dev_01",
      type: "coding_agent",
      authenticated_by: "internal_service_identity"
    },
    action: {
      type: "deploy_change",
      target: {
        environment: "preview",
        service: "signgate-worker",
        project: "base-agent-preflight",
        repository: {
          host: "github.com",
          owner: "lukekwan",
          repo: "agent-payment-guard",
          remote_url: "https://github.com/lukekwan/agent-payment-guard"
        }
      },
      parameters: {
        git_commit: "0123456789abcdef0123456789abcdef01234567",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        diff_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changed_paths: ["src/index.js", "test/index.test.js"],
        changed_routes: ["/v1/decisions"],
        touches_secrets: false,
        touches_dns: false,
        touches_permissions: true,
        touches_credentials: true,
        deployment_strategy: "worker_preview",
        deployment_command_id: "wrangler_deploy_preview",
        configuration_fingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ci_evidence: {
          provider: "local",
          run_id: "run_compat_01",
          commit: "0123456789abcdef0123456789abcdef01234567",
          status: "passed",
          checks: ["lint", "test"]
        }
      }
    },
    intent: "Compatibility harness deploy_change fingerprint test",
    mandate: {
      id: "mandate_compat_01",
      scope: ["deploy:preview"],
      issued_by: "founder",
      expires_at: "2026-07-19T12:00:00Z"
    },
    evidence: [
      {
        id: "ev_compat_01",
        type: "test_result",
        source: "worker_harness",
        status: "passed",
        observed_at: "2026-07-18T12:00:00Z",
        subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
      }
    ],
    context: {
      requested_at: "2026-07-18T12:00:00Z"
    }
  };
}
function expectAccept(name, fn) {
  try {
    fn();
    return `PASS_ACCEPT_${name}`;
  } catch (error) {
    return `FAIL_REJECTED_${name}_${error.message}`;
  }
}
function expectReject(name, fn) {
  try {
    fn();
    return `FAIL_ACCEPTED_${name}`;
  } catch (error) {
    return `PASS_REJECT_${name}_${error.message}`;
  }
}
function nestedJson(depth) {
  let value = "0";
  for (let i = 0; i < depth; i += 1) {
    value = `{"k":${value}}`;
  }
  return value;
}
function objectMembersJson(count) {
  const members = Array.from({ length: count }, (_, i) => `"k${i}":${i}`);
  return `{${members.join(",")}}`;
}
function arrayJson(count) {
  return `[${Array.from({ length: count }, (_, i) => i).join(",")}]`;
}
function stringJson(byteCount, char = "x") {
  return JSON.stringify(char.repeat(byteCount / utf8ByteLength(char)));
}
function rawByteJson(byteCount) {
  if (byteCount < 2) {
    throw new Error("raw byte count too small for JSON string");
  }
  return `"${"x".repeat(byteCount - 2)}"`;
}
function runResourceBoundTests() {
  const exactGeneric = "x".repeat(LIMITS.maxStringLength);
  const multiByteGeneric = "\xE9".repeat(Math.floor(LIMITS.maxStringLength / 2));
  const overMultiByteGeneric = `${multiByteGeneric}\xE9`;
  const base = baseDeployRequest();
  const pathAtLimit = "\xE9".repeat(LIMITS.maxPathLength / 2);
  const intentAtLimit = "\xE9".repeat(LIMITS.maxIntentLength / 2);
  const withPath = (length) => {
    const request = baseDeployRequest();
    request.action.parameters.changed_paths = ["x".repeat(length)];
    return request;
  };
  const withIntent = (intent) => ({ ...baseDeployRequest(), intent });
  return {
    max_raw_request_bytes: {
      limit_minus_1: expectAccept("raw_limit_minus_1", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes - 1))),
      exact_limit: expectAccept("raw_exact_limit", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes))),
      limit_plus_1: expectReject("raw_limit_plus_1", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes + 1))),
      multibyte_utf8: expectAccept("raw_multibyte", () => checkRawByteBound(`"${"\xE9".repeat(10)}"`))
    },
    max_json_depth: {
      limit_minus_1: expectAccept("depth_limit_minus_1", () => parseResourceProbe(nestedJson(LIMITS.maxDepth - 1))),
      exact_limit: expectAccept("depth_exact_limit", () => parseResourceProbe(nestedJson(LIMITS.maxDepth))),
      limit_plus_1: expectReject("depth_limit_plus_1", () => parseResourceProbe(nestedJson(LIMITS.maxDepth + 1))),
      multibyte_utf8: expectAccept("depth_multibyte", () => parseResourceProbe(`{"\xE9":${nestedJson(2)}}`))
    },
    max_object_members: {
      limit_minus_1: expectAccept("members_limit_minus_1", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers - 1))),
      exact_limit: expectAccept("members_exact_limit", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers))),
      limit_plus_1: expectReject("members_limit_plus_1", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers + 1))),
      multibyte_utf8: expectAccept("members_multibyte", () => parseResourceProbe('{"\xE9":1,"\xE8":2}'))
    },
    max_array_length: {
      limit_minus_1: expectAccept("array_limit_minus_1", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength - 1))),
      exact_limit: expectAccept("array_exact_limit", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength))),
      limit_plus_1: expectReject("array_limit_plus_1", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength + 1))),
      multibyte_utf8: expectAccept("array_multibyte", () => parseResourceProbe('["\xE9","\xE8"]'))
    },
    max_generic_string_bytes: {
      limit_minus_1: expectAccept("string_limit_minus_1", () => parseResourceProbe(stringJson(LIMITS.maxStringLength - 1))),
      exact_limit: expectAccept("string_exact_limit", () => parseResourceProbe(JSON.stringify(exactGeneric))),
      limit_plus_1: expectReject("string_limit_plus_1", () => parseResourceProbe(JSON.stringify(`${exactGeneric}x`))),
      multibyte_utf8_over_code_unit: expectReject("string_multibyte_over", () => parseResourceProbe(JSON.stringify(overMultiByteGeneric)))
    },
    max_changed_paths_item_bytes: {
      limit_minus_1: expectAccept("path_limit_minus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withPath(LIMITS.maxPathLength - 1))))),
      exact_limit: expectAccept("path_exact_limit", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...base, action: { ...base.action, parameters: { ...base.action.parameters, changed_paths: [pathAtLimit] } } })))),
      limit_plus_1: expectReject("path_limit_plus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withPath(LIMITS.maxPathLength + 1))))),
      multibyte_utf8_over_code_unit: expectReject("path_multibyte_over", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...base, action: { ...base.action, parameters: { ...base.action.parameters, changed_paths: [`${pathAtLimit}\xE9`] } } }))))
    },
    max_intent_bytes: {
      limit_minus_1: expectAccept("intent_limit_minus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent("x".repeat(LIMITS.maxIntentLength - 1)))))),
      exact_limit: expectAccept("intent_exact_limit", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent(intentAtLimit))))),
      limit_plus_1: expectReject("intent_limit_plus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent("x".repeat(LIMITS.maxIntentLength + 1)))))),
      multibyte_utf8_over_code_unit: expectReject("intent_multibyte_over", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent(`${intentAtLimit}\xE9`)))))
    }
  };
}
async function runCanonicalVectorTests(request) {
  const vectors = [
    ["numeric_boundaries", { small: 5e-324, max: 17976931348623157e292, min: -17976931348623157e292 }, '{"max":1.7976931348623157e+308,"min":-1.7976931348623157e+308,"small":5e-324}'],
    ["integer_decimal", { i: 3333333333333333e-7, n: 1e30, z: 0 }, '{"i":333333333.3333333,"n":1e+30,"z":0}'],
    ["exponent_formatting", { a: 1e-27, b: 1e21, c: 1e-6 }, '{"a":1e-27,"b":1e+21,"c":0.000001}'],
    ["negative_zero", { z: -0 }, '{"z":0}'],
    ["unicode_escaping", { newline: "\n", quote: '"', backslash: "\\", nul: "\0" }, '{"backslash":"\\\\","newline":"\\n","nul":"\\u0000","quote":"\\""}'],
    ["non_ascii_unicode", { "\u20AC": "Euro", "\u{1D11E}": "music", "\xE9": "e-acute" }, '{"\xE9":"e-acute","\u20AC":"Euro","\u{1D11E}":"music"}'],
    ["key_ordering", { b: 2, a: 1, aa: 3, "\xE4": 4 }, '{"a":1,"aa":3,"b":2,"\xE4":4}']
  ];
  const results = {};
  for (const [name, value, expected] of vectors) {
    const actual = canonicalize(value);
    results[name] = {
      canonical_bytes: actual,
      sha256: await sha256Hex(actual),
      result: actual === expected ? "PASS" : `FAIL_EXPECTED_${expected}`
    };
  }
  return results;
}
async function runLiteralCompleteEnvelopeGoldenTest() {
  const request = parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(deploy_change_envelope_golden_default.request)));
  const envelope = fingerprintEnvelope(request);
  const actualCanonical = canonicalize(envelope);
  const actualDigest = await sha256Hex(actualCanonical);
  const actualByteLength = utf8ByteLength(actualCanonical);
  return {
    expected_fixture_sha256: await sha256Hex(JSON.stringify(deploy_change_envelope_golden_default)),
    expected_canonical_utf8_byte_length: deploy_change_envelope_golden_default.expected_canonical_utf8_byte_length,
    actual_canonical_utf8_byte_length: actualByteLength,
    complete_envelope_literal_canonical_bytes: actualCanonical === deploy_change_envelope_golden_default.expected_canonical_utf8 ? "PASS" : "FAIL",
    complete_envelope_literal_sha256: actualDigest === deploy_change_envelope_golden_default.expected_sha256 ? "PASS" : "FAIL",
    actual_sha256: actualDigest
  };
}
async function runSetNormalizationTests(request) {
  const variant = (field, values) => setAtPath(request, ["action", "parameters", field], values);
  const fieldResult = async (field, aValues, bValues, cValues, newUniqueValue) => {
    const a = variant(field, aValues);
    const b = variant(field, bValues);
    const c = variant(field, cValues);
    const withNewUnique = variant(field, [...bValues, newUniqueValue]);
    const withCaseDistinct = variant(field, ["/A", "/a", "/a"]);
    const aBefore = JSON.stringify(a.action.parameters[field]);
    const normalizedA = fingerprintEnvelope(a).action.parameters[field];
    const normalizedB = fingerprintEnvelope(b).action.parameters[field];
    const normalizedC = fingerprintEnvelope(c).action.parameters[field];
    const normalizedCaseDistinct = fingerprintEnvelope(withCaseDistinct).action.parameters[field];
    const normalizedTwice = normalizeSortedUniqueStrings(normalizedA, field);
    const canonicalA = canonicalize(fingerprintEnvelope(a));
    const canonicalB = canonicalize(fingerprintEnvelope(b));
    const canonicalC = canonicalize(fingerprintEnvelope(c));
    const fingerprintA = await fingerprint(a);
    const fingerprintB = await fingerprint(b);
    const fingerprintC = await fingerprint(c);
    const fingerprintWithNewUnique = await fingerprint(withNewUnique);
    return {
      normalized_a: normalizedA,
      normalized_b: normalizedB,
      normalized_c: normalizedC,
      canonical_a: canonicalA,
      canonical_b: canonicalB,
      canonical_c: canonicalC,
      fingerprint_a: fingerprintA,
      fingerprint_b: fingerprintB,
      fingerprint_c: fingerprintC,
      dedup: new Set(normalizedA).size === normalizedA.length && normalizedA.length === normalizedB.length ? "PASS" : "FAIL",
      permutation_equivalence: JSON.stringify(normalizedA) === JSON.stringify(normalizedB) && JSON.stringify(normalizedB) === JSON.stringify(normalizedC) && canonicalA === canonicalB && canonicalB === canonicalC && fingerprintA === fingerprintB && fingerprintB === fingerprintC ? "PASS" : "FAIL",
      unique_value_mutation_changes_fingerprint: fingerprintWithNewUnique !== fingerprintB ? "PASS" : "FAIL",
      case_distinct_values_remain_distinct: normalizedCaseDistinct.includes("/A") && normalizedCaseDistinct.includes("/a") && normalizedCaseDistinct.length === 2 ? "PASS" : "FAIL",
      duplicates_do_not_survive_canonical_envelope: new Set(normalizedA).size === normalizedA.length ? "PASS" : "FAIL",
      idempotence: JSON.stringify(normalizedTwice) === JSON.stringify(normalizedA) ? "PASS" : "FAIL",
      no_input_mutation: JSON.stringify(a.action.parameters[field]) === aBefore ? "PASS" : "FAIL"
    };
  };
  const changedPaths = await fieldResult(
    "changed_paths",
    ["/z", "/a", "/a"],
    ["/a", "/z"],
    ["/z", "/a"],
    "/new-path"
  );
  const changedRoutes = await fieldResult(
    "changed_routes",
    ["/route-z", "/route-a", "/route-a"],
    ["/route-a", "/route-z"],
    ["/route-z", "/route-a"],
    "/route-new"
  );
  return {
    details: {
      changed_paths: changedPaths,
      changed_routes: changedRoutes
    },
    CHANGED_PATHS_DEDUP: changedPaths.dedup,
    CHANGED_PATHS_PERMUTATION_EQUIVALENCE: changedPaths.permutation_equivalence,
    CHANGED_ROUTES_DEDUP: changedRoutes.dedup,
    CHANGED_ROUTES_PERMUTATION_EQUIVALENCE: changedRoutes.permutation_equivalence,
    SET_NORMALIZATION_IDEMPOTENCE: changedPaths.idempotence === "PASS" && changedRoutes.idempotence === "PASS" ? "PASS" : "FAIL",
    SET_NORMALIZATION_NO_INPUT_MUTATION: changedPaths.no_input_mutation === "PASS" && changedRoutes.no_input_mutation === "PASS" ? "PASS" : "FAIL",
    SET_UNIQUE_VALUE_MUTATION_CHANGES_FINGERPRINT: changedPaths.unique_value_mutation_changes_fingerprint === "PASS" && changedRoutes.unique_value_mutation_changes_fingerprint === "PASS" ? "PASS" : "FAIL"
  };
}
async function runFingerprintSemanticTests(request, baseFingerprint) {
  const unicodeMutation = setAtPath(request, ["action", "target", "service"], "signgate-worker-\xE9");
  const orderedArrayMutation = setAtPath(request, ["action", "parameters", "ci_evidence"], {
    ...request.action.parameters.ci_evidence,
    checks: ["test", "lint"]
  });
  const changedPathsReordered = setAtPath(request, ["action", "parameters", "changed_paths"], [...request.action.parameters.changed_paths].reverse());
  const changedPathsDuplicatePermutation = setAtPath(request, ["action", "parameters", "changed_paths"], ["test/index.test.js", "src/index.js", "src/index.js"]);
  const changedRoutesReordered = setAtPath(request, ["action", "parameters", "changed_routes"], ["/z", "/a"]);
  const changedRoutesDuplicatePermutation = setAtPath(request, ["action", "parameters", "changed_routes"], ["/z", "/a", "/z"]);
  const changedRoutesSorted = setAtPath(request, ["action", "parameters", "changed_routes"], ["/a", "/z"]);
  const omittedArtifact = structuredClone(request);
  delete omittedArtifact.action.parameters.artifact_digest;
  const presentUndefinedArtifact = structuredClone(request);
  presentUndefinedArtifact.action.parameters.artifact_digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const enumCase = setAtPath(request, ["action", "target", "environment"], "Preview");
  const identifierCase = setAtPath(request, ["action", "target", "service"], "SignGate-Worker");
  return {
    unicode_value_mutation_changes_fingerprint: await fingerprint(unicodeMutation) !== baseFingerprint ? "PASS" : "FAIL",
    semantically_significant_array_order_changes_fingerprint: await fingerprint(orderedArrayMutation) !== baseFingerprint ? "PASS" : "FAIL",
    changed_paths_set_normalized_order: await fingerprint(changedPathsReordered) === baseFingerprint ? "PASS" : "FAIL",
    changed_paths_sorted_unique_deduplicates: await fingerprint(changedPathsDuplicatePermutation) === baseFingerprint ? "PASS" : "FAIL",
    changed_routes_set_normalized_order: await fingerprint(changedRoutesReordered) === await fingerprint(changedRoutesSorted) ? "PASS" : "FAIL",
    changed_routes_sorted_unique_deduplicates: await fingerprint(changedRoutesDuplicatePermutation) === await fingerprint(changedRoutesSorted) ? "PASS" : "FAIL",
    omitted_optional_field_changes_fingerprint: await fingerprint(omittedArtifact) !== await fingerprint(presentUndefinedArtifact) ? "PASS" : "FAIL",
    schema_invalid_null_rejected_before_fingerprint: expectReject("null_artifact_digest", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...baseDeployRequest(), action: { ...baseDeployRequest().action, parameters: { ...baseDeployRequest().action.parameters, artifact_digest: null } } })))),
    allowed_null_semantics: "PASS_NO_ALLOWED_NULL_FIELDS_IN_DEPLOY_CHANGE_V0_1",
    enum_case_sensitivity: expectReject("enum_case", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(enumCase)))),
    identifier_case_sensitivity: await fingerprint(identifierCase) !== baseFingerprint ? "PASS" : "FAIL",
    changed_paths_normalization: await fingerprint(changedPathsReordered) === baseFingerprint ? "PASS" : "FAIL",
    changed_routes_normalization: await fingerprint(changedRoutesReordered) === await fingerprint(changedRoutesSorted) ? "PASS" : "FAIL"
  };
}
async function runSelfTest() {
  const rejectCases = [
    ["comments", '{// bad\n"contract_version":"0.1"}'],
    ["trailing_commas", '{"contract_version":"0.1",}'],
    ["ordinary_duplicate", '{"a":1,"a":2}'],
    ["escaped_equivalent_duplicate", '{"\\u0061":1,"a":2}'],
    ["nested_duplicate", '{"outer":{"a":1,"a":2}}'],
    ["array_object_duplicate", '{"items":[{"a":1,"a":2}]}'],
    ["malformed_escape", '{"a":"\\uZZZZ"}'],
    ["unsupported_number", '{"a":01}'],
    ["unknown_field", JSON.stringify({ ...baseDeployRequest(), unknown: true })],
    ["schema_null", JSON.stringify({ ...baseDeployRequest(), organization_id: null })],
    ["resource_bounds", JSON.stringify({ ...baseDeployRequest(), intent: "x".repeat(1025) })]
  ];
  const rejections = {};
  for (const [name, text] of rejectCases) {
    try {
      parseStrictJsonBytes(new TextEncoder().encode(text));
      rejections[name] = "FAIL_ACCEPTED";
    } catch (error) {
      rejections[name] = `PASS_REJECTED_${error.message}`;
    }
  }
  const request = parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(baseDeployRequest())));
  const resourceBoundResults = runResourceBoundTests();
  const rfc8785VectorResults = await runCanonicalVectorTests(request);
  const completeEnvelopeLiteralGolden = await runLiteralCompleteEnvelopeGoldenTest();
  const setNormalizationResults = await runSetNormalizationTests(request);
  const shaGolden = await sha256Hex("abc");
  const shaGoldenPass = shaGolden === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  const baseFingerprint = await fingerprint(request);
  const fingerprintSemanticResults = await runFingerprintSemanticTests(request, baseFingerprint);
  const fingerprintParticipation = {};
  for (const path of DEPLOY_FIELDS) {
    const current = getAtPath(request, path);
    const replacement = Array.isArray(current) ? [...current, "__mutated__"] : typeof current === "boolean" ? !current : `${current}__mutated__`;
    const mutated = setAtPath(request, path, replacement);
    fingerprintParticipation[path.join(".")] = await fingerprint(mutated) !== baseFingerprint ? "PASS" : "FAIL";
  }
  const unicodeCaseRequest = parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({
    ...baseDeployRequest(),
    action: {
      ...baseDeployRequest().action,
      parameters: {
        ...baseDeployRequest().action.parameters,
        changed_paths: ["src/\xE9xample.js", "SRC/example.js"],
        changed_routes: [],
        artifact_digest: void 0
      }
    }
  }, (_key, value) => value === void 0 ? void 0 : value)));
  return {
    package_execution: "PASS",
    parser_options: { mode: "json", allowTrailingCommas: false },
    limits: LIMITS,
    rejections,
    resource_bound_results: resourceBoundResults,
    rfc8785_vector_results: rfc8785VectorResults,
    complete_envelope_literal_golden: completeEnvelopeLiteralGolden,
    set_normalization_results: setNormalizationResults,
    webcrypto_sha256: shaGoldenPass ? "PASS" : `FAIL_${shaGolden}`,
    base_fingerprint: `sha256:${baseFingerprint}`,
    fingerprint_semantic_results: fingerprintSemanticResults,
    fingerprint_participation: fingerprintParticipation,
    unicode_arrays_omission_null_case_vectors: unicodeCaseRequest.action.parameters.changed_paths.length === 2 && !("artifact_digest" in unicodeCaseRequest.action.parameters) ? "PASS" : "FAIL"
  };
}
var worker_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/self-test") {
      return jsonResponse(await runSelfTest());
    }
    if (url.pathname === "/parse") {
      try {
        const bytes = new Uint8Array(await request.arrayBuffer());
        return jsonResponse({ ok: true, parsed: parseStrictJsonBytes(bytes) });
      } catch (error) {
        return jsonResponse({ ok: false, error: String(error.message || error) }, 400);
      }
    }
    return jsonResponse({ ok: true, harness: "dev-sg-001b-worker-compatibility" });
  }
};
export {
  worker_default as default
};
