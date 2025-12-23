# MobileConsole v1.0 🎮

[![Mindustry Version](https://img.shields.io/badge/Mindustry-v154+-blue.svg)](https://github.com/Anuken/Mindustry)
[![Mod Version](https://img.shields.io/badge/version-1.0-green.svg)](https://github.com/SamielXD/MobileConsole/releases)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

A complete developer console system for Mindustry mobile players! Access 20+ powerful commands optimized for touch screens, with an intuitive interface designed specifically for mobile gameplay.

---

## 🌟 Overview

MobileConsole brings powerful developer tools to your mobile device. PC players already have built-in console access, but mobile players have been left out — until now!

This mod provides:
- **20+ Commands** - Building, unit control, and utility commands
- **Touch-Optimized UI** - Large buttons and swipe-friendly interface
- **Command History** - Saves last 50 commands for quick access
- **Favorites System** - Star your most-used commands
- **Log Management** - Tracks up to 1,500 log entries with search/filter
- **Mod Management** - Dashboard for tracking installed mods
- **Color-Coded Logs** - Easy identification of errors, warnings, and info
- **Auto-Save** - Automatic log saving every 5 minutes
- **Export Functionality** - Share logs via clipboard or file

---

## 📦 Installation

### Method 1: In-Game (Recommended)

1. Open Mindustry on your mobile device
2. Go to **Mods** menu
3. Tap **Import from GitHub**
4. Enter: `SamielXD/MobileConsole`
5. Restart the game

### Method 2: Manual Installation

1. Download the latest release from [Releases](https://github.com/SamielXD/MobileConsole/releases)
2. Move the `.jar` or `.zip` file to your Mindustry mods folder:
   - **Android**: `/storage/emulated/0/Android/data/io.anuke.mindustry/files/mods/`
   - **iOS**: `Files → Mindustry → mods/`
3. Restart Mindustry

---

## 🚀 Quick Start

### Accessing the Console

**Via In-Game Chat:**
/customhelp  - Show all available commands
/chelp       - Show console system help
**Via Settings Menu:**
1. Open **Settings**
2. Navigate to **Developer Console**
3. Tap **Open Console** button

### First Commands to Try
/wallcore              - Protect your core with walls
/resources             - Check your resource levels
/power                 - View power grid status
/spawn dagger 5        - Spawn 5 dagger units
/repair                - Repair all damaged buildings
---

## 📖 Commands Reference

### 🏗️ Building Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/wallcore [type]` | Build walls around your core | `/wallcore titanium-wall` |
| `/fill <x> <y> <w> <h> <block>` | Fill rectangular area with blocks | `/fill 0 0 10 10 copper-wall` |
| `/clear [radius]` | Clear buildings around position | `/clear 10` |
| `/conveyor <x1> <y1> <x2> <y2>` | Build conveyor line between points | `/conveyor 0 0 20 20` |
| `/powerline <x1> <y1> <x2> <y2>` | Create power node connections | `/powerline 0 0 30 0` |
| `/wallline <x1> <y1> <x2> <y2> [type]` | Draw straight wall line | `/wallline 0 0 20 20 surge-wall` |

### 🔧 Modification Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/upgrade <from> <to>` | Upgrade all buildings of one type | `/upgrade copper-wall titanium-wall` |
| `/replace <from> <to>` | Replace blocks keeping rotation | `/replace mender mend-projector` |
| `/toggle [block]` | Enable/disable buildings | `/toggle drill` |
| `/repair` | Instantly repair all damaged buildings | `/repair` |

### ⚔️ Unit Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/spawn <unit> <amount> [x] [y]` | Spawn units at location | `/spawn fortress 10` |
| `/healunits` | Restore all friendly units to full health | `/healunits` |
| `/rally` | Command all units to your position | `/rally` |
| `/killenemies [radius]` | Eliminate enemies in radius | `/killenemies 50` |
| `/units` | Display unit statistics | `/units` |

### ⚡ Quick Actions

| Command | Description |
|---------|-------------|
| `/turrets` | Toggle all turrets on/off |
| `/power` | Display power grid statistics |
| `/resources` | Check core resource amounts |
| `/screenshot` | Take clean screenshot without UI |

### 🖥️ Console System

| Command | Description |
|---------|-------------|
| `/chelp` | Show console help |
| `/clear` | Clear console logs |
| `/scan` | Scan for available commands |
| `/export` | Export logs to clipboard |
| `/save` | Save logs to file |
| `/stats` | Show console statistics |
| `/commands` | List all detected commands |
| `/filter <type>` | Filter logs (all/error/warn/info) |
| `/search <text>` | Search in logs |

---

## 🔧 Mod Management

Access mod management features:
/mod                    - Show mod dashboard
/mod list               - List all installed mods
/mod info         - Detailed mod information
/mod conflicts          - Check for command conflicts
/mod commands     - Show mod's commands
/mod search    - Search mods
Link commands to mods:
/linkcmd      - Link command to mod
/unlinkcmd              - Unlink command
---

## ⚠️ Important Disclaimers

### Multiplayer Support

**This mod works in single-player only:**
- The console interface and commands are client-side
- Most commands that modify the game (spawning units, building, etc.) will NOT work on multiplayer servers
- Only informational commands (checking resources, power, etc.) may work in multiplayer
- For multiplayer gameplay, use the standard game features instead

### Important Notes

- ⚠️ Not all commands may work on every device or game version
- ⚠️ Building commands require appropriate permissions
- ⚠️ Use at your own risk - some commands may affect game performance
- ⚠️ This mod is in active development - bugs may occur
- ⚠️ PC users already have built-in console access - this mod is specifically for mobile devices

### Compatibility

- Designed for mobile devices (Android/iOS)
- Requires Mindustry v154 or higher
- Tested on Android 8.0+ and iOS 13.0+

### Performance

- Lightweight design with minimal RAM usage (256MB recommended)
- No FPS impact during normal gameplay
- Auto-cleanup of old logs to prevent memory issues

---

## 🤔 FAQ

**Q: Why aren't some commands working?**  
A: Commands may require specific permissions, or may not be compatible with your game version. Check the console logs for error messages. Most building/spawning commands only work in single-player.

**Q: Can I use this on PC?**  
A: Yes, but it's unnecessary - PC already has a built-in console (accessed with `~` or `F1`). This mod is specifically designed for mobile players.

**Q: Does this work in multiplayer?**  
A: No, most commands will not work in multiplayer. The mod is designed for single-player use only. Only read-only commands (like checking resources) might work on some servers.

**Q: How do I report a bug?**  
A: Open an issue on GitHub with:
- Your device model and OS version
- Mindustry version
- Steps to reproduce the bug
- Console logs (use `/export` command)

**Q: Can I request new features?**  
A: Yes! Open an issue with the "feature request" label and describe what you'd like to see.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup
git clone https://github.com/SamielXD/MobileConsole.git
cd MobileConsole
Make your changes to `scripts/main.js`, then test by copying the mod folder to your Mindustry mods directory.

### Testing Your Changes

1. Copy the modified mod folder to your Mindustry mods directory
2. Launch Mindustry and enable the mod
3. Test commands in single-player mode
4. Check console logs for errors using `/export`

---

## 🚧 Coming Soon

Future updates will include:
- More building commands
- Advanced scripting support
- Custom command creation
- Better multiplayer compatibility
- Performance optimizations
- More UI customization options

Stay tuned for updates!

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/SamielXD/MobileConsole/issues)
- **Discussions**: [Join the conversation](https://github.com/SamielXD/MobileConsole/discussions)
- **Author**: SamielXD

---

⭐ **Star this repo if you find it helpful!**

Thanks for using MobileConsole, and happy commanding! 🎮