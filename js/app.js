const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// Render Menu
async function renderMenu() {
  const menuContainer = document.getElementById('menu');
  if (!menuContainer) return;

  let categories = [];
  try {
    const res = await fetch(`${API_URL}/menu`);
    if (!res.ok) throw new Error('API failed');
    categories = await res.json();
    localStorage.setItem('diwanMenuCache', JSON.stringify(categories));
    localStorage.setItem('diwanMenuCacheTime', Date.now().toString());
  } catch (error) {
    console.error('Failed to load menu:', error);
    const cache = localStorage.getItem('diwanMenuCache');
    const cacheTime = localStorage.getItem('diwanMenuCacheTime');
    if (cache && cacheTime && (Date.now() - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) {
      categories = JSON.parse(cache);
      const lbl = document.querySelector('#menu .lbl');
      if(lbl && !lbl.innerHTML.includes('Offline Cache')) {
        lbl.innerHTML += ` <span style="background:rgba(200,146,42,0.2);padding:2px 6px;border-radius:4px;margin-left:8px;font-size:9px;color:var(--gold);">Offline Cache</span>`;
      }
    } else {
      return; // No fallback available
    }
  }

  const tabsContainer = document.querySelector('.tabs');
  const innerContainer = tabsContainer.parentElement;

  // Clear existing dynamic content
  document.querySelectorAll('.panel.dynamic-panel').forEach(el => el.remove());
  document.querySelectorAll('.sub-tabs').forEach(el => el.remove());
  document.querySelectorAll('.menu-extra-controls').forEach(el => el.remove());

  let tabsHtml = '';
  let subTabsHtml = '';
  let panelsHtml = '';

  const searchHtml = `<div style="flex-grow: 1; position: relative;">
      <input type="text" id="menuSearch" placeholder="Suchen..." style="width:100%; border-radius:100px; padding: 12px 20px 12px 40px; background: var(--bg2); border: 1px solid rgba(200,146,42,0.2); color: var(--cream);" />
      <span style="position:absolute; left:16px; top:13px; opacity:0.5; font-size:14px;">🔍</span>
  </div>`;
  const pdfHtml = `<a href="${API_URL}/menu/pdf" target="_blank" class="btn-o" style="flex-shrink: 0;"><span class="pl">↓</span> Speisekarte (PDF)</a>`;

  categories.forEach((cat, index) => {
    const isFirst = index === 0;
    const catName = currentLang === 'de' ? cat.nameDe : (cat.nameFa || cat.nameDe);
    
    tabsHtml += `<button class="tab ${isFirst ? 'active' : ''}" data-tab="${cat.slug}">${catName}</button>`;
    
    // Subcategories strip
    const hasSubs = cat.subcategories && cat.subcategories.length > 0;
    if (hasSubs) {
      let subButtons = '';
      cat.subcategories.forEach((sub, subIdx) => {
        const subName = currentLang === 'de' ? sub.nameDe : (sub.nameFa || sub.nameDe);
        subButtons += `<button class="sub-tab ${subIdx === 0 ? 'active' : ''}" data-subtab="${sub.slug}">${subName}</button>`;
      });
      subTabsHtml += `<div class="sub-tabs" id="subtabs-${cat.slug}" style="display: ${isFirst ? 'flex' : 'none'}; gap: 10px; margin-bottom: 24px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px;">
        ${subButtons}
      </div>`;
    }

    // Build items html (grouping by subcategory or parent)
    let itemsHtml = '';
    
    const renderItem = (item, itemIdx) => {
      const itemName = currentLang === 'de' ? item.nameDe : (item.nameFa || item.nameDe);
      const itemDesc = currentLang === 'de' ? item.descriptionDe : (item.descriptionFa || item.descriptionDe);
      let faLabel = '';
      if (currentLang === 'de' && item.nameFa) {
          faLabel = `<span class="mfa">${item.nameFa}</span>`;
      }
      const delayClass = `d${itemIdx % 3 + 1}`;
      
      const specialClass = item.isSpecial ? 'special-item' : '';
      const imgHtml = item.imageUrl ? `<div style="overflow:hidden; border-radius:8px; margin-bottom:14px;"><img src="${item.imageUrl}" style="width:100%; height:160px; object-fit:cover; display:block;" /></div>` : '';
      const allergensHtml = item.allergens ? `<div style="font-size:10px; color:gray; margin-top:12px;">Allergene: ${item.allergens}</div>` : '';
      const badgeHtml = item.isSpecial ? `<div style="position:absolute; top:14px; right:14px; background:var(--gold); color:var(--bg); font-size:10px; padding:3px 10px; border-radius:100px; text-transform:uppercase; font-weight:600; z-index:2;">Empfehlung</div>` : '';
      
      return `
        <div class="mi r ${delayClass} ${specialClass} search-item" data-name="${itemName.toLowerCase()}" data-desc="${(itemDesc||'').toLowerCase()}">
          ${badgeHtml}
          ${imgHtml}
          <div class="mn">${itemName}</div>
          ${faLabel}
          <div class="md">${itemDesc || ''}</div>
          ${allergensHtml}
          <div class="mp">€ ${Number(item.price).toFixed(2).replace('.', ',')}</div>
        </div>
      `;
    };

    if (cat.items && cat.items.length > 0) {
      itemsHtml += `<div class="sub-panel active">`;
      cat.items.forEach((item, idx) => itemsHtml += renderItem(item, idx));
      itemsHtml += `</div>`;
    }

    if (hasSubs) {
      cat.subcategories.forEach((sub, subIdx) => {
        const isActiveSub = subIdx === 0 && (!cat.items || cat.items.length === 0);
        itemsHtml += `<div id="subpanel-${sub.slug}" class="sub-panel ${isActiveSub ? 'active' : 'hidden'}" style="display: ${isActiveSub ? 'grid' : 'none'};">`;
        sub.items.forEach((item, idx) => itemsHtml += renderItem(item, idx));
        itemsHtml += `</div>`;
      });
    }

    panelsHtml += `
      <div id="tab-${cat.slug}" class="panel dynamic-panel ${isFirst ? 'active' : ''}">
        ${itemsHtml}
      </div>
    `;
  });

  tabsContainer.innerHTML = tabsHtml;
  
  const extraControls = document.createElement('div');
  extraControls.className = 'menu-extra-controls';
  extraControls.innerHTML = `<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; margin-bottom: 24px;">${searchHtml}${pdfHtml}</div>` + subTabsHtml;
  tabsContainer.after(extraControls);

  const div = document.createElement('div');
  div.innerHTML = panelsHtml;
  Array.from(div.children).forEach(child => innerContainer.appendChild(child));

  // Tab logic
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  const allSubTabsContainer = document.querySelectorAll('.sub-tabs');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => {
        p.style.opacity = '0';
        setTimeout(() => { p.classList.remove('active'); p.style.opacity = '1'; }, 200);
      });
      allSubTabsContainer.forEach(st => st.style.display = 'none');
      
      tab.classList.add('active');
      const targetPanel = document.getElementById('tab-' + tab.dataset.tab);
      const targetSubtabs = document.getElementById('subtabs-' + tab.dataset.tab);
      
      setTimeout(() => {
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.style.animation = 'fu 0.4s forwards';
        }
        if (targetSubtabs) targetSubtabs.style.display = 'flex';
      }, 200);
    });
  });

  // Subtab logic
  document.querySelectorAll('.sub-tab').forEach(subTab => {
    subTab.addEventListener('click', (e) => {
      const parentContainer = e.target.closest('.sub-tabs');
      parentContainer.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      const panelId = parentContainer.id.replace('subtabs-', 'tab-');
      const panel = document.getElementById(panelId);
      panel.querySelectorAll('.sub-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });
      
      const targetSubPanel = document.getElementById('subpanel-' + e.target.dataset.subtab);
      if (targetSubPanel) {
        targetSubPanel.style.display = 'grid';
        targetSubPanel.classList.add('active');
        targetSubPanel.style.animation = 'fu 0.4s forwards';
      }
    });
  });

  // Search logic
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.search-item').forEach(item => {
        const match = item.dataset.name.includes(q) || item.dataset.desc.includes(q);
        item.style.display = match ? '' : 'none';
      });
    });
  }
}

async function renderPublicEvents() {
  const list = document.getElementById('public-events-list');
  if (!list) return;
  try {
    const res = await fetch(`${API_URL}/event-listings`);
    const events = await res.json();
    if (!Array.isArray(events) || events.length === 0) return;
    list.innerHTML = events.map((event, idx) => {
      const date = new Date(event.eventDate);
      const title = currentLang === 'fa' && event.titleFa ? event.titleFa : event.titleDe;
      return `
        <div class="ei r d${idx % 4}">
          <div><div class="eday">${String(date.getDate()).padStart(2, '0')}</div><div class="emon">${date.toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : 'de-DE', { month: 'short' })}</div></div>
          <div><div class="ename">${title}</div><div class="edesc">${event.description || ''}</div></div>
          <div class="etime">${event.eventTime}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}

async function renderSiteContent() {
  try {
    const res = await fetch(`${API_URL}/site-content`);
    if (!res.ok) return;
    const content = await res.json();
    Object.entries(content).forEach(([key, block]) => {
      const value = currentLang === 'fa' ? (block.valueFa || block.valueDe) : (block.valueDe || block.valueFa);
      if (!value) return;
      document.querySelectorAll(`[data-content-key="${key}"]`).forEach(el => {
        el.innerHTML = value;
      });
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el => {
        el.innerHTML = value;
      });
    });
  } catch (error) {
    console.error('Failed to load site content:', error);
  }
}

// Handle Forms
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  renderPublicEvents();
  renderSiteContent();

  const resForm = document.getElementById('reservationForm');
  if (resForm) {
    resForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('resName').value,
        email: document.getElementById('resEmail').value,
        phone: document.getElementById('resPhone').value,
        date: document.getElementById('resDate').value,
        time: document.getElementById('resTime').value,
        guests: document.getElementById('resGuests').value,
        specialRequests: document.getElementById('resNotes').value,
      };
      try {
        const res = await fetch(`${API_URL}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          document.getElementById('form-ok').style.display = 'block';
          resForm.reset();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  const evForm = document.getElementById('eventForm');
  if (evForm) {
    evForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('evName').value,
        email: document.getElementById('evEmail').value,
        phone: document.getElementById('evPhone').value,
        eventDate: document.getElementById('evDate').value,
        eventTiming: document.getElementById('evTiming').value,
        numberOfPeople: document.getElementById('evGuests').value,
        eventType: document.getElementById('evType').value,
        drinks: document.getElementById('evDrinks').value,
        cakes: document.getElementById('evCakes').value,
        food: document.getElementById('evFood').value,
        equipment: document.getElementById('evEquip').value,
        decor: document.getElementById('evDecor').value,
        otherNotes: document.getElementById('evNotes').value,
      };
      try {
        const res = await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          document.getElementById('event-form-ok').style.display = 'block';
          evForm.reset();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
});
