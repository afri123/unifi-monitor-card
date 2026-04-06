# UniFi Monitor Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/afri123/unifi-monitor-card?style=for-the-badge)](https://github.com/afri123/unifi-monitor-card/releases)

A highly customizable, responsive, and lightweight Home Assistant Lovelace card to monitor and control your Ubiquiti UniFi network devices. 

It automatically matches related entities (CPU, RAM, Temperature, Update, and Restart) based on a simple device prefix.

<table>
  <tr>
    <td><img width="681" height="1299" alt="unifi monitor card 1" src="https://github.com/user-attachments/assets/1b420cfe-f0d6-4b5f-8c1a-000b8760fdea" /></td> 
    <td><img width="821" height="1485" alt="unifi monitor card 2" src="https://github.com/user-attachments/assets/5802ab79-f5f2-48a0-a0fd-987c484c766d" /></td> 
  </tr>
</table>

## ✨ Features

- **🪄 Zero-Config Auto-Discovery:** The card automatically scans your Home Assistant entities and builds the dashboard for all your UniFi devices without writing a single line of YAML code.
- **📸 Real Device Images (Local Setup):** Loads high-resolution, accurate hardware images for your specific UniFi devices. Hosted locally on your Home Assistant instance for zero-latency loading, complete offline capability, and no CORS browser blocking! Includes a built-in dropdown picker to manually override images.
- **⚡ Smart Rendering Engine:** Built with a custom DOM-diffing algorithm. Values update instantly in real-time without the card flickering or losing hover states.
- **🖥️ Full Visual Editor:** Configure titles, typography (fonts, uppercase/lowercase), behaviors, and all colors directly through the Home Assistant UI. No YAML required!
- **📊 Comprehensive Metrics:** Automatically pulls CPU, Memory, Temperature, Uptime, Connected Clients, IP Addresses, and Firmware Updates.
- **📱 Compact Mode:** Toggleable denser layout for mobile screens or tight dashboards.
- **Interactive:** One-click device restarts and quick update installations directly from the dashboard.
- 
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
  
## 🖼️ Local Image Setup (Required for Real Images)

To completely avoid browser CORS (Cross-Origin Resource Sharing) blocks and to guarantee lightning-fast, offline-capable rendering, this card fetches images from your local Home Assistant storage.

1. Download the high-resolution `.png` device images (Credit for the images goes to the excellent [cyberconsecurity/Unifi](https://github.com/cyberconsecurity/Unifi) repository).
2. Access your Home Assistant files (e.g., via Studio Code Server or Samba) and navigate to your `config/www` directory. 
   *(Note: The `www` folder maps to `/local/` in the browser).*
3. Create a new subfolder named `unifi` so the path looks like this: `/config/www/unifi/`.
4. Drop your downloaded `.png` files into this folder (e.g., `/config/www/unifi/UDM-Pro.png`).
5. **Important:** Hard-refresh your Home Assistant dashboard and clear your browser cache (e.g., `CTRL + F5` or `CMD + SHIFT + R`) to load the new assets.

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
compact_mode: true
show_real_images: true
name_overrides:
  udm_se: "Main Dream Machine"
  usw_pro_48_poe: "Core Switch"
image_overrides:
  udm_se: "UDM-SE.png"
  usw_pro_48_poe: "USW-Pro-48-PoE.png"
```

### Configuration Variables

All visual parameters can be set via the UI Editor. For YAML power users, here are the available root keys:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | string | **Required** | `custom:unifi-monitor-card` |
| `title` | string | `Network Infrastructure`| The header title of the card. |
| `title_icon` | string | `mdi:lan` | The icon next to the title. |
| `auto_discover` | boolean | `true` | Automatically scans for UniFi entities. |
| `compact_mode` | boolean | `false` | Reduces padding and gap sizes for a denser look. |
| `sort_online_first` | boolean | `true` | Keeps online devices at the top of the list. |
| `show_real_images` | boolean | `true` | Loads hardware PNGs instead of MDI icons. |
| `image_base_url` | string | `/local/unifi/` | The local directory path for the real images. |
| `show_version` | boolean | `true` | Show firmware version chip. |
| `show_temp` | boolean | `true` | Show temperature progress bar. |
| `show_uptime` | boolean | `true` | Show uptime chip. |
| `show_clients` | boolean | `true` | Show connected clients badge. |
| `show_ip` | boolean | `true` | Show IP address tag. |
| `name_overrides` | object | `{}` | Dictionary mapping entity prefixes to custom display names. |
| `image_overrides`| object | `{}` | Dictionary mapping entity prefixes to specific image filenames. |
| `style` | object | `{}` | Dictionary containing all visual CSS overrides (colors, fonts). |

#### Style Object Variables (`style:`)
You can customize almost every pixel by defining variables inside the `style` object. Example:
```yaml
style:
  card_bg: "rgba(20, 20, 20, 0.9)"
  accent_color: "#ff9800"
  title_text_transform: "none"
  font_family: "Roboto, sans-serif"
  icon_online_color: "#00E676"
  bar_cpu_color: "#29b6f6"
````

## 🎨 Advanced Styling (card-mod)

Since styling is now natively supported and fully customizable via the Visual Editor (including typography, colors, and backgrounds), you rarely need [card-mod](https://github.com/thomasloven/lovelace-card-mod). The built-in `style` configuration uses standard Home Assistant CSS variables (`var(--ha-card-background)`) out of the box, ensuring perfect integration with your current theme (Light/Dark mode).

## 🙏 Credits
- **Hardware Images:** High-quality UniFi device images are originally curated by the excellent [cyberconsecurity/Unifi](https://github.com/cyberconsecurity/Unifi) repository.

## 🤝 Contributing
Feel free to open an issue or submit a pull request if you have ideas for new features or find a bug!

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
