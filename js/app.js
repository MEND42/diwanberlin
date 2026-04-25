const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// Render Menu
async function renderMenu() {
  const menuContainer = document.getElementById('menu');
  if (!menuContainer) return;

  try {
    const res = await fetch(`${API_URL}/menu`);
    const categories = await res.json();
    
    // Find the tabs and panels container
    const tabsContainer = document.querySelector('.tabs');
    const innerContainer = tabsContainer.parentElement;

    // Clear existing dynamic content if any
    document.querySelectorAll('.panel.dynamic-panel').forEach(el => el.remove());

    let tabsHtml = '';
    let panelsHtml = '';

    categories.forEach((cat, index) => {
      const isFirst = index === 0;
      const catName = currentLang === 'de' ? cat.nameDe : (cat.nameFa || cat.nameDe);
      
      tabsHtml += `<button class="tab ${isFirst ? 'active' : ''}" data-tab="${cat.slug}">${catName}</button>`;
      
      let itemsHtml = '';
      cat.items.forEach((item, itemIdx) => {
        const itemName = currentLang === 'de' ? item.nameDe : (item.nameFa || item.nameDe);
        const itemDesc = currentLang === 'de' ? item.descriptionDe : (item.descriptionFa || item.descriptionDe);
        
        let faLabel = '';
        if (currentLang === 'de' && item.nameFa) {
            faLabel = `<span class="mfa">${item.nameFa}</span>`;
        }

        const delayClass = `d${itemIdx % 3 + 1}`; // For staggered animation

        itemsHtml += `
          <div class="mi r ${delayClass}">
            <div class="mn">${itemName}</div>
            ${faLabel}
            <div class="md">${itemDesc || ''}</div>
            <div class="mp">€ ${Number(item.price).toFixed(2).replace('.', ',')}</div>
          </div>
        `;
      });

      panelsHtml += `
        <div id="tab-${cat.slug}" class="panel dynamic-panel ${isFirst ? 'active' : ''}">
          ${itemsHtml}
        </div>
      `;
    });

    tabsContainer.innerHTML = tabsHtml;
    
    // Append panels after tabs
    const div = document.createElement('div');
    div.innerHTML = panelsHtml;
    Array.from(div.children).forEach(child => innerContainer.appendChild(child));

    // Reattach tab listeners
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

  } catch (error) {
    console.error('Failed to load menu:', error);
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
