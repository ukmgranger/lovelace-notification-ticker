# Lovelace Notification Ticker 

A sleek, interactive custom card for Home Assistant that displays persistent notifications without eating up valuable dashboard space. 

Instead of cluttering your UI with static boxes, this card neatly loops through your active notifications using either a horizontal scrolling marquee or a modern vertical swipe block. When there are no notifications, the card completely hides itself.

*(Insert a screenshot or GIF of the card here)*

## ✨ Features

* **Two Unique Themes:**
  * **Theme 1 (Marquee):** A classic, space-saving horizontal scrolling ticker.
  * **Theme 2 (Vertical):** A modern, block-style card where notifications automatically swipe upward. Includes a live unread count badge.
* **Interactive Dismiss:** Click on a notification to read it in a clean popup modal, or hit the "Dismiss" button to permanently clear it from Home Assistant.
* **Auto-Hiding UI:** If your notification queue is empty, the card shrinks to 0 pixels and disappears, keeping your dashboard pristine.
* **Visual Editor Support:** Fully configurable via the Home Assistant UI. No YAML required.
* **Live Color Theming:** Use visual color pickers (or paste Hex codes) to customize the background, icons, and buttons to perfectly match your dashboard theme.
* **Test Mode:** A toggle in the editor that forces the card to stay visible using a placeholder text, making it easy to style even when you have no active notifications.

---

## 🛠️ Installation (Manual)

1. Download the `ywd-enhanced-ticker.js` file from this repository.
2. Inside your Home Assistant `config` directory, locate or create a folder named `www`.
3. Copy the `ywd-enhanced-ticker.js` file into the `config/www/` folder.
4. Go to your Home Assistant UI and navigate to **Settings** > **Dashboards**.
5. Click the three dots (top right) and select **Resources**.
6. Click **Add Resource** (bottom right).
7. Enter the following URL:
   ```text
   /local/ywd-enhanced-ticker.js

![notification_theme1](https://github.com/user-attachments/assets/a2fcf0de-00f4-4d34-8c1b-7cc45581c517)
![notification_theme2](https://github.com/user-attachments/assets/c2277d47-b736-4214-8bd7-033940b88928)
