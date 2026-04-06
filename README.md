# UniFi Monitor Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/afri123/unifi-monitor-card?style=for-the-badge)](https://github.com/afri123/unifi-monitor-card/releases)

A highly customizable, responsive, and lightweight Home Assistant Lovelace card to monitor and control your Ubiquiti UniFi network devices. 

It automatically matches related entities (CPU, RAM, Temperature, Update, and Restart) based on a simple device prefix.

<img height=400px alt="unifi monitor card 1" src="https://github.com/user-attachments/assets/278b98f0-99d7-4547-9f2d-8dcad7e3c20e" />

## ✨ Features

- **🪄 Zero-Config Auto-Discovery:** The card automatically scans your Home Assistant entities and builds the dashboard for all your UniFi devices without writing a single line of YAML code.
- **🖥️ Full Visual Editor:** Configure titles, behaviors, and all colors directly through the Home Assistant UI. No YAML required!
- **Auto-Matching:** Automatically pulls CPU, Memory, Temperature, Update-Status, and Restart-Buttons for each discovered device.
- **Visual Bars:** Clean and compact progress bars for CPU and RAM utilization.
- **Smart Rendering:** Only displays what is available. If an Access Point doesn't provide temperature data, the row is dynamically hidden.
- **Interactive:** One-click device restarts and quick update installations directly from the dashboard.

## ⚙️ Installation

### HACS (Recommended)
1. Open HACS in your Home Assistant instance.
2. Click on `Frontend`.
3. Click the three dots in the top right corner and select `Custom repositories`.
4. Add the URL of this repository: `https://github.com/afri123/unifi-monitor-card`
5. Select `Dashboard` as the category and click `Add`.
6. Search for `UniFi Monitor Card` in HACS and click `Download`.
7. Reload your browser cache.

### Manual
1. Download the `unifi-monitor-card.js` file from the latest release.
2. Copy the file into your `<config>/www/` directory.
3. Go to **Settings** -> **Dashboards** -> **Resources** (top right menu).
4. Add a new resource:
   - URL: `/local/unifi-monitor-card.js`
   - Resource Type: `JavaScript Module`

## 🛠️ Configuration

Thanks to Auto-Discovery, the basic configuration requires almost no setup.

### Basic Setup (Auto-Discovery)
Just add the card type to your dashboard. It will automatically find and render your UniFi devices.

```yaml
type: custom:unifi-monitor-card
title: Network Infrastructure
````
### Advanced Setup (Manual Override)
If you want to rename specific devices, change their icons, or only show a specific subset of your devices, you can override the auto-discovery by providing a `devices` list.

```yaml
type: custom:unifi-monitor-card
title: Network Infrastructure
devices:
  - prefix: udm_se
    name: UDM Special Edition
    icon: mdi:router-network
  - prefix: usw_pro_48_poe
    name: Main Switch 48-PoE
    icon: mdi:switch
```

### Configuration Variables

All visual parameters can be set via the UI Editor. For YAML users, here are the available keys:

| Name | Type | Requirement | Description |
| --- | --- | --- | --- |
| `type` | string | **Required** | `custom:unifi-monitor-card` |
| `title` | string | Optional | The header title of the card. |
| `auto_discover` | boolean | Optional | Default is `true`. Automatically scans for UniFi devices if no `devices` list is provided. |
| `color_bg` | string | Optional | Card background (e.g. `#1e1e1e` or `var(--ha-card-background)`). |
| `border_radius` | string | Optional | Corner radius (e.g. `16px`). |
| `color_cpu` | string | Optional | Color for the CPU progress bar. |
| `color_ram` | string | Optional | Color for the Memory progress bar. |
| `color_online` | string | Optional | Icon color when the device is online. |
| `color_offline`| string | Optional | Icon color when the device is offline. |
| `devices` | list | Optional | A manual list of devices. Overrides auto-discovery if provided. |
| `> prefix` | string | **Required*** | *(Only if using manual list)* The entity prefix of your device. |
| `> name` | string | Optional | Custom display name. Defaults to the formatted prefix. |
| `> icon` | string | Optional | Custom MDI icon (e.g., `mdi:router-network`). |

## 🎨 Advanced Styling (card-mod)

Since styling is now natively supported via the Visual Editor, you only need [card-mod](https://github.com/thomasloven/lovelace-card-mod) if you want to change deeply nested CSS attributes (like font families or box shadows).

Here are the underlying CSS variables:

| Variable | Maps to UI Setting | Default Value |
| --- | --- | --- |
| `--umc-bg` | Card Background | `var(--ha-card-background)` |
| `--umc-border-radius` | Border Radius | `var(--ha-card-border-radius, 12px)` |
| `--umc-bar-cpu` | CPU Bar Color | `var(--primary-color, #03a9f4)` |
| `--umc-bar-ram` | RAM Bar Color | `var(--accent-color, #ff9800)

## 🤝 Contributing
Feel free to open an issue or submit a pull request if you have ideas for new features or find a bug!

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
