/**
 * ======================================================================
 * printer.js
 * ESC/POS thermal receipt printer direct-print module
 * Supports: Web Bluetooth, WebUSB, fallback to window.print()
 * ======================================================================
 */

var ThermalPrinter = (function () {

    var PAPER_80MM_DOTS = 576;
    var PAPER_58MM_DOTS = 384;

    var _connection = null;
    var _connectionType = null;
    var _paperWidth = PAPER_80MM_DOTS;
    var _statusCallback = null;

    var ESC = 0x1B;
    var GS  = 0x1D;
    var LF  = 0x0A;

    function _cmd() {
        var args = [];
        for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
        return new Uint8Array(args);
    }

    var CMD = {
        INIT:         function () { return _cmd(ESC, 0x40); },
        CENTER:       function () { return _cmd(ESC, 0x61, 0x01); },
        LEFT:         function () { return _cmd(ESC, 0x61, 0x00); },
        BOLD_ON:      function () { return _cmd(ESC, 0x45, 0x01); },
        BOLD_OFF:     function () { return _cmd(ESC, 0x45, 0x00); },
        FEED:         function (n) { return _cmd(ESC, 0x64, n || 3); },
        CUT:          function () { return _cmd(GS, 0x56, 0x41, 0x03); },
        LINEFEED:     function () { return _cmd(LF); },
        TEXT_SIZE:    function (w, h) { return _cmd(GS, 0x21, ((w - 1) << 4) | (h - 1)); },
        RASTER_IMAGE: function (widthBytes, heightDots, data) {
            var xL = widthBytes & 0xFF;
            var xH = (widthBytes >> 8) & 0xFF;
            var yL = heightDots & 0xFF;
            var yH = (heightDots >> 8) & 0xFF;
            var header = _cmd(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH);
            var result = new Uint8Array(header.length + data.length);
            result.set(header, 0);
            result.set(data, header.length);
            return result;
        }
    };

    // ==================================================================
    // Connection: Web Bluetooth
    // ==================================================================

    var BT_SERVICE_SERIAL = '000018f0-0000-1000-8000-00805f9b34fb';
    var BT_CHAR_WRITE     = '00002af1-0000-1000-8000-00805f9b34fb';

    var BT_KNOWN_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ];

    var BT_KNOWN_WRITE_CHARS = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
        'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    ];

    async function _connectBluetooth() {
        if (!navigator.bluetooth) throw new Error('BT_NOT_SUPPORTED');
        _setStatus('Bluetooth\u30d7\u30ea\u30f3\u30bf\u30fc\u3092\u691c\u7d22\u4e2d...');

        var filters = [
            { services: [BT_KNOWN_SERVICES[0]] },
            { services: [BT_KNOWN_SERVICES[1]] },
            { services: [BT_KNOWN_SERVICES[2]] },
            { services: [BT_KNOWN_SERVICES[3]] },
        ];

        var device;
        try {
            device = await navigator.bluetooth.requestDevice({
                filters: filters,
                optionalServices: BT_KNOWN_SERVICES
            });
        } catch (e) {
            try {
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: BT_KNOWN_SERVICES
                });
            } catch (e2) {
                throw new Error('BT_CANCELLED');
            }
        }

        _setStatus('\u63a5\u7d9a\u4e2d: ' + (device.name || 'Printer') + '...');
        var server = await device.gatt.connect();

        var writeChar = null;
        var services = await server.getPrimaryServices();

        for (var si = 0; si < services.length && !writeChar; si++) {
            try {
                var chars = await services[si].getCharacteristics();
                for (var ci = 0; ci < chars.length; ci++) {
                    var props = chars[ci].properties;
                    if (props.write || props.writeWithoutResponse) {
                        writeChar = chars[ci];
                        break;
                    }
                }
            } catch (_) {}
        }

        if (!writeChar) throw new Error('BT_NO_WRITE_CHAR');

        _connection = {
            type: 'bluetooth',
            device: device,
            server: server,
            writeChar: writeChar
        };
        _connectionType = 'bluetooth';

        device.addEventListener('gattserverdisconnected', function () {
            if (_connection && _connection.device === device) {
                _connection = null;
                _connectionType = null;
            }
        });

        _setStatus('\u63a5\u7d9a\u5b8c\u4e86: ' + (device.name || 'BT Printer'));
        return true;
    }

    async function _sendBluetooth(data) {
        if (!_connection || _connection.type !== 'bluetooth') throw new Error('BT_NOT_CONNECTED');

        var char = _connection.writeChar;
        var chunkSize = 512;
        var useWriteWithout = char.properties.writeWithoutResponse;

        for (var offset = 0; offset < data.length; offset += chunkSize) {
            var end = Math.min(offset + chunkSize, data.length);
            var chunk = data.slice(offset, end);
            if (useWriteWithout) {
                await char.writeValueWithoutResponse(chunk);
            } else {
                await char.writeValue(chunk);
            }
            if (data.length > chunkSize * 4) {
                await _sleep(20);
            }
        }
    }

    // ==================================================================
    // Connection: WebUSB
    // ==================================================================

    async function _connectUSB() {
        if (!navigator.usb) throw new Error('USB_NOT_SUPPORTED');
        _setStatus('USB\u30d7\u30ea\u30f3\u30bf\u30fc\u3092\u691c\u7d22\u4e2d...');

        var device;
        try {
            device = await navigator.usb.requestDevice({ filters: [] });
        } catch (e) {
            throw new Error('USB_CANCELLED');
        }

        await device.open();

        var config = device.configuration;
        if (!config) {
            await device.selectConfiguration(1);
            config = device.configuration;
        }

        var iface = null;
        var epOut = null;

        for (var ii = 0; ii < config.interfaces.length; ii++) {
            var alt = config.interfaces[ii].alternates[0];
            if (alt.interfaceClass === 7) {
                iface = config.interfaces[ii];
                for (var ei = 0; ei < alt.endpoints.length; ei++) {
                    if (alt.endpoints[ei].direction === 'out') {
                        epOut = alt.endpoints[ei];
                        break;
                    }
                }
                break;
            }
        }

        if (!iface || !epOut) {
            for (var ii2 = 0; ii2 < config.interfaces.length; ii2++) {
                var alt2 = config.interfaces[ii2].alternates[0];
                for (var ei2 = 0; ei2 < alt2.endpoints.length; ei2++) {
                    if (alt2.endpoints[ei2].direction === 'out') {
                        iface = config.interfaces[ii2];
                        epOut = alt2.endpoints[ei2];
                        break;
                    }
                }
                if (epOut) break;
            }
        }

        if (!iface || !epOut) { device.close(); throw new Error('USB_NO_ENDPOINT'); }

        await device.claimInterface(iface.interfaceNumber);

        _connection = {
            type: 'usb',
            device: device,
            iface: iface,
            epOut: epOut
        };
        _connectionType = 'usb';

        _setStatus('\u63a5\u7d9a\u5b8c\u4e86: ' + (device.productName || 'USB Printer'));
        return true;
    }

    async function _sendUSB(data) {
        if (!_connection || _connection.type !== 'usb') throw new Error('USB_NOT_CONNECTED');
        var chunkSize = 16384;
        for (var offset = 0; offset < data.length; offset += chunkSize) {
            var end = Math.min(offset + chunkSize, data.length);
            var chunk = data.slice(offset, end);
            await _connection.device.transferOut(_connection.epOut.endpointNumber, chunk);
        }
    }

    // ==================================================================
    // Auto-detect & Connect
    // ==================================================================

    async function connect() {
        if (_connection) return _connectionType;

        if (navigator.bluetooth) {
            try {
                await _connectBluetooth();
                return 'bluetooth';
            } catch (e) {
                if (e.message === 'BT_CANCELLED') {
                    if (navigator.usb) {
                        try {
                            await _connectUSB();
                            return 'usb';
                        } catch (_) {}
                    }
                    throw new Error('CANCELLED');
                }
                console.warn('Bluetooth failed, trying USB...', e.message);
            }
        }

        if (navigator.usb) {
            try {
                await _connectUSB();
                return 'usb';
            } catch (e) {
                if (e.message === 'USB_CANCELLED') throw new Error('CANCELLED');
                throw e;
            }
        }

        throw new Error('NO_PRINTER_API');
    }

    async function send(data) {
        if (!_connection) throw new Error('NOT_CONNECTED');
        if (_connectionType === 'bluetooth') {
            await _sendBluetooth(data);
        } else if (_connectionType === 'usb') {
            await _sendUSB(data);
        }
    }

    function disconnect() {
        if (!_connection) return;
        try {
            if (_connectionType === 'bluetooth' && _connection.server) {
                _connection.server.disconnect();
            } else if (_connectionType === 'usb' && _connection.device) {
                _connection.device.close();
            }
        } catch (_) {}
        _connection = null;
        _connectionType = null;
    }

    function isConnected() {
        if (!_connection) return false;
        if (_connectionType === 'bluetooth') {
            return _connection.device && _connection.device.gatt && _connection.device.gatt.connected;
        }
        if (_connectionType === 'usb') {
            return _connection.device && _connection.device.opened;
        }
        return false;
    }

    // ==================================================================
    // Image conversion: Canvas -> 1-bit ESC/POS raster
    // ==================================================================

    function canvasToEscposRaster(canvas, targetWidthDots) {
        var widthDots = targetWidthDots || _paperWidth;
        var scale = widthDots / canvas.width;
        var heightDots = Math.round(canvas.height * scale);

        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = widthDots;
        tmpCanvas.height = heightDots;
        var ctx = tmpCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, widthDots, heightDots);
        ctx.drawImage(canvas, 0, 0, widthDots, heightDots);

        var imgData = ctx.getImageData(0, 0, widthDots, heightDots);
        var pixels = imgData.data;

        var widthBytes = Math.ceil(widthDots / 8);
        var rasterData = new Uint8Array(widthBytes * heightDots);

        for (var y = 0; y < heightDots; y++) {
            for (var x = 0; x < widthDots; x++) {
                var idx = (y * widthDots + x) * 4;
                var gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
                var alpha = pixels[idx + 3] / 255;
                gray = gray * alpha + 255 * (1 - alpha);

                if (gray < 128) {
                    var byteIdx = y * widthBytes + Math.floor(x / 8);
                    var bitIdx  = 7 - (x % 8);
                    rasterData[byteIdx] |= (1 << bitIdx);
                }
            }
        }

        return { widthBytes: widthBytes, heightDots: heightDots, data: rasterData };
    }

    // ==================================================================
    // Build full receipt ESC/POS data
    // ==================================================================

    function buildReceiptData(photoCanvas, settings) {
        var ratio     = (settings && settings.ratio) || '1:1';
        var marginPos = (settings && settings.marginPos) || 'none';
        var marginCm  = parseFloat((settings && settings.marginCm) || 0);

        var ratioParts = ratio.split(':').map(Number);
        var rW = ratioParts[0];
        var rH = ratioParts[1];

        var paperWidthMm = (_paperWidth === PAPER_58MM_DOTS) ? 48 : 72;
        var dpi = _paperWidth / paperWidthMm;

        var photoWMm = paperWidthMm;
        var photoHMm = paperWidthMm * (rH / rW);

        var photoWidthDots  = Math.round(photoWMm * dpi);
        var photoHeightDots = Math.round(photoHMm * dpi);

        var croppedCanvas = _cropToRatio(photoCanvas, rW, rH);

        var fitCanvas = document.createElement('canvas');
        fitCanvas.width = photoWidthDots;
        fitCanvas.height = photoHeightDots;
        var fCtx = fitCanvas.getContext('2d');
        fCtx.fillStyle = '#FFFFFF';
        fCtx.fillRect(0, 0, photoWidthDots, photoHeightDots);
        fCtx.drawImage(croppedCanvas, 0, 0, photoWidthDots, photoHeightDots);

        var marginDots = Math.round(marginCm * 10 * dpi);

        var chunks = [];

        chunks.push(CMD.INIT());
        chunks.push(CMD.CENTER());

        var titleBytes = _textToBytes('AR Photo & Print');
        chunks.push(CMD.TEXT_SIZE(2, 2));
        chunks.push(titleBytes);
        chunks.push(CMD.LINEFEED());
        chunks.push(CMD.TEXT_SIZE(1, 1));
        chunks.push(CMD.LINEFEED());

        chunks.push(_textToBytes('--------------------------------'));
        chunks.push(CMD.LINEFEED());

        if (marginPos === 'top' && marginDots > 0) {
            chunks.push(CMD.FEED(Math.min(Math.round(marginDots / 8), 255)));
        }

        var raster = canvasToEscposRaster(fitCanvas, photoWidthDots);

        var padLeftDots = Math.round((_paperWidth - photoWidthDots) / 2);
        if (padLeftDots > 0) {
            var fullWidthBytes = Math.ceil(_paperWidth / 8);
            var padBytes = Math.floor(padLeftDots / 8);
            var centeredData = new Uint8Array(fullWidthBytes * raster.heightDots);
            for (var row = 0; row < raster.heightDots; row++) {
                for (var b = 0; b < raster.widthBytes; b++) {
                    var targetByte = padBytes + b;
                    if (targetByte < fullWidthBytes) {
                        centeredData[row * fullWidthBytes + targetByte] = raster.data[row * raster.widthBytes + b];
                    }
                }
            }
            chunks.push(CMD.RASTER_IMAGE(fullWidthBytes, raster.heightDots, centeredData));
        } else {
            chunks.push(CMD.RASTER_IMAGE(raster.widthBytes, raster.heightDots, raster.data));
        }

        if (marginPos === 'bottom' && marginDots > 0) {
            chunks.push(CMD.FEED(Math.min(Math.round(marginDots / 8), 255)));
        }

        chunks.push(_textToBytes('--------------------------------'));
        chunks.push(CMD.LINEFEED());

        var cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
        if (cfg) {
            if (cfg.date && cfg.date.enabled && cfg.date.value) {
                var parts = cfg.date.value.split('-').map(Number);
                var d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cfg.date.value);
                if (!isNaN(d)) {
                    chunks.push(_textToBytes(d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()));
                    chunks.push(CMD.LINEFEED());
                }
            }
            if (cfg.text && cfg.text.enabled && cfg.text.value) {
                chunks.push(CMD.BOLD_ON());
                chunks.push(_textToBytes(cfg.text.value));
                chunks.push(CMD.BOLD_OFF());
                chunks.push(CMD.LINEFEED());
            }
            if (cfg.location && cfg.location.enabled && cfg.location.value) {
                chunks.push(_textToBytes(cfg.location.value));
                chunks.push(CMD.LINEFEED());
            }
        }

        var now = new Date();
        var ts = now.getFullYear() + '/' + _pad2(now.getMonth() + 1) + '/' + _pad2(now.getDate()) +
                 ' ' + _pad2(now.getHours()) + ':' + _pad2(now.getMinutes());
        chunks.push(_textToBytes(ts));
        chunks.push(CMD.LINEFEED());

        chunks.push(_textToBytes('--------------------------------'));
        chunks.push(CMD.LINEFEED());
        chunks.push(_textToBytes('Thank you!'));
        chunks.push(CMD.LINEFEED());

        chunks.push(CMD.FEED(4));
        chunks.push(CMD.CUT());

        var totalLen = 0;
        for (var i = 0; i < chunks.length; i++) totalLen += chunks[i].length;
        var result = new Uint8Array(totalLen);
        var pos = 0;
        for (var j = 0; j < chunks.length; j++) {
            result.set(chunks[j], pos);
            pos += chunks[j].length;
        }

        return result;
    }

    // ==================================================================
    // High-level: print receipt
    // ==================================================================

    async function printReceipt(photoCanvas, settings) {
        try {
            if (!isConnected()) {
                _setStatus('\u30d7\u30ea\u30f3\u30bf\u30fc\u3092\u691c\u7d22\u4e2d...');
                await connect();
            }

            _setStatus('\u5370\u5237\u30c7\u30fc\u30bf\u3092\u751f\u6210\u4e2d...');
            var data = buildReceiptData(photoCanvas, settings);

            _setStatus('\u5370\u5237\u4e2d...');
            await send(data);

            _setStatus('\u5370\u5237\u5b8c\u4e86');
            setTimeout(function () { _setStatus(''); }, 2000);
            return true;

        } catch (err) {
            var msg = err.message || '';
            if (msg === 'CANCELLED') {
                _setStatus('');
                return false;
            }
            if (msg === 'NO_PRINTER_API' || msg === 'BT_NOT_SUPPORTED') {
                _setStatus('\u30d6\u30e9\u30a6\u30b6\u304c\u5bfe\u5fdc\u3057\u3066\u3044\u307e\u305b\u3093\u3002\u901a\u5e38\u5370\u5237\u3067\u51fa\u529b\u3057\u307e\u3059...');
                _fallbackPrint(photoCanvas, settings);
                return true;
            }

            console.error('Direct print failed:', err);
            _setStatus('\u76f4\u63a5\u5370\u5237\u5931\u6557\u3002\u901a\u5e38\u5370\u5237\u3067\u51fa\u529b\u3057\u307e\u3059...');
            _connection = null;
            _connectionType = null;
            await _sleep(800);
            _fallbackPrint(photoCanvas, settings);
            return true;
        }
    }

    // ==================================================================
    // Fallback: window.print() via popup
    // ==================================================================

    function _fallbackPrint(photoCanvas, settings) {
        var ratio     = (settings && settings.ratio) || '1:1';
        var marginPos = (settings && settings.marginPos) || 'none';
        var marginCm  = parseFloat((settings && settings.marginCm) || 0);

        var ratioParts = ratio.split(':').map(Number);
        var rW = ratioParts[0];
        var rH = ratioParts[1];

        var paperWidthMm = 74;

        var photoWMm = paperWidthMm;
        var photoHMm = paperWidthMm * (rH / rW);

        var marginMm    = marginCm * 10;
        var marginTopMm = (marginPos === 'top') ? marginMm : 0;
        var marginBotMm = (marginPos === 'bottom') ? marginMm : 0;

        var croppedCanvas = _cropToRatio(photoCanvas, rW, rH);
        var dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.92);

        var cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
        var dateStr = '', msgStr = '', locStr = '';
        if (cfg) {
            if (cfg.date && cfg.date.enabled && cfg.date.value) {
                var parts = cfg.date.value.split('-').map(Number);
                var d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cfg.date.value);
                if (!isNaN(d)) dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
            }
            if (cfg.text && cfg.text.enabled && cfg.text.value) msgStr = cfg.text.value;
            if (cfg.location && cfg.location.enabled && cfg.location.value) locStr = cfg.location.value;
        }

        var now = new Date();
        var printTime = now.getFullYear() + '/' + _pad2(now.getMonth() + 1) + '/' + _pad2(now.getDate()) +
                        ' ' + _pad2(now.getHours()) + ':' + _pad2(now.getMinutes());

        var photoW = photoWMm.toFixed(1) + 'mm';
        var photoH = photoHMm.toFixed(1) + 'mm';
        var mTop   = marginTopMm.toFixed(1) + 'mm';
        var mBot   = marginBotMm.toFixed(1) + 'mm';

        var printWin = window.open('', '_blank', 'width=400,height=700');
        if (!printWin) {
            alert('\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u30d6\u30ed\u30c3\u30af\u3055\u308c\u3066\u3044\u307e\u3059\u3002');
            _setStatus('');
            return;
        }

        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt</title>';
        html += '<style>';
        html += '@page{size:80mm auto;margin:0}';
        html += '*{margin:0;padding:0;box-sizing:border-box}';
        html += 'body{width:80mm;max-width:80mm;font-family:"Courier New","MS Gothic",monospace;font-size:11px;color:#000;background:#fff;padding:3mm}';
        html += '.r{width:100%;text-align:center}';
        html += '.pa{margin-top:' + mTop + ';margin-bottom:' + mBot + '}';
        html += '.img{width:' + photoW + ';height:' + photoH + ';object-fit:cover;display:block;margin:0 auto}';
        html += '.d{border:none;border-top:1px dashed #000;margin:3mm 0}';
        html += '.i{text-align:center;line-height:1.8;font-size:10px}';
        html += '.t{font-size:13px;font-weight:bold;letter-spacing:1px;margin-bottom:2mm}';
        html += '.m{font-size:12px;font-weight:bold;margin:2mm 0}';
        html += '.f{font-size:8px;color:#666;margin-top:3mm}';
        html += '.c{text-align:center;font-size:8px;color:#999;letter-spacing:2px;margin-top:3mm}';
        html += '@media print{body{width:80mm}}';
        html += '</style></head><body><div class="r">';
        html += '<div class="t">AR Photo & Print</div><hr class="d">';
        html += '<div class="pa"><img src="' + dataUrl + '" class="img" alt="photo"></div>';
        html += '<hr class="d"><div class="i">';
        if (dateStr) html += '<div>' + dateStr + '</div>';
        if (msgStr)  html += '<div class="m">' + _escapeHtml(msgStr) + '</div>';
        if (locStr)  html += '<div>' + _escapeHtml(locStr) + '</div>';
        html += '<div style="margin-top:2mm">' + printTime + '</div>';
        html += '</div><hr class="d">';
        html += '<div class="f">Thank you!</div>';
        html += '<div class="c">- - - - - - - - - - - - -</div>';
        html += '</div>';
        html += '<script>window.onload=function(){setTimeout(function(){window.print()},400)};';
        html += 'window.onafterprint=function(){window.close()};</' + 'script>';
        html += '</body></html>';

        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();

        _setStatus('');
    }

    // ==================================================================
    // Utilities
    // ==================================================================

    function _cropToRatio(srcCanvas, rW, rH) {
        var sw = srcCanvas.width;
        var sh = srcCanvas.height;
        var targetAspect = rW / rH;
        var srcAspect    = sw / sh;
        var cx, cy, cw, ch;
        if (srcAspect > targetAspect) {
            ch = sh; cw = Math.round(sh * targetAspect);
            cx = Math.round((sw - cw) / 2); cy = 0;
        } else {
            cw = sw; ch = Math.round(sw / targetAspect);
            cx = 0; cy = Math.round((sh - ch) / 2);
        }
        var out = document.createElement('canvas');
        out.width = cw; out.height = ch;
        out.getContext('2d').drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
        return out;
    }

    function _textToBytes(str) {
        var encoder = new TextEncoder();
        return encoder.encode(str);
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function _pad2(n) { return String(n).padStart(2, '0'); }

    function _sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function _setStatus(msg) {
        if (_statusCallback) _statusCallback(msg);
        var el = document.getElementById('print-status');
        if (el) {
            el.textContent = msg;
            el.style.display = msg ? 'block' : 'none';
        }
    }

    function setPaperWidth(mm) {
        _paperWidth = (mm <= 58) ? PAPER_58MM_DOTS : PAPER_80MM_DOTS;
    }

    function onStatus(cb) { _statusCallback = cb; }

    return {
        connect:       connect,
        disconnect:    disconnect,
        isConnected:   isConnected,
        send:          send,
        printReceipt:  printReceipt,
        setPaperWidth: setPaperWidth,
        onStatus:      onStatus,
        buildReceiptData: buildReceiptData,
        canvasToEscposRaster: canvasToEscposRaster
    };
})();
