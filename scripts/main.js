const MOD_VERSION = "1.0";
const CONSOLE_VERSION = "1.0";
const MAX_LOGS = 1500;
const MAX_COMMAND_HISTORY = 50;
const AUTO_SAVE_INTERVAL = 300;
const LOG_FILE_NAME = "console-logs.txt";

var logHistory = [];
var commandHistory = [];
var detectedCommands = [];
var currentFilter = "all";
var consoleEnabled = true;
var errorCount = 0;
var warningCount = 0;
var infoCount = 0;
var debugCount = 0;
var consoleDialog = null;
var autoScroll = true;
var showTimestamps = true;
var showSource = true;
var compactMode = false;
var lastSaveTime = 0;
var searchQuery = "";
var favoriteCommands = [];
var commandAliases = {};
var modList = [];
var modCommands = {};
var modUsageStats = {};
var modMetadata = {};
var disabledCommands = [];
var commandToModMap = {};

const LOG_COLORS = {
    error: Color.scarlet,
    warn: Color.yellow,
    info: Color.white,
    debug: Color.lightGray,
    success: Color.lime,
    system: Color.cyan
};

const LOG_ICONS = {
    error: "X",
    warn: "!",
    info: "i",
    debug: "?",
    success: "+",
    system: "*"
};

function createLogEntry(type, message, source, metadata) {
    return {
        type: type,
        message: String(message),
        timestamp: Date.now(),
        source: source || "System",
        metadata: metadata || {}
    };
}

function log(type, message, source) {
    if (typeof addLog !== 'undefined') {
        addLog(type, message, source || "CustomCmd");
    } else {
        print("[" + type + "] " + message);
    }
}

function addLog(type, message, source, metadata) {
    try {
        if (!consoleEnabled) return;
        
        var entry = createLogEntry(type, message, source, metadata);
        logHistory.push(entry);
        
        switch(type) {
            case "error": errorCount++; break;
            case "warn": warningCount++; break;
            case "info": infoCount++; break;
            case "debug": debugCount++; break;
        }
        
        while (logHistory.length > MAX_LOGS) {
            var removed = logHistory.shift();
            switch(removed.type) {
                case "error": errorCount--; break;
                case "warn": warningCount--; break;
                case "info": infoCount--; break;
                case "debug": debugCount--; break;
            }
        }
        
        if (Date.now() - lastSaveTime > AUTO_SAVE_INTERVAL * 1000) {
            saveLogsToFile();
            lastSaveTime = Date.now();
        }
        
    } catch (e) {
        print("Console: addLog failed - " + e);
    }
}

function formatTimestamp(timestamp) {
    try {
        var date = new Date(timestamp);
        var h = String(date.getHours()).padStart(2, '0');
        var m = String(date.getMinutes()).padStart(2, '0');
        var s = String(date.getSeconds()).padStart(2, '0');
        var ms = String(date.getMilliseconds()).padStart(3, '0');
        return h + ":" + m + ":" + s + "." + ms;
    } catch (e) {
        return "00:00:00.000";
    }
}

function saveLogsToFile() {
    try {
        var exportText = "=== CONSOLE LOGS ===\n";
        exportText += "Generated: " + new Date().toString() + "\n";
        exportText += "Total: " + logHistory.length + " | Errors: " + errorCount;
        exportText += " | Warnings: " + warningCount + " | Info: " + infoCount + "\n\n";
        
        logHistory.forEach(log => {
            exportText += "[" + formatTimestamp(log.timestamp) + "] ";
            exportText += "[" + log.type.toUpperCase() + "] ";
            if (log.source !== "System") exportText += "(" + log.source + ") ";
            exportText += log.message + "\n";
        });
        
        Vars.dataDirectory.child(LOG_FILE_NAME).writeString(exportText);
        lastSaveTime = Date.now();
    } catch (e) {
        print("Console: Save failed - " + e);
    }
}

function exportLogs() {
    try {
        var exportText = "=== CONSOLE EXPORT ===\n";
        exportText += "Date: " + new Date().toString() + "\n";
        exportText += "Version: " + CONSOLE_VERSION + "\n";
        exportText += "Logs: " + logHistory.length + "\n";
        exportText += "Commands Detected: " + detectedCommands.length + "\n\n";
        
        logHistory.forEach(log => {
            exportText += "[" + formatTimestamp(log.timestamp) + "] ";
            exportText += "[" + log.type.toUpperCase() + "] ";
            exportText += log.message + "\n";
        });
        
        Core.app.setClipboardText(exportText);
        addLog("success", "Exported " + logHistory.length + " logs", "Console");
        Vars.ui.showInfoToast("[lime]Exported to clipboard!", 2);
    } catch (e) {
        addLog("error", "Export failed: " + e, "Console");
    }
}

function clearLogs() {
    logHistory = [];
    errorCount = 0;
    warningCount = 0;
    infoCount = 0;
    debugCount = 0;
    addLog("success", "Logs cleared", "Console");
}

function getFilteredLogs() {
    var filtered = logHistory;
    
    if (currentFilter !== "all") {
        filtered = filtered.filter(log => log.type === currentFilter);
    }
    
    if (searchQuery && searchQuery.trim() !== "") {
        var query = searchQuery.toLowerCase();
        filtered = filtered.filter(log => 
            log.message.toLowerCase().includes(query) ||
            log.source.toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

function copyLogToClipboard(log) {
    try {
        var time = new Date(log.timestamp);
        var timeStr = formatTimestamp(log.timestamp);
        var text = "[" + timeStr + "] [" + log.type.toUpperCase() + "] ";
        if (log.source !== "System") text += "(" + log.source + ") ";
        text += log.message;
        
        Core.app.setClipboardText(text);
        Vars.ui.showInfoToast("[lime]Copied!", 1);
    } catch (e) {
        addLog("error", "Copy failed: " + e, "Console");
    }
}function wallCore(wallType) {
    try {
        if (!Vars.player.team().core()) {
            log("error", "No core found", "WallCore");
            return;
        }
        
        var wall = Vars.content.block(wallType || "copper-wall");
        if (!wall) {
            log("error", "Wall type not found: " + wallType, "WallCore");
            return;
        }
        
        var core = Vars.player.team().core();
        var cx = core.tileX();
        var cy = core.tileY();
        var radius = 10;
        var built = 0;
        
        for (var x = cx - radius; x <= cx + radius; x++) {
            for (var y = cy - radius; y <= cy + radius; y++) {
                var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                if (dist >= radius - 1 && dist <= radius) {
                    var tile = Vars.world.tile(x, y);
                    if (tile && tile.block() == Blocks.air) {
                        Call.constructFinish(tile, wall, Vars.player.unit(), 0, Vars.player.team(), null);
                        built++;
                    }
                }
            }
        }
        
        log("success", "Built " + built + " walls around core", "WallCore");
    } catch (e) {
        log("error", "Wall core failed: " + e, "WallCore");
    }
}

function fillRect(x, y, width, height, blockName) {
    try {
        var block = Vars.content.block(blockName);
        if (!block) {
            log("error", "Block not found: " + blockName, "Fill");
            return;
        }
        
        var built = 0;
        for (var i = x; i < x + width; i++) {
            for (var j = y; j < y + height; j++) {
                var tile = Vars.world.tile(i, j);
                if (tile && tile.block() == Blocks.air) {
                    Call.constructFinish(tile, block, Vars.player.unit(), 0, Vars.player.team(), null);
                    built++;
                }
            }
        }
        
        log("success", "Filled " + built + " tiles", "Fill");
    } catch (e) {
        log("error", "Fill failed: " + e, "Fill");
    }
}

function clearRadius(radius) {
    try {
        if (!Vars.player.unit()) {
            log("error", "Player unit not found", "Clear");
            return;
        }
        
        var px = Vars.player.unit().tileX();
        var py = Vars.player.unit().tileY();
        var cleared = 0;
        
        for (var x = px - radius; x <= px + radius; x++) {
            for (var y = py - radius; y <= py + radius; y++) {
                var tile = Vars.world.tile(x, y);
                if (tile && tile.build && tile.team() == Vars.player.team()) {
                    Call.deconstructFinish(tile, tile.block(), Vars.player.unit());
                    cleared++;
                }
            }
        }
        
        log("success", "Cleared " + cleared + " buildings", "Clear");
    } catch (e) {
        log("error", "Clear failed: " + e, "Clear");
    }
}

function buildConveyor(x1, y1, x2, y2) {
    try {
        var conveyor = Vars.content.block("conveyor");
        var built = 0;
        var dx = Math.sign(x2 - x1);
        var dy = Math.sign(y2 - y1);
        var x = x1, y = y1;
        
        while (x != x2 || y != y2) {
            var tile = Vars.world.tile(x, y);
            if (tile && tile.block() == Blocks.air) {
                var rotation = 0;
                if (dx > 0) rotation = 0;
                else if (dx < 0) rotation = 2;
                else if (dy > 0) rotation = 1;
                else if (dy < 0) rotation = 3;
                
                Call.constructFinish(tile, conveyor, Vars.player.unit(), rotation, Vars.player.team(), null);
                built++;
            }
            
            if (x != x2) x += dx;
            else if (y != y2) y += dy;
        }
        
        log("success", "Built " + built + " conveyors", "Conveyor");
    } catch (e) {
        log("error", "Build conveyor failed: " + e, "Conveyor");
    }
}

function buildPowerLine(x1, y1, x2, y2) {
    try {
        var powerNode = Vars.content.block("power-node");
        var built = 0;
        var distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        var steps = Math.ceil(distance / 6);
        
        for (var i = 0; i <= steps; i++) {
            var x = Math.round(x1 + (x2 - x1) * i / steps);
            var y = Math.round(y1 + (y2 - y1) * i / steps);
            var tile = Vars.world.tile(x, y);
            if (tile && tile.block() == Blocks.air) {
                Call.constructFinish(tile, powerNode, Vars.player.unit(), 0, Vars.player.team(), null);
                built++;
            }
        }
        
        log("success", "Built " + built + " power nodes", "Power");
    } catch (e) {
        log("error", "Build power line failed: " + e, "Power");
    }
}

function buildWallLine(x1, y1, x2, y2, wallType) {
    try {
        var wall = Vars.content.block(wallType || "copper-wall");
        if (!wall) {
            log("error", "Wall type not found", "WallLine");
            return;
        }
        
        var built = 0;
        var dx = Math.abs(x2 - x1);
        var dy = Math.abs(y2 - y1);
        var sx = x1 < x2 ? 1 : -1;
        var sy = y1 < y2 ? 1 : -1;
        var err = dx - dy;
        var x = x1, y = y1;
        
        while (true) {
            var tile = Vars.world.tile(x, y);
            if (tile && tile.block() == Blocks.air) {
                Call.constructFinish(tile, wall, Vars.player.unit(), 0, Vars.player.team(), null);
                built++;
            }
            
            if (x === x2 && y === y2) break;
            
            var e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
        
        log("success", "Built " + built + " wall segments", "WallLine");
    } catch (e) {
        log("error", "Build wall line failed: " + e, "WallLine");
    }
}

function upgradeWalls(fromType, toType) {
    try {
        var from = Vars.content.block(fromType);
        var to = Vars.content.block(toType);
        
        if (!from || !to) {
            log("error", "Block type not found", "Upgrade");
            return;
        }
        
        var upgraded = 0;
        Vars.player.team().data().buildings.each(build => {
            if (build.block == from) {
                var tile = build.tile;
                Call.deconstructFinish(tile, from, Vars.player.unit());
                Call.constructFinish(tile, to, Vars.player.unit(), 0, Vars.player.team(), null);
                upgraded++;
            }
        });
        
        log("success", "Upgraded " + upgraded + " blocks", "Upgrade");
    } catch (e) {
        log("error", "Upgrade failed: " + e, "Upgrade");
    }
}

function replaceBlock(fromType, toType) {
    try {
        var from = Vars.content.block(fromType);
        var to = Vars.content.block(toType);
        
        if (!from || !to) {
            log("error", "Block type not found", "Replace");
            return;
        }
        
        var replaced = 0;
        Vars.player.team().data().buildings.each(build => {
            if (build.block == from) {
                var tile = build.tile;
                var rotation = build.rotation;
                Call.deconstructFinish(tile, from, Vars.player.unit());
                Call.constructFinish(tile, to, Vars.player.unit(), rotation, Vars.player.team(), null);
                replaced++;
            }
        });
        
        log("success", "Replaced " + replaced + " blocks", "Replace");
    } catch (e) {
        log("error", "Replace failed: " + e, "Replace");
    }
}

function toggleBuildings(blockType) {
    try {
        var block = null;
        if (blockType) {
            block = Vars.content.block(blockType);
            if (!block) {
                log("error", "Block not found: " + blockType, "Toggle");
                return;
            }
        }
        
        var toggled = 0;
        Vars.player.team().data().buildings.each(build => {
            if (!block || build.block == block) {
                build.enabled = !build.enabled;
                toggled++;
            }
        });
        
        log("success", "Toggled " + toggled + " buildings", "Toggle");
    } catch (e) {
        log("error", "Toggle failed: " + e, "Toggle");
    }
}

function repairAll() {
    try {
        var repaired = 0;
        Vars.player.team().data().buildings.each(build => {
            if (build.damaged()) {
                build.heal(build.maxHealth);
                repaired++;
            }
        });
        
        log("success", "Repaired " + repaired + " buildings", "Repair");
    } catch (e) {
        log("error", "Repair failed: " + e, "Repair");
    }
}function spawnUnit(unitType, amount, x, y) {
    try {
        var unit = Vars.content.unit(unitType);
        if (!unit) {
            log("error", "Unit not found: " + unitType, "Spawn");
            log("info", "Examples: dagger, mace, fortress, reign, oct, mega, poly, flare, horizon", "Spawn");
            return;
        }
        
        var spawnX = x !== undefined ? x * 8 : Vars.player.x;
        var spawnY = y !== undefined ? y * 8 : Vars.player.y;
        var spawned = 0;
        
        for (var i = 0; i < amount; i++) {
            var angle = (i / amount) * 360;
            var offsetX = Math.cos(angle * Math.PI / 180) * 20;
            var offsetY = Math.sin(angle * Math.PI / 180) * 20;
            
            var u = unit.spawn(Vars.player.team(), spawnX + offsetX, spawnY + offsetY);
            if (u) spawned++;
        }
        
        log("success", "Spawned " + spawned + "x " + unitType, "Spawn");
    } catch (e) {
        log("error", "Spawn failed: " + e, "Spawn");
    }
}

function healAllUnits() {
    try {
        var healed = 0;
        Groups.unit.each(unit => {
            if (unit.team == Vars.player.team()) {
                unit.heal();
                healed++;
            }
        });
        
        log("success", "Healed " + healed + " units", "Heal");
    } catch (e) {
        log("error", "Heal failed: " + e, "Heal");
    }
}

function rallyUnits() {
    try {
        if (!Vars.player.unit()) {
            log("error", "Player not found", "Rally");
            return;
        }
        
        var rallied = 0;
        var px = Vars.player.x;
        var py = Vars.player.y;
        
        Groups.unit.each(unit => {
            if (unit.team == Vars.player.team() && unit != Vars.player.unit()) {
                unit.movePref(Vec2.ZERO.set(px, py));
                rallied++;
            }
        });
        
        log("success", "Rallied " + rallied + " units", "Rally");
    } catch (e) {
        log("error", "Rally failed: " + e, "Rally");
    }
}

function killEnemies(radius) {
    try {
        if (!Vars.player.unit()) {
            log("error", "Player not found", "Kill");
            return;
        }
        
        var killed = 0;
        var px = Vars.player.x;
        var py = Vars.player.y;
        var r = radius || 999999;
        
        Groups.unit.each(unit => {
            if (unit.team != Vars.player.team()) {
                var dist = Math.sqrt((unit.x - px) * (unit.x - px) + (unit.y - py) * (unit.y - py));
                if (dist <= r * 8) {
                    unit.kill();
                    killed++;
                }
            }
        });
        
        log("success", "Killed " + killed + " enemies", "Kill");
    } catch (e) {
        log("error", "Kill enemies failed: " + e, "Kill");
    }
}

function countUnits() {
    try {
        var friendly = 0;
        var enemy = 0;
        
        Groups.unit.each(unit => {
            if (unit.team == Vars.player.team()) friendly++;
            else enemy++;
        });
        
        log("info", "=== UNITS ===", "Count");
        log("info", "Friendly: " + friendly, "Count");
        log("info", "Enemy: " + enemy, "Count");
    } catch (e) {
        log("error", "Count failed: " + e, "Count");
    }
}

function toggleTurrets() {
    try {
        var toggled = 0;
        Vars.player.team().data().buildings.each(build => {
            if (build.block.category == Category.turret) {
                build.enabled = !build.enabled;
                toggled++;
            }
        });
        
        log("success", "Toggled " + toggled + " turrets", "Turrets");
    } catch (e) {
        log("error", "Toggle turrets failed: " + e, "Turrets");
    }
}

function showPowerStatus() {
    try {
        var production = 0;
        var consumption = 0;
        
        Vars.player.team().data().buildings.each(build => {
            if (build.block.outputsPower) {
                production += build.getPowerProduction() * 60;
            }
            if (build.block.consumes.hasPower()) {
                consumption += build.block.consumes.getPower().usage * 60;
            }
        });
        
        log("info", "=== POWER ===", "Power");
        log("info", "Production: " + Math.round(production) + "/s", "Power");
        log("info", "Consumption: " + Math.round(consumption) + "/s", "Power");
        log("info", "Balance: " + Math.round(production - consumption) + "/s", "Power");
    } catch (e) {
        log("error", "Power status failed: " + e, "Power");
    }
}

function showResources() {
    try {
        var core = Vars.player.team().core();
        if (!core) {
            log("error", "No core found", "Resources");
            return;
        }
        
        log("info", "=== RESOURCES ===", "Resources");
        var items = ["copper", "lead", "graphite", "silicon", "titanium", "thorium"];
        
        items.forEach(name => {
            var item = Vars.content.item(name);
            if (item) {
                var amount = core.items.get(item);
                log("info", name + ": " + amount, "Resources");
            }
        });
    } catch (e) {
        log("error", "Resources failed: " + e, "Resources");
    }
}

function cleanScreenshot() {
    try {
        Vars.ui.hudfrag.shown = false;
        
        Timer.schedule(() => {
            Core.app.post(() => {
                try {
                    var w = Core.graphics.getWidth();
                    var h = Core.graphics.getHeight();
                    var buffer = ScreenUtils.getFrameBufferPixels(0, 0, w, h, true);
                    var pixmap = new Pixmap(w, h);
                    BufferUtils.copy(buffer, 0, pixmap.pixels, pixmap.pixels.capacity());
                    PixmapIO.writePNG(Vars.screenshotDirectory.child("screenshot-" + Time.millis() + ".png"), pixmap);
                    pixmap.dispose();
                    log("success", "Screenshot saved", "Screenshot");
                } catch (e) {
                    log("error", "Screenshot failed: " + e, "Screenshot");
                }
                Vars.ui.hudfrag.shown = true;
            });
        }, 0.1);
    } catch (e) {
        log("error", "Screenshot failed: " + e, "Screenshot");
        Vars.ui.hudfrag.shown = true;
    }
}

function addCommandRow(table, command, description) {
    table.add("[white]" + command).left().width(250).wrap();
    table.add("[lightgray]" + description).left().width(300).wrap();
    table.row();
}

function showCustomHelpUI() {
    try {
        var dialog = new BaseDialog("[cyan]Custom Commands Help v" + MOD_VERSION);
        dialog.cont.margin(15);
        
        dialog.cont.add("[cyan]=== CUSTOM COMMANDS ===").pad(10).row();
        dialog.cont.image().color(Color.cyan).height(3).growX().pad(5).row();
        
        var commandTable = new Table();
        commandTable.defaults().left().pad(3);
        
        commandTable.add("[lime]BUILDING COMMANDS").colspan(2).left().padTop(10).row();
        commandTable.image().color(Color.lime).height(2).width(350).colspan(2).pad(3).row();
        
        addCommandRow(commandTable, "/wallcore [type]", "Build walls around core (def: copper-wall)");
        addCommandRow(commandTable, "/fill <x> <y> <w> <h> <block>", "Fill rectangular area with blocks");
        addCommandRow(commandTable, "/clear [radius]", "Clear buildings around you (def: 5)");
        addCommandRow(commandTable, "/conveyor <x1> <y1> <x2> <y2>", "Build conveyor line between points");
        addCommandRow(commandTable, "/powerline <x1> <y1> <x2> <y2>", "Build power node line");
        addCommandRow(commandTable, "/wallline <x1> <y1> <x2> <y2> [type]", "Build wall line");
        
        commandTable.add("[yellow]MODIFICATION COMMANDS").colspan(2).left().padTop(15).row();
        commandTable.image().color(Color.yellow).height(2).width(350).colspan(2).pad(3).row();
        
        addCommandRow(commandTable, "/upgrade <from> <to>", "Upgrade blocks (e.g., copper-wall to titanium-wall)");
        addCommandRow(commandTable, "/replace <from> <to>", "Replace blocks with another type");
        addCommandRow(commandTable, "/toggle [block]", "Toggle buildings on/off (leave empty for all)");
        addCommandRow(commandTable, "/repair", "Repair all damaged buildings");
        
        commandTable.add("[royal]UNIT COMMANDS").colspan(2).left().padTop(15).row();
        commandTable.image().color(Color.royal).height(2).width(350).colspan(2).pad(3).row();
        
        addCommandRow(commandTable, "/spawn <unit> <amount> [x] [y]", "Spawn units at location");
        addCommandRow(commandTable, "/healunits", "Heal all friendly units");
        addCommandRow(commandTable, "/rally", "Rally all units to your position");
        addCommandRow(commandTable, "/killenemies [radius]", "Kill enemies (def: all)");
        addCommandRow(commandTable, "/units", "Count friendly/enemy units");
        
        commandTable.add("[cyan]QUICK ACTIONS").colspan(2).left().padTop(15).row();
        commandTable.image().color(Color.cyan).height(2).width(350).colspan(2).pad(3).row();
        
        addCommandRow(commandTable, "/turrets", "Toggle all turrets on/off");
        addCommandRow(commandTable, "/power", "Show power production/consumption");
        addCommandRow(commandTable, "/resources", "Show core resource amounts");
        addCommandRow(commandTable, "/screenshot", "Take clean screenshot (no UI)");
        
        var scrollPane = new ScrollPane(commandTable);
        scrollPane.setScrollingDisabled(true, false);
        dialog.cont.add(scrollPane).size(600, 400).pad(10).row();
        
        dialog.cont.image().color(Color.gray).height(2).growX().pad(5).row();
        dialog.cont.add("[gray]Custom Commands Mod v" + MOD_VERSION).pad(10).row();
        
        dialog.buttons.defaults().size(150, 60).pad(5);
        dialog.buttons.button("[lime]Close", () => {
            dialog.hide();
        });
        
        dialog.buttons.button("[cyan]Test Command", () => {
            Vars.ui.showInfoToast("[lime]Try: /wallcore", 3);
        });
        
        dialog.show();
        
    } catch (e) {
        log("error", "Help UI failed: " + e, "Help");
        Vars.ui.showInfoToast("[scarlet]Help UI error!", 2);
    }
}function setupCommandCapture() {
    try {
        Events.on(PlayerChatEvent, e => {
            if (e.message && e.message.startsWith("/")) {
                var cmd = e.message.split(" ")[0];
                
                addLog("info", "Command used: " + e.message, "Player:" + e.player.name);
                
                if (commandToModMap[cmd]) {
                    var modName = commandToModMap[cmd];
                    if (!modUsageStats[modName]) modUsageStats[modName] = 0;
                    modUsageStats[modName]++;
                }
            }
        });
        
        addLog("success", "Command capture active", "Console");
        
    } catch (e) {
        print("Console: Command capture failed - " + e);
    }
}

function scanForCommands() {
    try {
        addLog("info", "Scanning for console commands...", "Scanner");
        
        var consoleCommands = [
            "/chelp", "/clear", "/scan", "/export", "/save", 
            "/mods", "/stats", "/commands", "/filter", "/search",
            "/clearsearch", "/fav", "/unfav", "/clearcmds",
            "/addcmd", "/removecmd", "/mod", "/linkcmd", "/unlinkcmd"
        ];
        
        var newCount = 0;
        
        consoleCommands.forEach(cmd => {
            if (detectedCommands.indexOf(cmd) === -1) {
                detectedCommands.push(cmd);
                newCount++;
            }
        });
        
        addLog("success", "Found " + detectedCommands.length + " commands (" + newCount + " new)", "Scanner");
        addLog("info", "Use /addcmd <command> to add custom commands", "Scanner");
        
    } catch (e) {
        addLog("error", "Scan failed: " + e, "Scanner");
    }
}

function loadConsoleSettings() {
    try {
        consoleEnabled = Core.settings.getBool("console-enabled", true);
        showTimestamps = Core.settings.getBool("console-timestamps", true);
        showSource = Core.settings.getBool("console-source", true);
        autoScroll = Core.settings.getBool("console-autoscroll", true);
        compactMode = Core.settings.getBool("console-compact", false);
        
        var savedFavorites = Core.settings.getString("console-favorites", "");
        if (savedFavorites) {
            favoriteCommands = savedFavorites.split(",").filter(cmd => cmd.trim() !== "");
        }
        
        var savedCommands = Core.settings.getString("console-commands", "");
        if (savedCommands) {
            detectedCommands = savedCommands.split(",").filter(cmd => cmd.trim() !== "");
        }
        
        var savedDisabled = Core.settings.getString("console-disabled", "");
        if (savedDisabled) {
            disabledCommands = savedDisabled.split(",").filter(cmd => cmd.trim() !== "");
        }
        
        var savedCmdMap = Core.settings.getString("console-cmdmap", "");
        if (savedCmdMap) {
            try {
                var pairs = savedCmdMap.split(";");
                pairs.forEach(pair => {
                    var parts = pair.split(":");
                    if (parts.length === 2) {
                        commandToModMap[parts[0]] = parts[1];
                    }
                });
            } catch (e) {
                print("Console: Load command map failed - " + e);
            }
        }
    } catch (e) {
        print("Console: Load settings failed - " + e);
    }
}

function saveConsoleSettings() {
    try {
        Core.settings.put("console-enabled", consoleEnabled);
        Core.settings.put("console-timestamps", showTimestamps);
        Core.settings.put("console-source", showSource);
        Core.settings.put("console-autoscroll", autoScroll);
        Core.settings.put("console-compact", compactMode);
        Core.settings.put("console-favorites", favoriteCommands.join(","));
        Core.settings.put("console-commands", detectedCommands.join(","));
        Core.settings.put("console-disabled", disabledCommands.join(","));
        
        var cmdMapStr = "";
        for (var cmd in commandToModMap) {
            if (cmdMapStr !== "") cmdMapStr += ";";
            cmdMapStr += cmd + ":" + commandToModMap[cmd];
        }
        Core.settings.put("console-cmdmap", cmdMapStr);
    } catch (e) {
        print("Console: Save settings failed - " + e);
    }
}

function showConsoleHelp() {
    addLog("info", "=== CONSOLE COMMANDS ===", "Help");
    addLog("info", "/chelp - This help", "Help");
    addLog("info", "/clear - Clear logs", "Help");
    addLog("info", "/scan - Scan console commands", "Help");
    addLog("info", "/export - Export to clipboard", "Help");
    addLog("info", "/save - Save to file", "Help");
    addLog("info", "/mods - List mods", "Help");
    addLog("info", "/stats - Console stats", "Help");
    addLog("info", "/commands - List commands", "Help");
    addLog("info", "/filter <type> - Filter logs", "Help");
    addLog("info", "/search <text> - Search logs", "Help");
    addLog("info", "/clearsearch - Clear search", "Help");
    addLog("info", "/addcmd <cmd> - Add/enable command", "Help");
    addLog("info", "/removecmd <cmd> - Disable command", "Help");
    addLog("info", "/clearcmds - Clear all commands", "Help");
    addLog("info", "/fav <cmd> - Add favorite", "Help");
    addLog("info", "/unfav <cmd> - Remove favorite", "Help");
    addLog("info", "=== MOD MANAGEMENT ===", "Help");
    addLog("info", "/mod - Mod dashboard", "Help");
    addLog("info", "/mod help - Mod command help", "Help");
    addLog("info", "/linkcmd <cmd> <mod> - Link command to mod", "Help");
    addLog("info", "/unlinkcmd <cmd> - Unlink command", "Help");
    addLog("info", "=== GAME COMMANDS ===", "Help");
    addLog("info", "Type /command to send to game", "Help");
    addLog("info", "Disabled commands show confirmation popup", "Help");
    addLog("info", "=== JAVASCRIPT ===", "Help");
    addLog("info", "Type JS code to execute", "Help");
}

function listLoadedMods() {
    try {
        addLog("info", "=== LOADED MODS ===", "Mods");
        var mods = Vars.mods.list();
        if (mods.size === 0) {
            addLog("warn", "No mods loaded", "Mods");
            return;
        }
        for (var i = 0; i < mods.size; i++) {
            var mod = mods.get(i);
            var enabled = mod.enabled();
            var status = enabled ? "[lime]✓[]" : "[scarlet]✗[]";
            
            addLog("info", status + " " + mod.meta.displayName + " v" + mod.meta.version, "Mods");
            if (mod.meta.description) {
                addLog("debug", "  " + mod.meta.description, "Mods");
            }
        }
        addLog("success", "Total: " + mods.size + " mods", "Mods");
        addLog("info", "Use /mod for advanced management", "Mods");
    } catch (e) {
        addLog("error", "List mods failed: " + e, "Mods");
    }
}

function showConsoleStats() {
    addLog("info", "=== CONSOLE STATS ===", "Stats");
    addLog("info", "Version: " + CONSOLE_VERSION, "Stats");
    addLog("info", "Total Logs: " + logHistory.length + "/" + MAX_LOGS, "Stats");
    addLog("info", "Errors: " + errorCount, "Stats");
    addLog("info", "Warnings: " + warningCount, "Stats");
    addLog("info", "Info: " + infoCount, "Stats");
    addLog("info", "Debug: " + debugCount, "Stats");
    addLog("info", "Commands History: " + commandHistory.length, "Stats");
    addLog("info", "Detected Commands: " + detectedCommands.length, "Stats");
    addLog("info", "Disabled Commands: " + disabledCommands.length, "Stats");
    addLog("info", "Favorites: " + favoriteCommands.length, "Stats");
    addLog("info", "Current Filter: " + currentFilter, "Stats");
    if (searchQuery) addLog("info", "Search: '" + searchQuery + "'", "Stats");
    addLog("info", "Installed Mods: " + modList.length, "Stats");
    addLog("info", "Linked Commands: " + Object.keys(commandToModMap).length, "Stats");
    
    try {
        var memUsed = Math.round(Core.app.getJavaHeap() / 1024 / 1024);
        var memMax = Math.round(Core.app.getNativeHeap() / 1024 / 1024);
        addLog("info", "Memory: " + memUsed + "MB / " + memMax + "MB", "Stats");
    } catch (e) {
        addLog("debug", "Memory info unavailable", "Stats");
    }
}

function listAvailableCommands() {
    addLog("info", "=== CONSOLE COMMANDS ===", "Commands");
    addLog("info", "/chelp, /clear, /scan, /export, /save", "Built-in");
    addLog("info", "/mods, /mod, /stats, /commands, /filter", "Built-in");
    addLog("info", "/search, /clearsearch, /addcmd, /removecmd", "Built-in");
    addLog("info", "/clearcmds, /fav, /unfav, /linkcmd, /unlinkcmd", "Built-in");
    
    if (detectedCommands.length > 0) {
        addLog("info", "=== DETECTED COMMANDS (" + detectedCommands.length + ") ===", "Detected");
        
        var consoleCommands = [];
        var customCommands = [];
        
        var knownConsole = ["/chelp", "/clear", "/scan", "/export", "/save", "/mods", "/mod", "/stats", "/commands", "/filter", "/search", "/clearsearch", "/fav", "/unfav", "/clearcmds", "/addcmd", "/removecmd", "/linkcmd", "/unlinkcmd"];
        
        detectedCommands.forEach(cmd => {
            if (knownConsole.indexOf(cmd) !== -1) {
                consoleCommands.push(cmd);
            } else {
                customCommands.push(cmd);
            }
        });
        
        if (consoleCommands.length > 0) {
            addLog("info", "--- Console Commands ---", "Console");
            consoleCommands.forEach(cmd => {
                var disabled = disabledCommands.indexOf(cmd) !== -1;
                var status = disabled ? " [scarlet][DISABLED][]" : " [lime][ENABLED][]";
                addLog("info", cmd + status, "Console");
            });
        }
        
        if (customCommands.length > 0) {
            addLog("info", "--- Custom Commands ---", "Custom");
            customCommands.forEach(cmd => {
                var disabled = disabledCommands.indexOf(cmd) !== -1;
                var status = disabled ? " [scarlet][DISABLED][]" : " [lime][ENABLED][]";
                
                var modInfo = "";
                if (commandToModMap[cmd]) {
                    var modName = commandToModMap[cmd];
                    if (modMetadata[modName]) {
                        modInfo = " [cyan](" + modMetadata[modName].displayName + ")[]";
                    }
                }
                
                addLog("info", cmd + status + modInfo, "Custom");
            });
        }
    } else {
        addLog("warn", "No commands detected", "Detected");
        addLog("info", "Type /addcmd /shop to add custom commands", "Detected");
    }
    
    if (disabledCommands.length > 0) {
        addLog("info", "=== DISABLED COMMANDS (" + disabledCommands.length + ") ===", "Disabled");
        disabledCommands.forEach(cmd => {
            addLog("info", "[scarlet]✗[] " + cmd, "Disabled");
        });
        addLog("info", "Use /addcmd <cmd> to re-enable", "Disabled");
    }
    
    if (favoriteCommands.length > 0) {
        addLog("info", "=== FAVORITES ===", "Favorites");
        favoriteCommands.forEach(cmd => addLog("info", "[gold]★[] " + cmd, "Favorites"));
    }
    
    var linkedCount = Object.keys(commandToModMap).length;
    if (linkedCount > 0) {
        addLog("info", "=== LINKED COMMANDS (" + linkedCount + ") ===", "Linked");
        for (var cmd in commandToModMap) {
            var modName = commandToModMap[cmd];
            var displayName = modMetadata[modName] ? modMetadata[modName].displayName : modName;
            addLog("info", cmd + " [cyan]→[] " + displayName, "Linked");
        }
    }
}function scanAllMods() {
    try {
        modList = [];
        modMetadata = {};
        
        addLog("info", "Scanning installed mods...", "ModScanner");
        
        var mods = Vars.mods.list();
        if (mods.size === 0) {
            addLog("warn", "No mods detected", "ModScanner");
            return;
        }
        
        for (var i = 0; i < mods.size; i++) {
            var mod = mods.get(i);
            var modName = mod.meta.name || mod.name;
            
            modList.push(modName);
            
            modMetadata[modName] = {
                displayName: mod.meta.displayName || modName,
                version: mod.meta.version || "Unknown",
                author: mod.meta.author || "Unknown",
                description: mod.meta.description || "No description",
                enabled: mod.enabled(),
                dependencies: mod.meta.dependencies || []
            };
            
            if (!modCommands[modName]) {
                modCommands[modName] = [];
            }
            
            if (!modUsageStats[modName]) {
                modUsageStats[modName] = 0;
            }
        }
        
        for (var cmd in commandToModMap) {
            var modName = commandToModMap[cmd];
            if (modCommands[modName] && modCommands[modName].indexOf(cmd) === -1) {
                modCommands[modName].push(cmd);
            }
        }
        
        addLog("success", "Scanned " + modList.length + " mods", "ModScanner");
        
    } catch (e) {
        addLog("error", "Mod scan failed: " + e, "ModScanner");
    }
}

function getModByName(name) {
    try {
        var mods = Vars.mods.list();
        for (var i = 0; i < mods.size; i++) {
            var mod = mods.get(i);
            var modName = mod.meta.name || mod.name;
            var displayName = mod.meta.displayName || modName;
            
            if (modName.toLowerCase() === name.toLowerCase() || 
                displayName.toLowerCase() === name.toLowerCase()) {
                return mod;
            }
        }
        return null;
    } catch (e) {
        addLog("error", "Get mod failed: " + e, "ModManager");
        return null;
    }
}

function linkCommandToMod(command, modName) {
    try {
        if (!command || !command.startsWith("/")) {
            addLog("error", "Command must start with /", "ModLink");
            return;
        }
        
        var mod = getModByName(modName);
        if (!mod) {
            addLog("error", "Mod not found: " + modName, "ModLink");
            return;
        }
        
        var name = mod.meta.name || mod.name;
        
        commandToModMap[command] = name;
        
        if (!modCommands[name]) {
            modCommands[name] = [];
        }
        
        if (modCommands[name].indexOf(command) === -1) {
            modCommands[name].push(command);
        }
        
        if (detectedCommands.indexOf(command) === -1) {
            detectedCommands.push(command);
        }
        
        saveConsoleSettings();
        
        addLog("success", "Linked " + command + " to " + modMetadata[name].displayName, "ModLink");
        
    } catch (e) {
        addLog("error", "Link command failed: " + e, "ModLink");
    }
}

function unlinkCommandFromMod(command) {
    try {
        if (!commandToModMap[command]) {
            addLog("warn", "Command not linked: " + command, "ModLink");
            return;
        }
        
        var modName = commandToModMap[command];
        delete commandToModMap[command];
        
        if (modCommands[modName]) {
            var index = modCommands[modName].indexOf(command);
            if (index !== -1) {
                modCommands[modName].splice(index, 1);
            }
        }
        
        saveConsoleSettings();
        
        addLog("success", "Unlinked " + command, "ModLink");
        
    } catch (e) {
        addLog("error", "Unlink command failed: " + e, "ModLink");
    }
}

function showModDashboard() {
    try {
        scanAllMods();
        
        addLog("info", "=== MOD MANAGEMENT ===", "Mods");
        addLog("info", "Total: " + modList.length + " mods installed", "Mods");
        
        var enabledCount = 0;
        var disabledCount = 0;
        
        modList.forEach(modName => {
            var meta = modMetadata[modName];
            if (meta.enabled) enabledCount++;
            else disabledCount++;
        });
        
        addLog("info", "Enabled: " + enabledCount + " | Disabled: " + disabledCount, "Mods");
        addLog("info", "", "Mods");
        
        modList.forEach(modName => {
            var meta = modMetadata[modName];
            var status = meta.enabled ? "[lime]✓ ENABLED[]" : "[scarlet]✗ DISABLED[]";
            
            var cmdCount = modCommands[modName] ? modCommands[modName].length : 0;
            
            addLog("info", status + " " + meta.displayName + " v" + meta.version, "Mods");
            addLog("info", "   Commands: " + cmdCount, "Mods");
        });
        
        addLog("info", "", "Mods");
        addLog("info", "Commands: /mod <subcommand>", "Mods");
        addLog("info", "Type /mod help for options", "Mods");
        
    } catch (e) {
        addLog("error", "Mod dashboard failed: " + e, "Mods");
    }
}

function showModList() {
    try {
        scanAllMods();
        
        addLog("info", "=== ALL MODS (" + modList.length + ") ===", "Mods");
        
        for (var i = 0; i < modList.length; i++) {
            var modName = modList[i];
            var meta = modMetadata[modName];
            var status = meta.enabled ? "[lime]✓[]" : "[scarlet]✗[]";
            var statusText = meta.enabled ? "" : " [scarlet][DISABLED][]";
            
            addLog("info", (i + 1) + ". " + status + " " + meta.displayName + " v" + meta.version + statusText, "Mods");
            addLog("info", "   Author: " + meta.author, "Mods");
            
            var cmdCount = modCommands[modName] ? modCommands[modName].length : 0;
            addLog("info", "   Commands: " + cmdCount, "Mods");
            
            var desc = meta.description;
            if (desc.length > 60) desc = desc.substring(0, 57) + "...";
            addLog("info", "   Desc: " + desc, "Mods");
            addLog("info", "", "Mods");
        }
        
    } catch (e) {
        addLog("error", "List mods failed: " + e, "Mods");
    }
}

function showModInfo(modName) {
    try {
        if (!modName || modName.trim() === "") {
            addLog("error", "Usage: /mod info <modname>", "Mods");
            return;
        }
        
        scanAllMods();
        
        var mod = getModByName(modName);
        if (!mod) {
            addLog("error", "Mod not found: " + modName, "Mods");
            addLog("info", "Type /mod list to see all mods", "Mods");
            return;
        }
        
        var name = mod.meta.name || mod.name;
        var meta = modMetadata[name];
        
        addLog("info", "=== MOD INFO: " + meta.displayName + " ===", "Mods");
        addLog("info", "Display Name: " + meta.displayName, "Mods");
        addLog("info", "Internal Name: " + name, "Mods");
        addLog("info", "Version: " + meta.version, "Mods");
        addLog("info", "Author: " + meta.author, "Mods");
        
        var status = meta.enabled ? "[lime]ENABLED ✓[]" : "[scarlet]DISABLED ✗[]";
        addLog("info", "Status: " + status, "Mods");
        addLog("info", "", "Mods");
        
        addLog("info", "Description:", "Mods");
        addLog("info", meta.description, "Mods");
        addLog("info", "", "Mods");
        
        if (meta.dependencies && meta.dependencies.length > 0) {
            addLog("info", "Dependencies: " + meta.dependencies.join(", "), "Mods");
        } else {
            addLog("info", "Dependencies: None", "Mods");
        }
        
        var cmdCount = modCommands[name] ? modCommands[name].length : 0;
        addLog("info", "Commands Registered: " + cmdCount, "Mods");
        
        if (cmdCount > 0) {
            modCommands[name].forEach(cmd => {
                var disabled = disabledCommands.indexOf(cmd) !== -1;
                var cmdStatus = disabled ? " [scarlet][DISABLED][]" : " [lime][ENABLED][]";
                addLog("info", "  " + cmd + cmdStatus, "Mods");
            });
        } else {
            addLog("info", "  No commands linked yet", "Mods");
            addLog("info", "  Use /linkcmd <command> " + name + " to link", "Mods");
        }
        
        var usageCount = modUsageStats[name] || 0;
        addLog("info", "Command Usage: " + usageCount + " times", "Mods");
        
    } catch (e) {
        addLog("error", "Mod info failed: " + e, "Mods");
    }
}

function checkModConflicts() {
    try {
        scanAllMods();
        
        addLog("info", "=== MOD CONFLICTS ===", "Mods");
        
        var conflictCount = 0;
        var commandMap = {};
        
        modList.forEach(modName => {
            if (modCommands[modName]) {
                modCommands[modName].forEach(cmd => {
                    if (!commandMap[cmd]) {
                        commandMap[cmd] = [];
                    }
                    commandMap[cmd].push(modName);
                });
            }
        });
        
        for (var cmd in commandMap) {
            if (commandMap[cmd].length > 1) {
                conflictCount++;
                addLog("warn", "⚠️ CONFLICT: Duplicate Command", "Mods");
                addLog("warn", "Command: " + cmd, "Mods");
                addLog("warn", "Provided by: " + commandMap[cmd].join(", "), "Mods");
                addLog("warn", "Issue: Game will use one randomly", "Mods");
                addLog("warn", "Fix: Disable one with /removecmd " + cmd, "Mods");
                addLog("info", "", "Mods");
            }
        }
        
        if (conflictCount === 0) {
            addLog("success", "✓ No conflicts detected", "Mods");
        } else {
            addLog("warn", "Found " + conflictCount + " conflicts", "Mods");
        }
        
    } catch (e) {
        addLog("error", "Conflict check failed: " + e, "Mods");
    }
}

function showModCommands(modName) {
    try {
        if (!modName || modName.trim() === "") {
            addLog("error", "Usage: /mod commands <modname>", "Mods");
            return;
        }
        
        var mod = getModByName(modName);
        if (!mod) {
            addLog("error", "Mod not found: " + modName, "Mods");
            return;
        }
        
        var name = mod.meta.name || mod.name;
        var meta = modMetadata[name];
        
        addLog("info", "=== Commands from " + meta.displayName + " ===", "Mods");
        
        if (!modCommands[name] || modCommands[name].length === 0) {
            addLog("warn", "No commands registered for this mod", "Mods");
            addLog("info", "Use /linkcmd <command> " + name + " to link commands", "Mods");
            addLog("info", "Example: /linkcmd /shop " + name, "Mods");
            return;
        }
        
        modCommands[name].forEach(cmd => {
            var disabled = disabledCommands.indexOf(cmd) !== -1;
            var status = disabled ? "[scarlet]DISABLED ✗[]" : "[lime]ENABLED ✓[]";
            
            addLog("info", cmd, "Mods");
            addLog("info", "  Status: " + status, "Mods");
        });
        
        addLog("info", "", "Mods");
        addLog("info", "Total: " + modCommands[name].length + " commands", "Mods");
        
    } catch (e) {
        addLog("error", "Show mod commands failed: " + e, "Mods");
    }
}

function searchMods(keyword) {
    try {
        if (!keyword || keyword.trim() === "") {
            addLog("error", "Usage: /mod search <keyword>", "Mods");
            return;
        }
        
        scanAllMods();
        
        var query = keyword.toLowerCase();
        var results = [];
        
        modList.forEach(modName => {
            var meta = modMetadata[modName];
            var displayName = meta.displayName.toLowerCase();
            var author = meta.author.toLowerCase();
            var desc = meta.description.toLowerCase();
            
            if (displayName.includes(query) || 
                modName.toLowerCase().includes(query) ||
                author.includes(query) ||
                desc.includes(query)) {
                results.push(modName);
            }
        });
        
        addLog("info", "=== SEARCH RESULTS (" + results.length + " mods) ===", "Mods");
        
        if (results.length === 0) {
            addLog("warn", "No mods found matching: " + keyword, "Mods");
            return;
        }
        
        results.forEach((modName, index) => {
            var meta = modMetadata[modName];
            var status = meta.enabled ? "[lime]✓[]" : "[scarlet]✗[]";
            
            addLog("info", (index + 1) + ". " + status + " " + meta.displayName + " v" + meta.version, "Mods");
            
            if (meta.displayName.toLowerCase().includes(query)) {
                addLog("info", "   Match: Name", "Mods");
            } else if (meta.author.toLowerCase().includes(query)) {
                addLog("info", "   Match: Author (" + meta.author + ")", "Mods");
            } else if (meta.description.toLowerCase().includes(query)) {
                addLog("info", "   Match: Description", "Mods");
            }
            addLog("info", "", "Mods");
        });
        
    } catch (e) {
        addLog("error", "Search mods failed: " + e, "Mods");
    }
}

function showModHelp() {
    addLog("info", "=== MOD COMMAND HELP ===", "Mods");
    addLog("info", "/mod - Show mod dashboard", "Mods");
    addLog("info", "/mod list - List all mods", "Mods");
    addLog("info", "/mod info <name> - Detailed mod info", "Mods");
    addLog("info", "/mod conflicts - Check for conflicts", "Mods");
    addLog("info", "/mod commands <name> - List mod commands", "Mods");
    addLog("info", "/mod search <keyword> - Find mods", "Mods");
    addLog("info", "/mod help - This help message", "Mods");
    addLog("info", "", "Mods");
    addLog("info", "=== COMMAND LINKING ===", "Mods");
    addLog("info", "/linkcmd <cmd> <mod> - Link command to mod", "Mods");
    addLog("info", "/unlinkcmd <cmd> - Unlink command", "Mods");
    addLog("info", "Example: /linkcmd /shop ShopSystemMod", "Mods");
}function executeCommand(cmd) {
    try {
        if (!cmd || cmd.trim() === "") return;
        
        var trimmedCmd = cmd.trim();
        
        if (commandHistory.indexOf(trimmedCmd) !== -1) {
            commandHistory.splice(commandHistory.indexOf(trimmedCmd), 1);
        }
        commandHistory.unshift(trimmedCmd);
        
        while (commandHistory.length > MAX_COMMAND_HISTORY) {
            commandHistory.pop();
        }
        
        addLog("info", "> " + trimmedCmd, "Command");
        
        if (trimmedCmd === "/console-help" || trimmedCmd === "/chelp") {
            showConsoleHelp();
            return;
        }
        
        if (trimmedCmd === "/clear") {
            clearLogs();
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd === "/scan") {
            scanForCommands();
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd === "/export") {
            exportLogs();
            return;
        }
        
        if (trimmedCmd === "/save") {
            saveLogsToFile();
            addLog("success", "Logs saved to file", "Console");
            return;
        }
        
        if (trimmedCmd === "/mods") {
            listLoadedMods();
            return;
        }
        
        if (trimmedCmd === "/stats") {
            showConsoleStats();
            return;
        }
        
        if (trimmedCmd === "/commands") {
            listAvailableCommands();
            return;
        }
        
        if (trimmedCmd.startsWith("/linkcmd ")) {
            var parts = trimmedCmd.substring(9).trim().split(" ");
            if (parts.length < 2) {
                addLog("error", "Usage: /linkcmd <command> <modname>", "Console");
                addLog("info", "Example: /linkcmd /shop ShopSystemMod", "Console");
            } else {
                var command = parts[0];
                var modName = parts.slice(1).join(" ");
                linkCommandToMod(command, modName);
                if (consoleDialog) {
                    consoleDialog.hide();
                    openConsole();
                }
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/unlinkcmd ")) {
            var command = trimmedCmd.substring(11).trim();
            unlinkCommandFromMod(command);
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd === "/mod" || trimmedCmd.startsWith("/mod ")) {
            var parts = trimmedCmd.split(" ");
            
            if (parts.length === 1) {
                showModDashboard();
                return;
            }
            
            var subCmd = parts[1];
            var arg = parts.slice(2).join(" ");
            
            if (subCmd === "list") {
                showModList();
            } else if (subCmd === "info") {
                showModInfo(arg);
            } else if (subCmd === "conflicts") {
                checkModConflicts();
            } else if (subCmd === "commands") {
                showModCommands(arg);
            } else if (subCmd === "search") {
                searchMods(arg);
            } else if (subCmd === "help") {
                showModHelp();
            } else {
                addLog("error", "Unknown subcommand: " + subCmd, "Mods");
                addLog("info", "Type /mod help for available commands", "Mods");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/filter ")) {
            var filter = trimmedCmd.substring(8).trim();
            if (["all", "error", "warn", "info", "debug", "success"].indexOf(filter) !== -1) {
                currentFilter = filter;
                addLog("success", "Filter: " + filter, "Console");
                if (consoleDialog) {
                    consoleDialog.hide();
                    openConsole();
                }
            } else {
                addLog("error", "Invalid filter. Use: all, error, warn, info, debug, success", "Console");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/search ")) {
            searchQuery = trimmedCmd.substring(8).trim();
            addLog("success", "Search: '" + searchQuery + "'", "Console");
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd === "/clearsearch") {
            searchQuery = "";
            addLog("success", "Search cleared", "Console");
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd === "/clearcmds") {
            var oldCount = detectedCommands.length;
            detectedCommands = [];
            addLog("success", "Cleared " + oldCount + " commands", "Console");
            scanForCommands();
            saveConsoleSettings();
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/addcmd ")) {
            var newCmd = trimmedCmd.substring(8).trim();
            if (newCmd.startsWith("/")) {
                if (detectedCommands.indexOf(newCmd) === -1) {
                    detectedCommands.push(newCmd);
                }
                
                var disabledIndex = disabledCommands.indexOf(newCmd);
                if (disabledIndex !== -1) {
                    disabledCommands.splice(disabledIndex, 1);
                    addLog("success", "Enabled command: " + newCmd, "Console");
                } else {
                    addLog("success", "Added command: " + newCmd, "Console");
                }
                
                saveConsoleSettings();
                if (consoleDialog) {
                    consoleDialog.hide();
                    openConsole();
                }
            } else {
                addLog("error", "Commands must start with /", "Console");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/removecmd ")) {
            var rmCmd = trimmedCmd.substring(11).trim();
            var index = detectedCommands.indexOf(rmCmd);
            if (index !== -1) {
                if (disabledCommands.indexOf(rmCmd) === -1) {
                    disabledCommands.push(rmCmd);
                    addLog("success", "Disabled command: " + rmCmd, "Console");
                } else {
                    addLog("warn", "Command already disabled", "Console");
                }
                saveConsoleSettings();
                if (consoleDialog) {
                    consoleDialog.hide();
                    openConsole();
                }
            } else {
                addLog("warn", "Command not found", "Console");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/fav ")) {
            var favCmd = trimmedCmd.substring(5).trim();
            if (favoriteCommands.indexOf(favCmd) === -1) {
                favoriteCommands.push(favCmd);
                saveConsoleSettings();
                addLog("success", "Added to favorites: " + favCmd, "Console");
            } else {
                addLog("warn", "Already in favorites", "Console");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/unfav ")) {
            var unfavCmd = trimmedCmd.substring(7).trim();
            var index = favoriteCommands.indexOf(unfavCmd);
            if (index !== -1) {
                favoriteCommands.splice(index, 1);
                saveConsoleSettings();
                addLog("success", "Removed from favorites", "Console");
            } else {
                addLog("warn", "Not in favorites", "Console");
            }
            return;
        }
        
        if (trimmedCmd.startsWith("/")) {
            var cmdName = trimmedCmd.split(" ")[0];
            
            if (disabledCommands.indexOf(cmdName) !== -1) {
                addLog("warn", "Command disabled: " + cmdName, "Console");
                addLog("info", "Use /addcmd " + cmdName + " to re-enable", "Console");
                return;
            }
            
            try {
                Call.sendChatMessage(trimmedCmd);
                addLog("info", "Sent: " + trimmedCmd, "Game");
            } catch (e) {
                addLog("error", "Send failed: " + e, "Game");
            }
            return;
        }
        
        try {
            var result = eval(trimmedCmd);
            if (result !== undefined) {
                addLog("success", "Result: " + result, "JS");
            } else {
                addLog("success", "Executed", "JS");
            }
        } catch (e) {
            addLog("error", "JS Error: " + e, "JS");
        }
        
    } catch (e) {
        addLog("error", "Execute failed: " + e, "Console");
    }
}function openConsole() {
    try {
        if (consoleDialog) consoleDialog.hide();
        
        var dialog = new BaseDialog("[cyan]Developer Console v" + CONSOLE_VERSION);
        consoleDialog = dialog;
        dialog.cont.margin(8);
        
        var topBar = new Table();
        topBar.background(Styles.black6);
        topBar.defaults().pad(4);
        topBar.add("[white]Logs: " + logHistory.length);
        topBar.add("[scarlet]E:" + errorCount);
        topBar.add("[yellow]W:" + warningCount);
        topBar.add("[lime]I:" + infoCount);
        dialog.cont.add(topBar).growX().row();
        
        var filterBar = new Table();
        filterBar.defaults().size(80, 40).pad(1);
        var filters = ["all", "error", "warn", "info"];
        filters.forEach(f => {
            filterBar.button(f.substring(0, 1).toUpperCase() + f.substring(1), () => {
                currentFilter = f;
                dialog.hide();
                openConsole();
            }).checked(b => currentFilter === f);
        });
        dialog.cont.add(filterBar).growX().pad(2).row();
        
        if (searchQuery) {
            var searchBar = new Table();
            searchBar.add("[cyan]Search: [white]" + searchQuery).padRight(10);
            searchBar.button("Clear", () => {
                searchQuery = "";
                dialog.hide();
                openConsole();
            }).size(70, 35);
            dialog.cont.add(searchBar).growX().pad(2).row();
        }
        
        dialog.cont.image().color(Color.gray).height(1).growX().pad(2).row();
        
        var logTable = new Table();
        logTable.defaults().left().pad(1);
        
        var filteredLogs = getFilteredLogs();
        
        if (filteredLogs.length === 0) {
            logTable.add("[gray]No logs to display").pad(20).row();
        } else {
            var displayLogs = filteredLogs.slice(Math.max(0, filteredLogs.length - 100));
            
            displayLogs.forEach(log => {
                var icon = LOG_ICONS[log.type] || "•";
                var color = "";
                if (log.type === "error") color = "[scarlet]";
                else if (log.type === "warn") color = "[yellow]";
                else if (log.type === "info") color = "[white]";
                else if (log.type === "success") color = "[lime]";
                else color = "[gray]";
                
                var text = "";
                if (showTimestamps && !compactMode) {
                    text += "[gray][" + formatTimestamp(log.timestamp).substring(0, 8) + "][] ";
                }
                text += icon + " ";
                if (showSource && log.source !== "System" && !compactMode) {
                    text += "[cyan]<" + log.source + ">[] ";
                }
                text += color + log.message + "[]";
                
                logTable.add(text).left().width(360).wrap().padBottom(compactMode ? 1 : 3);
                
                logTable.button("Copy", () => {
                    copyLogToClipboard(log);
                }).size(50, 35).padLeft(3);
                
                logTable.row();
            });
            
            if (filteredLogs.length > 100) {
                logTable.add("[gray]... showing last 100 of " + filteredLogs.length + " ...").colspan(2).pad(5).row();
            }
        }
        
        var scrollPane = new ScrollPane(logTable);
        scrollPane.setScrollingDisabled(true, false);
        if (autoScroll) {
            Timer.schedule(() => {
                scrollPane.setScrollY(scrollPane.getMaxY());
            }, 0.1);
        }
        dialog.cont.add(scrollPane).grow().pad(4).row();
        
        dialog.cont.image().color(Color.gray).height(1).growX().pad(2).row();
        
        var cmdBar = new Table();
        cmdBar.add("[cyan]>").padRight(5);
        var cmdField = cmdBar.field("", txt => {}).width(280).get();
        cmdBar.button("[lime]Run", () => {
            var cmd = cmdField.getText();
            if (cmd && cmd.trim() !== "") {
                executeCommand(cmd);
                dialog.hide();
                Timer.schedule(() => openConsole(), 0.1);
            }
        }).size(90, 40).padLeft(3);
        dialog.cont.add(cmdBar).growX().pad(4).row();
        
        var quickBar = new Table();
        quickBar.defaults().size(90, 40).pad(1);
        quickBar.button("/help", () => {
            executeCommand("/console-help");
            dialog.hide();
            Timer.schedule(() => openConsole(), 0.1);
        });
        quickBar.button("/scan", () => {
            executeCommand("/scan");
        });
        quickBar.button("/clear", () => {
            executeCommand("/clear");
        });
        quickBar.row();
        quickBar.button("/stats", () => {
            executeCommand("/stats");
            dialog.hide();
            Timer.schedule(() => openConsole(), 0.1);
        });
        quickBar.button("/mod", () => {
            executeCommand("/mod");
            dialog.hide();
            Timer.schedule(() => openConsole(), 0.1);
        });
        quickBar.button("History", () => {
            dialog.hide();
            showCommandHistory();
        });
        dialog.cont.add(quickBar).growX().pad(4).row();
        
        if (favoriteCommands.length > 0) {
            var favBar = new Table();
            favBar.add("[gold]Favorites:").pad(3).row();
            var favTable = new Table();
            favTable.defaults().size(120, 35).pad(1);
            var favCount = 0;
            favoriteCommands.forEach(cmd => {
                if (favCount >= 6) return;
                favTable.button(cmd, () => {
                    executeCommand(cmd);
                    dialog.hide();
                    Timer.schedule(() => openConsole(), 0.1);
                });
                favCount++;
                if (favCount % 3 === 0) favTable.row();
            });
            favBar.add(favTable);
            dialog.cont.add(favBar).growX().pad(2).row();
        }
        
        dialog.buttons.defaults().size(100, 50).pad(2);
        dialog.buttons.button("Settings", () => {
            dialog.hide();
            showConsoleSettings();
        });
        dialog.buttons.button("Export", () => {
            exportLogs();
        });
        dialog.buttons.button("Close", () => {
            dialog.hide();
        });
        
        dialog.show();
        
    } catch (e) {
        print("Console: Open failed - " + e);
        Vars.ui.showInfoToast("[scarlet]Console error!", 2);
    }
}

function showCommandHistory() {
    try {
        var dialog = new BaseDialog("[cyan]Command History");
        dialog.cont.margin(10);
        
        dialog.cont.add("[cyan]Recent Commands").pad(10).row();
        dialog.cont.image().color(Color.gray).height(2).growX().pad(5).row();
        
        var histTable = new Table();
        histTable.defaults().pad(2);
        
        if (commandHistory.length === 0) {
            histTable.add("[gray]No history").pad(20).row();
        } else {
            commandHistory.forEach(cmd => {
                var cmdText = "[white]" + cmd;
                if (favoriteCommands.indexOf(cmd) !== -1) cmdText = "[gold]★ " + cmd;
                
                histTable.button(cmdText, () => {
                    executeCommand(cmd);
                    dialog.hide();
                    if (consoleDialog) {
                        consoleDialog.hide();
                        openConsole();
                    }
                }).left().minHeight(45).width(280).padBottom(2);
                
                histTable.button("Copy", () => {
                    Core.app.setClipboardText(cmd);
                    Vars.ui.showInfoToast("[lime]Copied!", 1);
                }).size(50, 45).padLeft(2);
                
                histTable.button("Fav", () => {
                    if (favoriteCommands.indexOf(cmd) === -1) {
                        favoriteCommands.push(cmd);
                        saveConsoleSettings();
                        Vars.ui.showInfoToast("[gold]Favorited!", 1.5);
                        dialog.hide();
                        showCommandHistory();
                    } else {
                        favoriteCommands.splice(favoriteCommands.indexOf(cmd), 1);
                        saveConsoleSettings();
                        Vars.ui.showInfoToast("[yellow]Unfavorited!", 1.5);
                        dialog.hide();
                        showCommandHistory();
                    }
                }).size(50, 45).padLeft(2);
                
                histTable.row();
            });
        }
        
        var scroll = new ScrollPane(histTable);
        scroll.setScrollingDisabled(true, false);
        dialog.cont.add(scroll).grow().pad(10).row();
        
        dialog.buttons.button("Clear", () => {
            commandHistory = [];
            addLog("success", "History cleared", "Console");
            dialog.hide();
        }).size(150, 55);
        
        dialog.buttons.button("Back", () => {
            dialog.hide();
        }).size(150, 55);
        
        dialog.show();
        
    } catch (e) {
        print("Console: History failed - " + e);
    }
}

function showConsoleSettings() {
    try {
        var dialog = new BaseDialog("[cyan]Console Settings");
        dialog.cont.margin(10);
        
        dialog.cont.add("[cyan]Console Settings").pad(10).row();
        dialog.cont.image().color(Color.gray).height(2).growX().pad(5).row();
        
        dialog.cont.table(t => {
            t.left();
            t.add("[white]Enable Console").left().width(200);
            t.check("", consoleEnabled, checked => {
                consoleEnabled = checked;
                saveConsoleSettings();
            }).padLeft(20);
        }).fillX().pad(10).row();
        
        dialog.cont.table(t => {
            t.left();
            t.add("[white]Show Timestamps").left().width(200);
            t.check("", showTimestamps, checked => {
                showTimestamps = checked;
                saveConsoleSettings();
            }).padLeft(20);
        }).fillX().pad(10).row();
        
        dialog.cont.table(t => {
            t.left();
            t.add("[white]Show Source").left().width(200);
            t.check("", showSource, checked => {
                showSource = checked;
                saveConsoleSettings();
            }).padLeft(20);
        }).fillX().pad(10).row();
        
        dialog.cont.table(t => {
            t.left();
            t.add("[white]Auto Scroll").left().width(200);
            t.check("", autoScroll, checked => {
                autoScroll = checked;
                saveConsoleSettings();
            }).padLeft(20);
        }).fillX().pad(10).row();
        
        dialog.cont.table(t => {
            t.left();
            t.add("[white]Compact Mode").left().width(200);
            t.check("", compactMode, checked => {
                compactMode = checked;
                saveConsoleSettings();
            }).padLeft(20);
        }).fillX().pad(10).row();
        
        dialog.cont.row();
        
        dialog.cont.button("[cyan]Scan Commands", () => {
            scanForCommands();
            Vars.ui.showInfoToast("[lime]Found " + detectedCommands.length + " commands!", 2);
            dialog.hide();
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
        }).size(250, 55).pad(5).row();
        
        dialog.cont.button("[royal]Scan Mods", () => {
            scanAllMods();
            Vars.ui.showInfoToast("[lime]Found " + modList.length + " mods!", 2);
            dialog.hide();
            if (consoleDialog) {
                consoleDialog.hide();
                openConsole();
            }
        }).size(250, 55).pad(5).row();
        
        dialog.cont.button("[yellow]Save Logs", () => {
            saveLogsToFile();
            Vars.ui.showInfoToast("[lime]Logs saved!", 2);
        }).size(250, 55).pad(5).row();
        
        dialog.cont.button("[lime]Export Logs", () => {
            exportLogs();
        }).size(250, 55).pad(5).row();
        
        dialog.cont.button("[scarlet]Clear All Logs", () => {
            Vars.ui.showConfirm("Clear Logs?", "Delete all " + logHistory.length + " logs?", () => {
                clearLogs();
                dialog.hide();
                if (consoleDialog) {
                    consoleDialog.hide();
                    openConsole();
                }
            });
        }).size(250, 55).pad(5).row();
        
        dialog.buttons.button("Back", () => {
            dialog.hide();
        }).size(150, 55);
        
        dialog.show();
        
    } catch (e) {
        print("Console: Settings failed - " + e);
    }
}// SETTINGS
Events.on(ClientLoadEvent, () => {
    try {
        loadConsoleSettings();
        setupCommandCapture();
        
        addLog("success", "Custom Commands v" + MOD_VERSION + " loaded!", "Init");
        addLog("info", "Type /customhelp to see all commands", "Init");
        
        // ✅ SCAN MODS FIRST - before linking commands
        scanAllMods();
        
        if (typeof linkCommandToMod !== 'undefined') {
            var cmds = [
                "/wallcore", "/fill", "/clear", "/conveyor", "/powerline", "/wallline",
                "/upgrade", "/replace", "/toggle", "/repair",
                "/spawn", "/healunits", "/rally", "/killenemies", "/units",
                "/turrets", "/power", "/resources", "/screenshot", "/customhelp"
            ];
            
            cmds.forEach(cmd => {
                try { 
                    linkCommandToMod(cmd, "mobileconsole");
                } catch (e) {
                    print("Failed to link: " + cmd);
                }
            });
            
            addLog("success", "Linked " + cmds.length + " commands to console", "Init");
        }
        
        Timer.schedule(() => {
            Vars.ui.showInfoToast("[lime]Custom Commands loaded!\n[cyan]Type /customhelp for help", 3);
        }, 2);
        
        print("===============================");
        print("Developer Console v" + CONSOLE_VERSION + " LOADED");
        print("Open Settings > Developer Console");
        print("Or type /chelp in chat");
        print("===============================");
        
        addLog("success", "Console v" + CONSOLE_VERSION + " ready!", "Console");
        addLog("info", "Open Settings > Developer Console", "Console");
        addLog("info", "Type /chelp for commands", "Console");
        addLog("info", "Type /mod for mod management", "Console");
        addLog("info", "Capturing all mod errors & warnings", "Console");
        
        Timer.schedule(() => {
            scanForCommands();
            addLog("success", "Auto-scan: " + detectedCommands.length + " commands", "Scanner");
            addLog("success", "Auto-scan: " + modList.length + " mods", "Scanner");
        }, 3);
        
        Vars.ui.settings.addCategory("Mobile Console", Icon.terminal, table => {
            // Enable Console Checkbox
            table.checkPref("dev-console-enabled", true, val => {
                consoleEnabled = val;
                saveConsoleSettings();
                Vars.ui.showInfoToast(val ? "[lime]✅ Console Enabled!" : "[scarlet]❌ Console Disabled!", 2);
            });
            table.row();
            
            // Show Timestamps Checkbox
            table.checkPref("console-timestamps", true, val => {
                showTimestamps = val;
                saveConsoleSettings();
            });
            table.row();
            
            // Show Source Checkbox
            table.checkPref("console-source", true, val => {
                showSource = val;
                saveConsoleSettings();
            });
            table.row();
            
            // Auto Scroll Checkbox
            table.checkPref("console-autoscroll", true, val => {
                autoScroll = val;
                saveConsoleSettings();
            });
            table.row();
            
            // Compact Mode Checkbox
            table.checkPref("console-compact", false, val => {
                compactMode = val;
                saveConsoleSettings();
            });
            table.row();
            
            // Separator
            table.add("[accent]═══ Actions ═══").padTop(20);
            table.row();
            
            // Open Console Button
            table.button("[cyan]Open Console", () => {
                openConsole();
            }).size(250, 60).padTop(10);
            table.row();
            
            // Scan Commands Button
            table.button("[cyan]Scan Commands", () => {
                scanForCommands();
                Vars.ui.showInfoToast("[lime]Found " + detectedCommands.length + " commands!", 2);
            }).size(250, 60).padTop(5);
            table.row();
            
            // Mod Manager Button
            table.button("[royal]Mod Manager", () => {
                scanAllMods();
                executeCommand("/mod");
                openConsole();
            }).size(250, 60).padTop(5);
            table.row();
            
            // Separator
            table.add("[accent]═══ Data Management ═══").padTop(20);
            table.row();
            
            // Save Logs Button
            table.button("[yellow]Save Logs", () => {
                saveLogsToFile();
                Vars.ui.showInfoToast("[lime]Logs saved!", 2);
            }).size(250, 60).padTop(10);
            table.row();
            
            // Export Logs Button
            table.button("[lime]Export Logs", () => {
                exportLogs();
            }).size(250, 60).padTop(5);
            table.row();
            
            // Clear Logs Button
            table.button("[scarlet]Clear All Logs", () => {
                Vars.ui.showConfirm("Clear Logs?", "Delete all " + logHistory.length + " logs?", () => {
                    clearLogs();
                    Vars.ui.showInfoToast("[scarlet]🗑️ Logs cleared!", 2);
                });
            }).size(250, 60).padTop(5);
            table.row();
        });
        
    } catch (e) {
        print("Console: Init failed - " + e);
    }
});

Events.on(PlayerChatEvent, e => {
    if (!e.message || !e.message.startsWith("/")) return;
    
    var parts = e.message.split(" ");
    var cmd = parts[0];
    
    if (cmd === "/customhelp") {
        showCustomHelpUI();
        return;
    }
    
    if (cmd === "/wallcore") wallCore(parts[1] || "copper-wall");
    else if (cmd === "/fill" && parts.length >= 6) fillRect(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5]);
    else if (cmd === "/clear") clearRadius(parseInt(parts[1]) || 5);
    else if (cmd === "/conveyor" && parts.length >= 5) buildConveyor(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]));
    else if (cmd === "/powerline" && parts.length >= 5) buildPowerLine(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]));
    else if (cmd === "/wallline" && parts.length >= 5) buildWallLine(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), parts[5] || "copper-wall");
    else if (cmd === "/upgrade" && parts.length >= 3) upgradeWalls(parts[1], parts[2]);
    else if (cmd === "/replace" && parts.length >= 3) replaceBlock(parts[1], parts[2]);
    else if (cmd === "/toggle") toggleBuildings(parts[1]);
    else if (cmd === "/repair") repairAll();
    else if (cmd === "/spawn" && parts.length >= 3) {
        var x = parts.length >= 4 ? parseInt(parts[3]) : undefined;
        var y = parts.length >= 5 ? parseInt(parts[4]) : undefined;
        spawnUnit(parts[1], parseInt(parts[2]), x, y);
    }
    else if (cmd === "/healunits") healAllUnits();
    else if (cmd === "/rally") rallyUnits();
    else if (cmd === "/killenemies") killEnemies(parseInt(parts[1]));
    else if (cmd === "/units") countUnits();
    else if (cmd === "/turrets") toggleTurrets();
    else if (cmd === "/power") showPowerStatus();
    else if (cmd === "/resources") showResources();
    else if (cmd === "/screenshot") cleanScreenshot();
});

Events.on(WorldLoadEvent, () => {
    if (consoleEnabled) {
        saveLogsToFile();
    }
});

print("Custom Commands Mod v" + MOD_VERSION + " loaded!");
print("Type /customhelp in chat to see all commands!");
print("Console script loaded! Check Settings menu");