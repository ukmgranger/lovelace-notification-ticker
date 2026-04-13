class YWDEnhancedTicker extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    this._getNotifications();
  }

  disconnectedCallback() {
    if (this._t1Interval) clearInterval(this._t1Interval);
    if (this._t2Interval) clearInterval(this._t2Interval);
  }

  async _getNotifications() {
    if (!this._hass) {
      setTimeout(() => this._getNotifications(), 500);
      return;
    }
    try {
      const activeNotifications = await this._hass.callWS({ type: "persistent_notification/get" });
      this._notifications = activeNotifications || [];
      this._renderCard();
      
      if (this.modal && this.modal.style.display === 'flex') {
          this._populateListModal();
      }
    } catch (e) {
      console.error("Enhanced Ticker fetch error", e);
    }
    
    if (this._fetchTimeout) clearTimeout(this._fetchTimeout);
    this._fetchTimeout = setTimeout(() => this._getNotifications(), 5000);
  }

  _cleanText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  }

  _renderCard() {
    const isTheme2 = this.config.theme === 'Theme2';
    
    if (!this.content) {
      this.innerHTML = `
        <style>
          ha-card {
            background: var(--ticker-bg, #1c1c1c);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            transition: height 0.3s ease, margin 0.3s ease;
            height: 0px;
            margin: 0;
            padding: 0;
            display: none;
          }
          ha-card.visible { display: block; height: auto; }

          /* ================== THEME 1 ================== */
          .t1-container {
            display: flex; align-items: center; height: 52px; padding: 0;
            cursor: pointer; position: relative; transition: opacity 0.2s;
          }
          .t1-container:hover { opacity: 0.8; }
          .t1-icon-box {
            background: var(--ticker-bg, #1c1c1c); height: 100%; display: flex; align-items: center;
            padding-left: 16px; padding-right: 12px; z-index: 3; flex-shrink: 0;
            color: var(--ticker-icon-color, #eab308);
          }
          .t1-viewport {
            flex-grow: 1; overflow: hidden; display: flex; align-items: center; z-index: 1; position: relative;
            mask-image: linear-gradient(to right, black 85%, transparent 95%);
            -webkit-mask-image: linear-gradient(to right, black 85%, transparent 95%);
          }
          .t1-text-wrap {
            white-space: nowrap; display: inline-block; will-change: transform;
            color: var(--primary-text-color, #e0e0e0); font-family: var(--primary-font-family);
            font-size: 14px; font-weight: 500;
          }
          .t1-separator { color: var(--ticker-icon-color, #eab308); font-weight: 900; margin: 0 25px; opacity: 0.8; }
          .t1-item { padding: 10px 0; }
          @keyframes marquee-horiz { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

          /* ================== THEME 2 ================== */
          .t2-wrapper { padding: 12px 16px; font-family: var(--primary-font-family); color: var(--primary-text-color); }
          .t2-layout { display: flex; align-items: center; gap: 16px; }
          .t2-icon-group {
            position: relative; width: 44px; height: 44px; flex-shrink: 0;
            cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .t2-icon-group:hover { transform: scale(1.08); }
          .t2-icon-bg {
            background: rgba(255, 255, 255, 0.08); width: 44px; height: 44px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: var(--ticker-icon-color, #eab308);
          }
          .t2-badge {
            position: absolute; top: -4px; right: -4px; background: #E53935; color: white;
            font-size: 10px; font-weight: bold; width: 18px; height: 18px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid var(--ticker-bg, #1c1c1c); z-index: 2;
          }
          .t2-content-col {
            flex-grow: 1; display: flex; flex-direction: column; justify-content: center;
            overflow: hidden; min-width: 0;
          }
          .t2-content-viewport {
            height: 44px; position: relative; overflow: hidden;
            mask-image: linear-gradient(to top, transparent, black 15%, black 85%, transparent);
            -webkit-mask-image: linear-gradient(to top, transparent, black 15%, black 85%, transparent);
          }
          .t2-content-track { display: flex; flex-direction: column; will-change: transform; transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1); }
          .t2-content-item { height: 44px; display: flex; flex-direction: column; justify-content: center; }
          .t2-title-text, .t2-msg-text {
            white-space: nowrap; overflow: hidden; position: relative;
            mask-image: linear-gradient(to right, black 90%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
          }
          .t2-title-text {
            height: 18px; line-height: 18px; margin-bottom: 2px; text-transform: uppercase;
            letter-spacing: 0.1em; font-size: 11px; font-weight: 700; color: var(--primary-text-color); opacity: 0.7;
          }
          .t2-msg-text { height: 24px; line-height: 24px; font-size: 15px; font-weight: 500; }
          .t2-inner-scroll { display: inline-block; will-change: transform; }
          .t2-action-group { flex-shrink: 0; display: flex; align-items: center; }
          .t2-dismiss-btn {
            background: none; border: none; padding: 0; cursor: pointer;
            font-size: 13px; font-weight: 500; color: var(--ticker-dismiss-color, #15E4C6);
            text-transform: uppercase; letter-spacing: 0.15em; transition: opacity 0.2s;
          }
          .t2-dismiss-btn:hover { opacity: 0.7; }

          /* ================== LIST MODAL ================== */
          #list-modal {
            display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px); z-index: 9999; align-items: center; justify-content: center;
          }
          .list-modal-content {
            background: var(--ha-card-background, #1c1c1c); width: 90%; max-width: 500px;
            border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
            max-height: 80vh; border: 1px solid #333; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          }
          .list-modal-header {
            padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex;
            justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);
          }
          .list-modal-header h2 { margin: 0; font-size: 18px; color: var(--primary-text-color); display: flex; align-items: center; gap: 8px; }
          
          /* Fixed perfectly centered close button */
          .list-modal-close {
            background: rgba(255,255,255,0.1); border: none; color: var(--primary-text-color);
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer; 
            display: flex; align-items: center; justify-content: center; 
            transition: background 0.2s; padding: 0; margin: 0; outline: none;
          }
          .list-modal-close:hover { background: rgba(255,255,255,0.2); }
          .list-modal-close ha-icon {
            display: flex;
            --mdc-icon-size: 20px;
          }

          .list-modal-body { padding: 0; overflow-y: auto; flex-grow: 1; }
          .list-modal-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .list-modal-item:last-child { border-bottom: none; }
          .list-item-text { display: flex; flex-direction: column; gap: 4px; padding-right: 16px; flex-grow: 1; min-width: 0; }
          .list-item-title { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; color: var(--primary-text-color); }
          .list-item-message { font-size: 14px; line-height: 1.4; color: var(--primary-text-color); word-wrap: break-word; }
          .list-item-dismiss {
            background: rgba(21, 228, 198, 0.1); color: var(--ticker-dismiss-color, #15E4C6);
            border: 1px solid rgba(21, 228, 198, 0.2); padding: 8px 12px; border-radius: 8px;
            font-weight: 600; cursor: pointer; text-transform: uppercase; font-size: 12px; transition: background 0.2s; flex-shrink: 0;
          }
          .list-item-dismiss:hover { background: rgba(21, 228, 198, 0.2); }
          .list-modal-empty { padding: 40px 20px; text-align: center; opacity: 0.5; color: var(--primary-text-color); }
        </style>

        <ha-card id="main-card">
          <div id="card-content"></div>
        </ha-card>

        <div id="list-modal">
          <div class="list-modal-content">
            <div class="list-modal-header">
              <h2><ha-icon icon="${this.config.icon || 'mdi:bell'}"></ha-icon> Notifications</h2>
              <button class="list-modal-close" id="close-list-modal"><ha-icon icon="mdi:close"></ha-icon></button>
            </div>
            <div class="list-modal-body" id="list-modal-body">
              </div>
          </div>
        </div>
      `;
      
      this.card = this.querySelector('#main-card');
      this.content = this.querySelector('#card-content');
      this.modal = this.querySelector('#list-modal');
      this.modalBody = this.querySelector('#list-modal-body');
      
      this.querySelector('#close-list-modal').addEventListener('click', () => {
        this.modal.style.display = 'none';
      });
      
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.modal.style.display = 'none';
      });
    }

    this.style.setProperty('--ticker-bg', this.config.background_color || '#1c1c1c');
    this.style.setProperty('--ticker-icon-color', this.config.icon_color || '#eab308');
    this.style.setProperty('--ticker-dismiss-color', this.config.dismiss_color || '#15E4C6');
    
    const msgs = (this._notifications || []).map(n => this._cleanText(n.message || n.title || 'Notification')).filter(m => m.length > 0);
    const hasActive = msgs.length > 0;
    const isTestMode = this.config.test_mode === true;
    const currentTheme = this.config.theme || 'Theme1';

    if (hasActive || isTestMode) {
      this.card.classList.add('visible');
      if (!this._lastThemeRendered || this._lastThemeRendered !== currentTheme || this._forceReRender) {
        this._renderTheme(currentTheme, hasActive, msgs);
        this._forceReRender = false;
      } else {
        if (isTheme2 && currentTheme === 'Theme2') {
          this._updateT2Content();
        } else if (!isTheme2 && currentTheme === 'Theme1') {
          this._updateT1Content(hasActive, msgs);
        }
      }
    } else {
      this.card.classList.remove('visible');
    }
  }

  _renderTheme(themeName, hasActive, rawMsgs) {
    this._lastThemeRendered = themeName;
    if (themeName === 'Theme2') {
      this._renderT2();
    } else {
      this._renderT1(hasActive, rawMsgs);
    }
  }

  /* ==================================================== */
  /* MODAL LOGIC                                          */
  /* ==================================================== */
  _openListModal() {
    this._populateListModal();
    this.modal.style.display = 'flex';
  }

  _populateListModal() {
    if (!this._notifications || this._notifications.length === 0) {
      const isTestMode = this.config.test_mode === true;
      if (isTestMode) {
          this.modalBody.innerHTML = `
            <div class="list-modal-item">
              <div class="list-item-text">
                <div class="list-item-title">Test Mode</div>
                <div class="list-item-message">${this.config.default_text || "System Ready"}</div>
              </div>
            </div>
          `;
      } else {
          this.modalBody.innerHTML = `<div class="list-modal-empty">No active notifications</div>`;
          setTimeout(() => { this.modal.style.display = 'none'; }, 1500); 
      }
      return;
    }

    const sorted = [...this._notifications].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    this.modalBody.innerHTML = sorted.map(n => {
      const title = n.title ? this._cleanText(n.title) : 'Notification';
      const msg = this._cleanText(n.message);
      return `
        <div class="list-modal-item">
          <div class="list-item-text">
            <div class="list-item-title">${title}</div>
            <div class="list-item-message">${msg}</div>
          </div>
          <button class="list-item-dismiss" data-id="${n.notification_id}">Dismiss</button>
        </div>
      `;
    }).join('');

    const dismissBtns = this.modalBody.querySelectorAll('.list-item-dismiss');
    dismissBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this._dismissSpecificNotification(id);
      });
    });
  }

  async _dismissSpecificNotification(id) {
    if (id) {
      const btn = this.modalBody.querySelector(`[data-id="${id}"]`);
      if (btn) btn.closest('.list-modal-item').style.display = 'none';

      await this._hass.callService("persistent_notification", "dismiss", { notification_id: id });
      
      this._t1DataHash = null; 
      this._t2DataHash = null;
      this._getNotifications();
    }
  }

  /* ==================================================== */
  /* THEME 1 (MARQUEE) LOGIC                              */
  /* ==================================================== */
  _renderT1(hasActive, msgs) {
    const displayIcon = this.config.icon || 'mdi:bell-ring-outline';
    this._t1DataHash = null; 
    
    this.content.innerHTML = `
      <div class="t1-container" id="t1-clicker">
        <div class="t1-icon-box">
          <ha-icon icon="${displayIcon}"></ha-icon>
        </div>
        <div class="t1-viewport">
          <div class="t1-text-wrap" id="t1-track"></div>
        </div>
      </div>
    `;
    
    this.querySelector('#t1-clicker').addEventListener('click', () => {
      this._openListModal();
    });

    this._updateT1Content(hasActive, msgs, true);

    if (this._t2Interval) { clearInterval(this._t2Interval); this._t2Interval = null; }
  }

  _updateT1Content(hasActive, msgs, force = false) {
    const track = this.querySelector('#t1-track');
    if (!track) return;
    
    const dataHash = JSON.stringify(msgs);
    if (this._t1DataHash === dataHash && !force) return; 
    this._t1DataHash = dataHash;
    
    const sep = `<span class="t1-separator"> | </span>`;
    const defaultMsg = `<span class="t1-item">${this.config.default_text || "System Ready (Test Mode)"}</span>`;
    const contentText = hasActive ? msgs.map(m => `<span class="t1-item">${m}</span>`).join(sep) : defaultMsg;
    const finalText = `${contentText}${sep}${contentText}${sep}`;
    
    track.innerHTML = finalText;
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!track) return;
        const durationSetting = this.config.speed || 50;
        const pixelsPerSecond = (105 - durationSetting);
        const width = track.scrollWidth / 2;
        if (width === 0) return; 
        
        const duration = width / pixelsPerSecond;
        track.style.animation = 'none';
        track.offsetHeight; 
        track.style.animation = `marquee-horiz ${duration}s linear infinite`;
      }, 50);
    });
  }

  /* ==================================================== */
  /* THEME 2 (VERTICAL BLOCK) LOGIC                       */
  /* ==================================================== */
  _renderT2() {
    if (!this._notifications || this._notifications.length === 0) return;
    
    this._t2DataHash = null; 
    this._t2CurrentIndex = 0;
    this._t2IntervalMs = (100 - (this.config.speed || 50)) * 70;
    const displayIcon = this.config.icon || 'mdi:alert-circle-outline';

    this.content.innerHTML = `
      <div class="t2-wrapper">
        <div class="t2-layout">
          
          <div class="t2-icon-group" id="t2-icon-trigger">
            <div class="t2-icon-bg">
              <ha-icon icon="${displayIcon}"></ha-icon>
            </div>
            <div class="t2-badge" id="t2-badge-num"></div>
          </div>
          
          <div class="t2-content-col">
            <div class="t2-content-viewport">
              <div class="t2-content-track" id="t2-content-track"></div>
            </div>
          </div>

          <div class="t2-action-group">
            <button class="t2-dismiss-btn" id="t2-dismiss-trigger">Dismiss</button>
          </div>

        </div>
      </div>
    `;

    this.querySelector('#t2-icon-trigger').addEventListener('click', () => {
      this._openListModal();
    });

    this.querySelector('#t2-dismiss-trigger').addEventListener('click', () => this._dismissT2Current());
    
    this._updateT2Content(true);

    if (this._t2Interval) clearInterval(this._t2Interval);
    if (this._notifications.length > 1) {
      this._t2Interval = setInterval(() => this._swipeT2Next(), this._t2IntervalMs);
    }
    
    if (this._t1Interval) { clearInterval(this._t1Interval); this._t1Interval = null; }
  }

  _updateT2Content(force = false) {
    if (!this._notifications || this._notifications.length === 0) return;
    
    const track = this.querySelector('#t2-content-track');
    if (!track) return;

    const dataHash = JSON.stringify(this._notifications.map(n => n.notification_id + n.message));
    if (this._t2DataHash === dataHash && !force) return;
    this._t2DataHash = dataHash;

    const badge = this.querySelector('#t2-badge-num');
    badge.innerText = this._notifications.length;
    
    this._sortedNotifications = [...this._notifications].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    const buildItemHTML = (n) => {
      const safeTitle = n.title ? this._cleanText(n.title) : "NOTIFICATION";
      const safeMsg = this._cleanText(n.message || 'Notification');
      return `
        <div class="t2-content-item">
          <div class="t2-title-text"><span class="t2-inner-scroll">${safeTitle}</span></div>
          <div class="t2-msg-text"><span class="t2-inner-scroll">${safeMsg}</span></div>
        </div>
      `;
    };

    const msgsList = this._sortedNotifications.map(buildItemHTML).join('');
    const safeFirstMsg = buildItemHTML(this._sortedNotifications[0]);
    
    track.innerHTML = `${msgsList}${safeFirstMsg}`;
    
    track.style.transition = 'none';
    this._t2CurrentIndex = 0;
    track.style.transform = `translateY(0)`;
    track.offsetHeight;
    track.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)';

    this._applyT2HorizontalMarquees(track);

    if (this._t2Interval) clearInterval(this._t2Interval);
    if (this._sortedNotifications.length > 1) {
      this._t2IntervalMs = (100 - (this.config.speed || 50)) * 70;
      this._t2Interval = setInterval(() => this._swipeT2Next(), this._t2IntervalMs);
    }
  }

  _applyT2HorizontalMarquees(track) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const textContainers = track.querySelectorAll('.t2-title-text, .t2-msg-text');
        textContainers.forEach(container => {
          const inner = container.querySelector('.t2-inner-scroll');
          if (!inner || container.dataset.marqueeApplied) return;

          if (inner.scrollWidth > container.clientWidth && container.clientWidth > 0) {
            container.dataset.marqueeApplied = "true";
            const originalHTML = inner.innerHTML;
            const spacer = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'; 
            
            inner.innerHTML = `${originalHTML}${spacer}${originalHTML}`;
            
            const pxPerSec = 35; 
            const duration = (inner.scrollWidth / 2) / pxPerSec;
            
            inner.style.animation = `marquee-horiz ${duration}s linear infinite`;
          }
        });
      }, 50); 
    });
  }

  _swipeT2Next() {
    if (!this._sortedNotifications || this._sortedNotifications.length <= 1) return;
    
    const track = this.querySelector('#t2-content-track');
    if (!track) return;

    this._t2CurrentIndex++;
    const numItems = this._sortedNotifications.length;
    track.style.transform = `translateY(-${this._t2CurrentIndex * 44}px)`;

    if (this._t2CurrentIndex === numItems) {
      setTimeout(() => {
        if(!track) return;
        track.style.transition = 'none';
        this._t2CurrentIndex = 0;
        track.style.transform = `translateY(0)`;
        track.offsetHeight;
        track.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)';
      }, 800);
    }
  }

  async _dismissT2Current() {
    if (!this._sortedNotifications) return;
    
    const numItems = this._sortedNotifications.length;
    const currentId = this._sortedNotifications[this._t2CurrentIndex % numItems]?.notification_id;
    
    if (currentId) {
      if (this._t2Interval) clearInterval(this._t2Interval);
      await this._hass.callService("persistent_notification", "dismiss", {
        notification_id: currentId
      });
      this._t2DataHash = null; 
      this._getNotifications();
    }
  }

  setConfig(config) {
    if (this.config) {
      if (this.config.theme !== config.theme || 
          this.config.icon !== config.icon || 
          this.config.speed !== config.speed) {
        this._forceReRender = true;
      }
    }
    this.config = config;
  }

  static getConfigElement() { return document.createElement("ywd-ticker-editor"); }
  static getStubConfig() { return { theme: "Theme2", test_mode: true, speed: 50, background_color: "#1c1c1c", icon_color: "#eab308", dismiss_color: "#15E4C6", icon: "mdi:alert-circle-outline" }; }
}

/* ==================================================== */
/* EDITOR UI                                            */
/* ==================================================== */
class YWDTickerEditor extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { this._hass = hass; }
  
  render() {
    if (!this._config) return;
    
    this.innerHTML = `
      <div style="padding: 10px; color: var(--primary-text-color); display: flex; flex-direction: column; gap: 15px;">
        
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <label style="display:block; margin-bottom:10px; font-weight: bold;">Card Theme</label>
            <div style="display: flex; gap: 10px;">
                <label style="flex: 1; cursor: pointer;">
                  <input type="radio" name="ticker_theme" value="Theme1" ${this._config.theme === 'Theme1' ? 'checked' : ''} style="margin-right:8px;"> 
                  Theme 1 (Marquee)
                </label>
                <label style="flex: 1; cursor: pointer;">
                  <input type="radio" name="ticker_theme" value="Theme2" ${this._config.theme === 'Theme2' ? 'checked' : ''} style="margin-right:8px;"> 
                  Theme 2 (Vertical)
                </label>
            </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
          <input type="checkbox" id="test_mode" ${this._config.test_mode ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <label for="test_mode" style="font-weight: bold; cursor: pointer;">Enable Test Mode (Theme 1 Only)</label>
        </div>

        <div>
          <label style="display:block; margin-bottom:5px; font-weight: bold;">Default/Test Text (Theme 1 Only)</label>
          <input type="text" id="def_text" value="${this._config.default_text || ''}" placeholder="System Ready" style="width:100%; background: #2c2c2c; color: white; border: 1px solid #555; padding: 10px; border-radius: 4px;">
        </div>

        <div>
          <label style="display:block; margin-bottom:5px; font-weight: bold;">Icon (e.g. mdi:bell)</label>
          <input type="text" id="icon_picker" value="${this._config.icon || ''}" placeholder="mdi:alert-circle-outline" style="width:100%; background: #2c2c2c; color: white; border: 1px solid #555; padding: 10px; border-radius: 4px;">
        </div>

        <div style="display: flex; gap: 10px;">
          <div style="flex: 1;">
            <label>BG Color</label>
            <input type="color" id="bg_clr_p" value="${this._config.background_color || '#1c1c1c'}" style="width:100%; height:40px; border:none; padding:0; background:none; cursor: pointer;">
          </div>
          <div style="flex: 1;">
            <label>Icon Color</label>
            <input type="color" id="icon_clr_p" value="${this._config.icon_color || '#eab308'}" style="width:100%; height:40px; border:none; padding:0; background:none; cursor: pointer;">
          </div>
          <div style="flex: 1;">
            <label>Dismiss Color</label>
            <input type="color" id="dismiss_clr_p" value="${this._config.dismiss_color || '#15E4C6'}" style="width:100%; height:40px; border:none; padding:0; background:none; cursor: pointer;">
          </div>
        </div>

        <div>
          <label style="display:block; margin-bottom:5px; font-weight: bold;">Speed/Interval (Lower is faster)</label>
          <input type="range" id="speed_rng" min="10" max="90" value="${this._config.speed || 50}" style="width:100%;">
        </div>
      </div>
    `;

    this.querySelectorAll('input[name="ticker_theme"]').forEach(radio => {
      radio.addEventListener('change', (ev) => this._update('theme', ev.target.value));
    });
    
    this.querySelector('#bg_clr_p').addEventListener('input', (ev) => this._update('background_color', ev.target.value));
    this.querySelector('#icon_clr_p').addEventListener('input', (ev) => this._update('icon_color', ev.target.value));
    this.querySelector('#dismiss_clr_p').addEventListener('input', (ev) => this._update('dismiss_color', ev.target.value));
    this.querySelector('#test_mode').addEventListener('change', (ev) => this._update('test_mode', ev.target.checked));
    this.querySelector('#def_text').addEventListener('change', (ev) => this._update('default_text', ev.target.value));
    this.querySelector('#icon_picker').addEventListener('change', (ev) => this._update('icon', ev.target.value));
    this.querySelector('#speed_rng').addEventListener('input', (ev) => this._update('speed', parseInt(ev.target.value)));
  }

  _update(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    this.render(); 
  }
}

customElements.define('ywd-enhanced-ticker', YWDEnhancedTicker);
customElements.define('ywd-ticker-editor', YWDTickerEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ywd-enhanced-ticker",
  name: "YWD Enhanced Notification Ticker",
  description: "Marquee ticker with optional interactive vertical theme.",
  preview: true
});
