# UniFi Monitor Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/afri123/unifi-monitor-card?style=for-the-badge)](https://github.com/afri123/unifi-monitor-card/releases)

A highly customizable, responsive, and lightweight Home Assistant Lovelace card to monitor and control your Ubiquiti UniFi network devices. 

It automatically matches related entities (CPU, RAM, Temperature, Update, and Restart) based on a simple device prefix.

*(Insert Screenshot here)*
## ✨ Features

- **Auto-Matching:** Just provide the entity prefix (e.g., `udm_se`), and the card automatically pulls CPU, Memory, Temperature, Update-Status, and Restart-Buttons.
- **Visual Bars:** Clean and compact progress bars for CPU and RAM utilization.
- **Smart Rendering:** Only displays what is available. If an Access Point doesn't provide temperature data, the row is dynamically hidden.
- **Interactive:** One-click device restarts and quick update installations directly from the dashboard.
- **Highly Customizable:** Change every color, background, and shadow using CSS variables via `card_mod`.

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

To use the card, add it to your dashboard using the manual YAML editor.

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
  - prefix: u6_pro_wohnen
    name: AP Living Room
    icon: mdi:access-point
````
### Configuration Variables

| Name | Type | Requirement | Description |
| --- | --- | --- | --- |
| `type` | string | **Required** | `custom:unifi-monitor-card` |
| `title` | string | Optional | The header title of the card. |
| `devices` | list | **Required** | A list of your UniFi devices. |
| `> prefix` | string | **Required** | The entity prefix of your device (e.g., `udm_se` for `sensor.udm_se_cpu_utilization`). |
| `> name` | string | Optional | Custom display name. Defaults to the formatted prefix. |
| `> icon` | string | Optional | Custom MDI icon (e.g., `mdi:router-network`). |

## 🎨 Styling (CSS Variables)

This card is built to be styled! You can easily adjust the look using [card-mod](https://github.com/thomasloven/lovelace-card-mod).

Here are the available CSS variables and their default values:

| Variable | Default Value | Description |
| --- | --- | --- |
| `--umc-bg` | `var(--ha-card-background)` | Background color of the main card. |
| `--umc-border-radius` | `var(--ha-card-border-radius, 12px)` | Corner radius of the card. |
| `--umc-shadow` | `var(--ha-card-box-shadow)` | Box shadow of the card. |
| `--umc-icon-color` | `var(--state-icon-color, #44739e)` | Default icon color. |
| `--umc-icon-online` | `#4caf50` | Icon color when the device is online/connected. |
| `--umc-icon-offline`| `#f44336` | Icon color when the device is offline. |
| `--umc-bar-bg` | `rgba(150, 150, 150, 0.2)` | Background color of the CPU/RAM bars. |
| `--umc-bar-cpu` | `var(--primary-color, #03a9f4)` | Fill color for the CPU bar. |
| `--umc-bar-ram` | `var(--accent-color, #ff9800)` | Fill color for the RAM bar. |

### Styling Example

```yaml
type: custom:unifi-monitor-card
title: Network
devices:
  - prefix: udm_se
card_mod:
  style: |
    :host {
      --umc-bg: #1e1e1e;
      --umc-border-radius: 16px;
      --umc-bar-cpu: #00e5ff;
      --umc-bar-ram: #b2ff59;
    }
```
## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
