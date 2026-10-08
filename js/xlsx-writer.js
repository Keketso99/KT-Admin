// =========================================================
// KT ADMIN — XLSX WRITER (no libraries, no network)
// Builds a real .xlsx file (zip of XML parts, "stored" = uncompressed).
//
//   var bytes = KTXlsx.build({
//     sheets: [{
//       name: "Summary",
//       widths: [30, 18, 18],              // column widths (characters)
//       freeze: { rows: 1 },               // optional: freeze header rows
//       merges: ["A1:C1"],                 // optional
//       rows: [
//         [ {v:"Title", s:"title"} ],
//         [ "Text", 12.5, {v:34, s:"money"}, {f:"B2+C2", v:46.5, s:"money"} ],
//         ...
//       ]
//     }]
//   });
//   KTXlsx.download(bytes, "report.xlsx");
//
// Cell values:  null | number | string | Date | { v, f, s }
//   f = formula text without "=" ; v = value shown until the app recalculates
//   s = style name: title, header, section, bold, money, moneyBold, date,
//       note, good, bad, wrap, int, pct
// =========================================================

(function(){

    var enc = new TextEncoder();

    // ---------------------------------------------------------
    // Styles
    // ---------------------------------------------------------
    var NUMFMTS = {
        money: '"R"#,##0.00;[Red]-"R"#,##0.00',
        date:  'yyyy-mm-dd hh:mm',
        pct:   '0.00%',
        int:   '#,##0'
    };
    var NUMFMT_IDS = { money: 164, date: 165, pct: 166, int: 167 };

    var FONTS = [
        '<font><sz val="11"/><name val="Calibri"/></font>',                                              // 0 normal
        '<font><b/><sz val="11"/><name val="Calibri"/></font>',                                          // 1 bold
        '<font><b/><sz val="16"/><color rgb="FF0F2A55"/><name val="Calibri"/></font>',                   // 2 title
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',                   // 3 header (white)
        '<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>',                   // 4 note
        '<font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/></font>',                   // 5 good
        '<font><b/><sz val="11"/><color rgb="FF991B1B"/><name val="Calibri"/></font>'                    // 6 bad
    ];

    var FILLS = [
        '<fill><patternFill patternType="none"/></fill>',
        '<fill><patternFill patternType="gray125"/></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FF0F2A55"/><bgColor indexed="64"/></patternFill></fill>', // 2 header
        '<fill><patternFill patternType="solid"><fgColor rgb="FFE5ECF6"/><bgColor indexed="64"/></patternFill></fill>', // 3 section
        '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>', // 4 good
        '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>'  // 5 bad
    ];

    var BORDERS = [
        '<border><left/><right/><top/><bottom/><diagonal/></border>',
        '<border><left/><right/><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="double"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>'  // 1 total line
    ];

    // name -> [numFmt, font, fill, border, wrap]
    var STYLES = {
        "default":   [null,    0, 0, 0, false],
        "title":     [null,    2, 0, 0, false],
        "header":    [null,    3, 2, 0, false],
        "section":   [null,    1, 3, 0, false],
        "bold":      [null,    1, 0, 0, false],
        "money":     ["money", 0, 0, 0, false],
        "moneyBold": ["money", 1, 0, 1, false],
        "date":      ["date",  0, 0, 0, false],
        "note":      [null,    4, 0, 0, true],
        "good":      [null,    5, 4, 0, false],
        "bad":       [null,    6, 5, 0, false],
        "wrap":      [null,    0, 0, 0, true],
        "int":       ["int",   0, 0, 0, false],
        "pct":       ["pct",   0, 0, 0, false]
    };
    var STYLE_NAMES = Object.keys(STYLES);

    function stylesXml(){
        var numFmts = Object.keys(NUMFMTS).map(function(k){
            return '<numFmt numFmtId="' + NUMFMT_IDS[k] + '" formatCode="' + esc(NUMFMTS[k]) + '"/>';
        }).join("");

        var xfs = STYLE_NAMES.map(function(n){
            var d = STYLES[n];
            var numId = d[0] ? NUMFMT_IDS[d[0]] : 0;
            return '<xf numFmtId="' + numId + '" fontId="' + d[1] + '" fillId="' + d[2] + '" borderId="' + d[3] +
                '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"' +
                (d[4] ? ' applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' : '/>');
        }).join("");

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<numFmts count="' + Object.keys(NUMFMTS).length + '">' + numFmts + '</numFmts>' +
            '<fonts count="' + FONTS.length + '">' + FONTS.join("") + '</fonts>' +
            '<fills count="' + FILLS.length + '">' + FILLS.join("") + '</fills>' +
            '<borders count="' + BORDERS.length + '">' + BORDERS.join("") + '</borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="' + STYLE_NAMES.length + '">' + xfs + '</cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>';
    }

    // ---------------------------------------------------------
    // XML helpers
    // ---------------------------------------------------------
    function esc(s){
        return String(s)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function colName(i){            // 0 -> A, 25 -> Z, 26 -> AA
        var s = "";
        i = i + 1;
        while(i > 0){
            var m = (i - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            i = Math.floor((i - 1) / 26);
        }
        return s;
    }

    function styleIndex(name){
        var i = STYLE_NAMES.indexOf(name || "default");
        return i < 0 ? 0 : i;
    }

    function excelDate(d){
        // local wall-clock time, so the sheet shows the admin's own time
        return (d.getTime() - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
    }

    function cellXml(ref, cell){
        if(cell === null || cell === undefined || cell === "") return "";

        var v = cell, f = null, s = "default";
        if(cell && typeof cell === "object" && !(cell instanceof Date)){
            v = cell.v; f = cell.f || null; s = cell.s || "default";
        }

        var si = styleIndex(s);
        var sAttr = si ? ' s="' + si + '"' : "";

        if(v instanceof Date){
            if(s === "default") sAttr = ' s="' + styleIndex("date") + '"';
            v = excelDate(v);
        }

        if(f){
            var fx = '<f>' + esc(f) + '</f>';
            if(typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + sAttr + '>' + fx + '<v>' + v + '</v></c>';
            if(typeof v === "string") return '<c r="' + ref + '"' + sAttr + ' t="str">' + fx + '<v>' + esc(v) + '</v></c>';
            return '<c r="' + ref + '"' + sAttr + '>' + fx + '</c>';
        }

        if(typeof v === "number"){
            if(!isFinite(v)) return "";
            return '<c r="' + ref + '"' + sAttr + '><v>' + v + '</v></c>';
        }
        if(typeof v === "boolean"){
            return '<c r="' + ref + '"' + sAttr + ' t="b"><v>' + (v ? 1 : 0) + '</v></c>';
        }
        return '<c r="' + ref + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
    }

    function sheetXml(sheet){
        var rows = sheet.rows || [];
        var maxCols = 1;
        rows.forEach(function(r){ if(r.length > maxCols) maxCols = r.length; });

        var cols = "";
        if(sheet.widths && sheet.widths.length){
            cols = '<cols>' + sheet.widths.map(function(w, i){
                return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
            }).join("") + '</cols>';
        }

        var pane = "";
        if(sheet.freeze && sheet.freeze.rows){
            var top = sheet.freeze.rows + 1;
            pane = '<pane ySplit="' + sheet.freeze.rows + '" topLeftCell="A' + top + '" activePane="bottomLeft" state="frozen"/>' +
                   '<selection pane="bottomLeft" activeCell="A' + top + '" sqref="A' + top + '"/>';
        }

        var data = rows.map(function(r, ri){
            var cells = r.map(function(c, ci){ return cellXml(colName(ci) + (ri + 1), c); }).join("");
            return cells ? '<row r="' + (ri + 1) + '">' + cells + '</row>' : '<row r="' + (ri + 1) + '"/>';
        }).join("");

        var merges = "";
        if(sheet.merges && sheet.merges.length){
            merges = '<mergeCells count="' + sheet.merges.length + '">' +
                sheet.merges.map(function(m){ return '<mergeCell ref="' + m + '"/>'; }).join("") + '</mergeCells>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<dimension ref="A1:' + colName(maxCols - 1) + Math.max(rows.length, 1) + '"/>' +
            '<sheetViews><sheetView workbookViewId="0"' + (sheet.hideGrid ? ' showGridLines="0"' : '') + '>' + pane + '</sheetView></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="15"/>' + cols +
            '<sheetData>' + data + '</sheetData>' + merges +
            '</worksheet>';
    }

    // ---------------------------------------------------------
    // ZIP (stored)
    // ---------------------------------------------------------
    var CRC_TABLE = null;
    function crc32(bytes){
        if(!CRC_TABLE){
            CRC_TABLE = new Uint32Array(256);
            for(var n = 0; n < 256; n++){
                var c = n;
                for(var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                CRC_TABLE[n] = c >>> 0;
            }
        }
        var crc = 0xFFFFFFFF;
        for(var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function zip(files){          // files: [{name, data(Uint8Array)}]
        var now = new Date();
        var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

        var parts = [], central = [], offset = 0;

        files.forEach(function(f){
            var name = enc.encode(f.name);
            var crc = crc32(f.data);
            var size = f.data.length;

            var lh = new DataView(new ArrayBuffer(30));
            lh.setUint32(0, 0x04034b50, true);
            lh.setUint16(4, 20, true);
            lh.setUint16(6, 0x0800, true);
            lh.setUint16(8, 0, true);
            lh.setUint16(10, dosTime, true);
            lh.setUint16(12, dosDate, true);
            lh.setUint32(14, crc, true);
            lh.setUint32(18, size, true);
            lh.setUint32(22, size, true);
            lh.setUint16(26, name.length, true);
            lh.setUint16(28, 0, true);

            parts.push(new Uint8Array(lh.buffer), name, f.data);

            var ch = new DataView(new ArrayBuffer(46));
            ch.setUint32(0, 0x02014b50, true);
            ch.setUint16(4, 20, true);
            ch.setUint16(6, 20, true);
            ch.setUint16(8, 0x0800, true);
            ch.setUint16(10, 0, true);
            ch.setUint16(12, dosTime, true);
            ch.setUint16(14, dosDate, true);
            ch.setUint32(16, crc, true);
            ch.setUint32(20, size, true);
            ch.setUint32(24, size, true);
            ch.setUint16(28, name.length, true);
            ch.setUint32(42, offset, true);
            central.push(new Uint8Array(ch.buffer), name);

            offset += 30 + name.length + size;
        });

        var centralSize = central.reduce(function(n, p){ return n + p.length; }, 0);

        var end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);

        var all = parts.concat(central, [new Uint8Array(end.buffer)]);
        var total = all.reduce(function(n, p){ return n + p.length; }, 0);
        var out = new Uint8Array(total), pos = 0;
        all.forEach(function(p){ out.set(p, pos); pos += p.length; });
        return out;
    }

    // ---------------------------------------------------------
    // Workbook
    // ---------------------------------------------------------
    function safeSheetName(n, used){
        var name = String(n || "Sheet").replace(/[\[\]\:\*\?\/\\]/g, " ").trim().slice(0, 31) || "Sheet";
        var base = name, i = 2;
        while(used.indexOf(name.toLowerCase()) !== -1){
            name = base.slice(0, 28) + " " + i++;
        }
        used.push(name.toLowerCase());
        return name;
    }

    function build(workbook){
        var sheets = workbook.sheets || [];
        var used = [];
        var names = sheets.map(function(s){ return safeSheetName(s.name, used); });

        var files = [];
        function add(name, text){ files.push({ name: name, data: enc.encode(text) }); }

        add("[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            sheets.map(function(_, i){
                return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
            }).join("") +
            '</Types>');

        add("_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>');

        add("xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<bookViews><workbookView/></bookViews><sheets>' +
            names.map(function(n, i){
                return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
            }).join("") +
            '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');

        add("xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            sheets.map(function(_, i){
                return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
            }).join("") +
            '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '</Relationships>');

        add("xl/styles.xml", stylesXml());

        sheets.forEach(function(s, i){ add("xl/worksheets/sheet" + (i + 1) + ".xml", sheetXml(s)); });

        return zip(files);
    }

    function download(bytes, filename){
        var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
    }

    var api = { build: build, download: download, colName: colName };

    if(typeof window !== "undefined") window.KTXlsx = api;
    if(typeof module !== "undefined" && module.exports) module.exports = api;

})();
