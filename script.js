/* global L, toGeoJSON */

const DEFAULT_ROUTE = [
  { name: 'Chakdaha', lat: 23.07655846201645, lng: 88.52904932733068 },
  { name: 'Sealdah Station', lat: 22.5676943, lng: 88.3711642 },
  { name: 'NJP Station', lat: 26.685063, lng: 88.4439466 },
  { name: 'Darjeeling Station', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Darjeeling Mall Road', lat: 27.0448562, lng: 88.2677211 },
  { name: 'Hotel', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Tiger Hill', lat: 26.9966667, lng: 88.2944444 },
  { name: 'Japanese Buddhist Temple', lat: 27.0283932, lng: 88.2595268 },
  { name: 'Hotel', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Rock Garden', lat: 27.0265708, lng: 88.232376 },
  { name: 'Orange Valley Tea Outlet', lat: 27.0288389, lng: 88.2410744 },
  { name: 'Batasia Loop', lat: 27.016892, lng: 88.2465488 },
  { name: 'Ghoom Monastery', lat: 27.0116652, lng: 88.2503642 },
  { name: 'Zoo', lat: 27.0585457, lng: 88.2531361 },
  { name: 'Hotel', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Darjeeling Mall Road', lat: 27.0448562, lng: 88.2677211 },
  { name: 'Hotel', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Lepchajagat Pine Forest', lat: 27.0128071, lng: 88.1971898 },
  { name: 'Mirik Lake', lat: 26.8908123, lng: 88.1824885 },
  { name: 'Nepal Border', lat: 26.9486186, lng: 88.1208501 },
  { name: 'Darjeeling Station', lat: 27.0377502, lng: 88.2631107 },
  { name: 'Darjeeling Mall Road', lat: 27.0448562, lng: 88.2677211 },
  { name: 'Hotel', lat: 27.0377502, lng: 88.2631107 },
  { name: 'NJP Station', lat: 26.684225, lng: 88.4428012 },
  { name: 'Sealdah Station', lat: 22.5671707, lng: 88.3707202 },
  { name: 'Chakdaha', lat: 23.0765247, lng: 88.5293319 }
];

const PARTICIPANTS = [
  { name: 'Alex', color: '#63d6ff' },
  { name: 'Ben', color: '#7cf7c8' },
  { name: 'Charlie', color: '#ffd166' },
  { name: 'David', color: '#ff7c88' }
];

const STORAGE_KEY = 'trip-tracker-suggestions-v1';

const appState = {
  route: [],
  completedStopIds: new Set(),
  selectedStopId: null,
  participants: [],
  suggestions: [],
  map: null,
  routeLayer: null,
  stopMarkers: new Map(),
  participantMarkers: [],
  baseTileLayer: null
};

const elements = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  kmlInput: document.getElementById('kmlInput'),
  resetRouteButton: document.getElementById('resetRouteButton'),
  suggestChangeButton: document.getElementById('suggestChangeButton'),
  prevStopBtn: document.getElementById('prevStopBtn'),
  nextStopBtn: document.getElementById('nextStopBtn'),
  mapPrevStopBtn: document.getElementById('mapPrevStopBtn'),
  mapNextStopBtn: document.getElementById('mapNextStopBtn'),
  mapStopCountLabel: document.getElementById('mapStopCountLabel'),
  mobileSidebarToggle: document.getElementById('mobileSidebarToggle'),
  stopList: document.getElementById('stopList'),
  participantList: document.getElementById('participantList'),
  adminSuggestions: document.getElementById('adminSuggestions'),
  suggestionList: document.getElementById('suggestionList'),
  suggestionCountLabel: document.getElementById('suggestionCountLabel'),
  stopCountLabel: document.getElementById('stopCountLabel'),
  totalStopsValue: document.getElementById('totalStopsValue'),
  routeDistanceValue: document.getElementById('routeDistanceValue'),
  completionValue: document.getElementById('completionValue'),
  completionMeta: document.getElementById('completionMeta'),
  remainingStopsValue: document.getElementById('remainingStopsValue'),
  remainingStopsCountValue: document.getElementById('remainingStopsCountValue'),
  completedStopsValue: document.getElementById('completedStopsValue'),
  progressBarFill: document.getElementById('progressBarFill'),
  nextStopNumber: document.getElementById('nextStopNumber'),
  nextStopName: document.getElementById('nextStopName'),
  nextStopETA: document.getElementById('nextStopETA'),
  nextStopDistance: document.getElementById('nextStopDistance'),
  suggestionModal: document.getElementById('suggestionModal'),
  closeModalButton: document.getElementById('closeModalButton'),
  cancelSuggestionButton: document.getElementById('cancelSuggestionButton'),
  suggestionForm: document.getElementById('suggestionForm')
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function formatKm(distance) {
  return `${distance.toFixed(distance >= 100 ? 0 : 1)} km`;
}

function normalizeStopName(name, index) {
  const trimmedName = (name || '').trim();
  return trimmedName || `Stop ${index + 1}`;
}

function buildRouteFromRaw(rawStops) {
  const route = [];

  rawStops.forEach((stop, index) => {
    route.push({
      id: `stop-${route.length + 1}`,
      name: normalizeStopName(stop.name, route.length),
      lat: stop.lat,
      lng: stop.lng,
      rawIndex: index + 1,
      completed: false
    });
  });

  return route;
}

function computeTotalDistance(route) {
  return route.reduce((total, stop, index) => {
    const nextStop = route[index + 1];
    if (!nextStop) {
      return total;
    }
    return total + haversineDistance(stop.lat, stop.lng, nextStop.lat, nextStop.lng);
  }, 0);
}

function getStopById(stopId) {
  return appState.route.find((stop) => stop.id === stopId);
}

function getCompletedCount() {
  return appState.route.filter((stop) => stop.completed).length;
}

function getFirstIncompleteIndex() {
  return appState.route.findIndex((stop) => !stop.completed);
}

function getNextStopIndex() {
  const index = getFirstIncompleteIndex();
  return index === -1 ? appState.route.length - 1 : index;
}

function getLastCompletedIndex() {
  let lastIndex = -1;
  appState.route.forEach((stop, index) => {
    if (stop.completed) {
      lastIndex = index;
    }
  });
  return lastIndex;
}

function updateSidebarStopSelection(stopId) {
  appState.selectedStopId = stopId;
  document.querySelectorAll('.stop-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.stopId === stopId);
  });
}

function createRoutePopup(stop, index) {
  const completed = stop.completed ? '<div class="completed-badge">✓ Completed</div>' : '';
  return `
    <div class="route-popup">
      <strong>${index + 1}. ${stop.name}</strong>
      <p>Latitude: ${stop.lat.toFixed(6)}</p>
      <p>Longitude: ${stop.lng.toFixed(6)}</p>
      <p>Stop number: ${index + 1}</p>
      ${completed}
    </div>
  `;
}

function createStopIcon(index, completed) {
  const color = completed ? '#3cc86a' : '#f2b949';
  const text = completed ? '✓' : index + 1;
  return L.divIcon({
    className: 'route-stop-icon',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.95);
        box-shadow: 0 10px 20px rgba(0,0,0,0.24);
        background: linear-gradient(135deg, ${color}, ${completed ? '#1d9d4f' : '#ffd974'});
        color: ${completed ? '#ffffff' : '#08111c'};
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 0.95rem;
      ">${text}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18]
  });
}

function createParticipantIcon(participant) {
  return L.divIcon({
    className: 'participant-icon',
    html: `
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.95);
        box-shadow: 0 10px 24px rgba(0,0,0,0.26);
        background: linear-gradient(135deg, ${participant.color}, #ffffff22);
        color: #ffffff;
        display: grid;
        place-items: center;
        font-weight: 800;
      ">${participant.name.slice(0, 1)}</div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18]
  });
}

function renderStopList() {
  elements.stopList.innerHTML = '';

  appState.route.forEach((stop, index) => {
    const stopItem = document.createElement('article');
    stopItem.className = `stop-item${stop.completed ? ' is-completed' : ''}${appState.selectedStopId === stop.id ? ' is-active' : ''}`;
    stopItem.dataset.stopId = stop.id;
    stopItem.innerHTML = `
      <div class="stop-item__main" tabindex="0" data-focus-stop="${stop.id}" role="button">
        <div class="stop-item__index">${stop.completed ? '✓' : index + 1}</div>
        <div class="stop-item__body">
          <p class="stop-item__title">
            <span class="stop-index-label">${index + 1}.</span> 
            <span class="stop-name-editable" data-edit-stop="${stop.id}" spellcheck="false">${stop.name}</span>
          </p>
          <p class="stop-item__meta">${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</p>
        </div>
      </div>
      <div class="stop-item__actions">
        <button type="button" class="stop-toggle ${stop.completed ? 'is-complete' : ''}" data-toggle-stop="${stop.id}">${stop.completed ? 'Undo' : 'Complete'}</button>
        <div class="stop-menu-container">
          <button type="button" class="stop-menu-btn" data-menu-toggle="${stop.id}" aria-label="More options">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <div class="stop-menu-dropdown is-hidden" id="menu-${stop.id}">
            <button type="button" class="stop-menu-item" data-edit-trigger="${stop.id}">Edit</button>
          </div>
        </div>
      </div>
    `;

    const mainBtn = stopItem.querySelector('[data-focus-stop]');
    mainBtn.addEventListener('click', () => focusStop(stop.id));
    mainBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focusStop(stop.id);
      }
    });

    const editableSpan = stopItem.querySelector('[data-edit-stop]');
    editableSpan.addEventListener('click', (e) => {
      if (editableSpan.getAttribute('contenteditable') === 'true') {
        e.stopPropagation();
      }
    });
    editableSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        editableSpan.blur();
      }
    });
    editableSpan.addEventListener('blur', (e) => {
      editableSpan.removeAttribute('contenteditable');
      const newName = e.target.textContent.trim();
      if (newName && newName !== stop.name) {
        stop.name = newName;
        updateMarkers();
        updateNextStopCard();
      } else {
        e.target.textContent = stop.name;
      }
    });

    const menuBtn = stopItem.querySelector(`[data-menu-toggle="${stop.id}"]`);
    const menuDropdown = stopItem.querySelector(`#menu-${stop.id}`);
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.stop-menu-dropdown').forEach(d => {
        if (d !== menuDropdown) d.classList.add('is-hidden');
      });
      menuDropdown.classList.toggle('is-hidden');
    });

    const editTrigger = stopItem.querySelector(`[data-edit-trigger="${stop.id}"]`);
    editTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.add('is-hidden');
      editableSpan.setAttribute('contenteditable', 'true');
      editableSpan.focus();

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableSpan);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    stopItem.querySelector('[data-toggle-stop]').addEventListener('click', () => toggleStopCompleted(stop.id));
    elements.stopList.appendChild(stopItem);
  });

  elements.stopCountLabel.textContent = `${appState.route.length} stops`;
}

function renderParticipantPanel() {
  elements.participantList.innerHTML = '';

  appState.participants.forEach((participant, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'participant-chip';
    chip.dataset.participantId = participant.id;
    chip.innerHTML = `
      <div class="participant-chip__avatar" style="background: linear-gradient(135deg, ${participant.color}, rgba(255,255,255,0.18));">${participant.name.slice(0, 1)}</div>
      <div class="participant-chip__body">
        <p class="participant-chip__name">${participant.name}</p>
        <p class="participant-chip__meta">Marker ${index + 1} - draggable on map</p>
      </div>
    `;
    chip.addEventListener('click', () => {
      const marker = appState.participantMarkers.find((entry) => entry.participant.id === participant.id);
      if (marker && marker.marker) {
        marker.marker.openPopup();
        appState.map.flyTo(marker.marker.getLatLng(), 18, {
          duration: 1.5
        });
      }
    });
    elements.participantList.appendChild(chip);
  });
}

function renderSuggestionPanels() {
  const suggestions = appState.suggestions;
  const rendered = suggestions.slice().reverse();

  elements.suggestionList.innerHTML = '';
  elements.adminSuggestions.innerHTML = '';

  if (!rendered.length) {
    const emptyState = '<div class="admin-empty">No suggestions stored yet.</div>';
    elements.suggestionList.innerHTML = emptyState;
    elements.adminSuggestions.innerHTML = emptyState;
  } else {
    rendered.forEach((suggestion) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="admin-item__badge">${suggestion.name.slice(0, 1).toUpperCase()}</div>
        <div class="suggestion-item__body">
          <p class="admin-item__title">${suggestion.name}</p>
          <p class="suggestion-item__meta">${suggestion.change}</p>
          <p class="suggestion-item__meta">${suggestion.reason}</p>
        </div>
      `;
      elements.suggestionList.appendChild(item);
    });

    rendered.forEach((suggestion) => {
      const item = document.createElement('div');
      item.className = 'admin-item';
      item.innerHTML = `
        <div class="admin-item__badge">${suggestion.name.slice(0, 1).toUpperCase()}</div>
        <div class="admin-item__body">
          <p class="admin-item__title">${suggestion.name}</p>
          <p class="admin-item__meta">${suggestion.change}</p>
          <p class="admin-item__meta">${suggestion.reason}</p>
        </div>
      `;
      elements.adminSuggestions.appendChild(item);
    });
  }

  elements.suggestionCountLabel.textContent = `${suggestions.length} saved`;
}

function updateStats() {
  const completedCount = getCompletedCount();
  const remainingCount = appState.route.length - completedCount;
  const completionPercent = appState.route.length ? Math.round((completedCount / appState.route.length) * 100) : 0;
  const totalDistance = computeTotalDistance(appState.route);

  elements.totalStopsValue.textContent = appState.route.length.toString();
  elements.routeDistanceValue.textContent = formatKm(totalDistance);
  elements.completionValue.textContent = `${completionPercent}%`;
  elements.completionMeta.textContent = `${completedCount} completed`;
  elements.completedStopsValue.textContent = completedCount.toString();
  elements.remainingStopsCountValue.textContent = remainingCount.toString();
  elements.remainingStopsValue.textContent = `${remainingCount} remaining`;
  elements.progressBarFill.style.width = `${completionPercent}%`;
}

function updateMarkers() {
  appState.stopMarkers.forEach((markerEntry, stopId) => {
    const stop = getStopById(stopId);
    if (!stop) {
      return;
    }
    markerEntry.marker.setIcon(createStopIcon(markerEntry.index - 1, stop.completed));
    markerEntry.marker.setPopupContent(createRoutePopup(stop, markerEntry.index));
  });
}

function updateMapNav() {
  if (!elements.mapStopCountLabel) return;
  const total = appState.route.length;
  let current = appState.route.findIndex(stop => stop.id === appState.selectedStopId) + 1;
  if (current === 0 && total > 0) current = 1;
  elements.mapStopCountLabel.textContent = `Stop ${current} of ${total}`;
}

function updateNextStopCard() {
  const nextIndex = getNextStopIndex();
  const nextStop = nextIndex === -1 ? null : appState.route[nextIndex];
  const lastCompletedIndex = getLastCompletedIndex();
  const originIndex = lastCompletedIndex >= 0 ? lastCompletedIndex : 0;
  const originStop = appState.route[originIndex];

  if (!nextStop) {
    elements.nextStopNumber.textContent = 'Done';
    elements.nextStopName.textContent = 'Trip complete';
    elements.nextStopDistance.textContent = '0 km';
    elements.nextStopETA.textContent = 'Completed';
    return;
  }

  const distance = originStop && originStop !== nextStop
    ? haversineDistance(originStop.lat, originStop.lng, nextStop.lat, nextStop.lng)
    : 0;

  elements.nextStopNumber.textContent = `Stop ${nextIndex + 1}`;
  elements.nextStopName.textContent = nextStop.name;
  elements.nextStopDistance.textContent = formatKm(distance);
  elements.nextStopETA.textContent = nextStop.completed ? 'Completed' : 'Upcoming';
}

function fitMapToRoute() {
  if (!appState.map || !appState.route.length) {
    return;
  }

  const bounds = L.latLngBounds(appState.route.map((stop) => [stop.lat, stop.lng]));
  appState.map.fitBounds(bounds.pad(0.16), { animate: true, duration: 0.8 });
}

function clearMapLayers() {
  if (appState.routeLayer) {
    appState.map.removeLayer(appState.routeLayer);
    appState.routeLayer = null;
  }

  appState.stopMarkers.forEach(({ marker }) => appState.map.removeLayer(marker));
  appState.stopMarkers.clear();

  appState.participantMarkers.forEach(({ marker }) => appState.map.removeLayer(marker));
  appState.participantMarkers = [];
}

function renderMapLayers() {
  clearMapLayers();

  if (!appState.route.length) {
    return;
  }

  const routePoints = appState.route.map((stop) => [stop.lat, stop.lng]);
  appState.routeLayer = L.polyline(routePoints, {
    color: '#63d6ff',
    weight: 5,
    opacity: 0.95,
    lineCap: 'round'
  }).addTo(appState.map);

  appState.route.forEach((stop, index) => {
    const marker = L.marker([stop.lat, stop.lng], {
      draggable: false,
      icon: createStopIcon(index, stop.completed)
    }).addTo(appState.map);

    marker.bindPopup(createRoutePopup(stop, index), { closeButton: false, offset: [0, -10], autoPan: false });
    marker.on('click', () => focusStop(stop.id));
    marker.on('popupopen', () => updateSidebarStopSelection(stop.id));
    appState.stopMarkers.set(stop.id, { marker, index: index + 1 });
  });

  const start = appState.route[0];
  PARTICIPANTS.forEach((participant, index) => {
    const offsetLat = start.lat + (index * 0.012 - 0.018);
    const offsetLng = start.lng + (index * 0.012 - 0.018);
    const participantEntry = {
      id: `participant-${participant.name.toLowerCase()}`,
      name: participant.name,
      color: participant.color,
      lat: offsetLat,
      lng: offsetLng
    };
    appState.participants.push(participantEntry);

    // As per requirement, A B C D participant markers should not be visible on the map.
    appState.participantMarkers.push({ participant: participantEntry, marker: null });
  });

  fitMapToRoute();
}

function renderAll() {
  renderStopList();
  renderParticipantPanel();
  renderSuggestionPanels();
  updateStats();
  updateMarkers();
  updateNextStopCard();
  updateMapNav();
}

function setRoute(rawStops, options = {}) {
  appState.route = buildRouteFromRaw(rawStops);
  appState.completedStopIds = new Set(options.completedStopIds || []);
  appState.route.forEach((stop) => {
    stop.completed = appState.completedStopIds.has(stop.id);
  });
  appState.selectedStopId = appState.route[0] ? appState.route[0].id : null;
  appState.participants = [];
  clearMapLayers();
  renderMapLayers();
  renderAll();
}

function navigateStops(direction) {
  if (!appState.route.length) return;

  let currentIndex = appState.route.findIndex(stop => stop.id === appState.selectedStopId);
  if (currentIndex === -1) currentIndex = 0;

  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = appState.route.length - 1;
  if (nextIndex >= appState.route.length) nextIndex = 0;

  const nextStop = appState.route[nextIndex];
  focusStop(nextStop.id);

  const activeItem = elements.stopList.querySelector(`[data-stop-id="${nextStop.id}"]`);
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function focusStop(stopId) {
  const stop = getStopById(stopId);
  if (!stop) {
    return;
  }

  updateSidebarStopSelection(stopId);
  updateMapNav();
  const markerEntry = appState.stopMarkers.get(stopId);
  if (markerEntry) {
    markerEntry.marker.openPopup();
    appState.map.flyTo([stop.lat, stop.lng], 18, {
      duration: 1.5
    });
  }
}

function toggleStopCompleted(stopId) {
  const stop = getStopById(stopId);
  if (!stop) {
    return;
  }

  stop.completed = !stop.completed;
  if (stop.completed) {
    appState.completedStopIds.add(stop.id);
  } else {
    appState.completedStopIds.delete(stop.id);
  }

  renderAll();
}

function openSuggestionModal() {
  elements.suggestionModal.classList.add('is-open');
  elements.suggestionModal.setAttribute('aria-hidden', 'false');
  elements.suggestionForm.reset();
  elements.suggestionModal.querySelector('input[name="name"]').focus();
}

function closeSuggestionModal() {
  elements.suggestionModal.classList.remove('is-open');
  elements.suggestionModal.setAttribute('aria-hidden', 'true');
}

function loadSuggestions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    appState.suggestions = Array.isArray(parsed) ? parsed : [];
  } catch {
    appState.suggestions = [];
  }
}

function saveSuggestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.suggestions));
}

function extractStopsFromKmlText(kmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'application/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('Invalid KML file.');
  }

  const placemarks = [...xmlDoc.querySelectorAll('Placemark')];
  const rawStops = [];

  placemarks.forEach((placemark) => {
    const name = placemark.querySelector('name')?.textContent?.trim() || '';
    const point = placemark.querySelector('Point coordinates');
    const line = placemark.querySelector('LineString coordinates');

    if (point?.textContent) {
      const [lng, lat] = point.textContent.trim().split(',').map((value) => Number(value.trim()));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        rawStops.push({ name, lat, lng });
      }
      return;
    }

    if (line?.textContent) {
      const coordinates = line.textContent.trim().split(/\s+/);
      coordinates.forEach((pair) => {
        const [lng, lat] = pair.split(',').map((value) => Number(value.trim()));
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          rawStops.push({ name, lat, lng });
        }
      });
    }
  });

  if (!rawStops.length && window.toGeoJSON) {
    const geojson = toGeoJSON.kml(xmlDoc);
    geojson.features.forEach((feature) => {
      if (!feature.geometry) {
        return;
      }
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        rawStops.push({ name: feature.properties?.name || '', lat, lng });
      }
      if (feature.geometry.type === 'LineString') {
        feature.geometry.coordinates.forEach(([lng, lat]) => {
          rawStops.push({ name: feature.properties?.name || '', lat, lng });
        });
      }
    });
  }

  return rawStops;
}

function loadDefaultRoute() {
  setRoute(DEFAULT_ROUTE);
}

function handleKmlUpload(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rawStops = extractStopsFromKmlText(String(reader.result || ''));
      if (!rawStops.length) {
        alert('No route points were found in the uploaded KML file.');
        return;
      }
      setRoute(rawStops);
    } catch (error) {
      alert(error.message || 'Unable to read the KML file.');
    }
  };
  reader.readAsText(file);
}

function registerEvents() {
  elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('is-open');
  });

  if (elements.mobileSidebarToggle) {
    elements.mobileSidebarToggle.addEventListener('click', () => {
      elements.sidebar.classList.toggle('is-open');
    });
  }

  elements.resetRouteButton.addEventListener('click', () => {
    loadDefaultRoute();
  });

  elements.suggestChangeButton.addEventListener('click', openSuggestionModal);
  if (elements.prevStopBtn) elements.prevStopBtn.addEventListener('click', () => navigateStops(-1));
  if (elements.nextStopBtn) elements.nextStopBtn.addEventListener('click', () => navigateStops(1));
  if (elements.mapPrevStopBtn) elements.mapPrevStopBtn.addEventListener('click', () => navigateStops(-1));
  if (elements.mapNextStopBtn) elements.mapNextStopBtn.addEventListener('click', () => navigateStops(1));
  elements.closeModalButton.addEventListener('click', closeSuggestionModal);
  elements.cancelSuggestionButton.addEventListener('click', closeSuggestionModal);
  elements.suggestionModal.addEventListener('click', (event) => {
    if (event.target === elements.suggestionModal) {
      closeSuggestionModal();
    }
  });

  elements.suggestionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.suggestionForm);
    const suggestion = {
      name: String(formData.get('name') || '').trim(),
      change: String(formData.get('change') || '').trim(),
      reason: String(formData.get('reason') || '').trim(),
      createdAt: new Date().toISOString()
    };

    if (!suggestion.name || !suggestion.change || !suggestion.reason) {
      return;
    }

    appState.suggestions.push(suggestion);
    saveSuggestions();
    renderSuggestionPanels();
    closeSuggestionModal();
  });

  elements.kmlInput.addEventListener('change', () => {
    const file = elements.kmlInput.files?.[0];
    if (file) {
      handleKmlUpload(file);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSuggestionModal();
    }
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.stop-menu-dropdown').forEach(d => d.classList.add('is-hidden'));
  });
}

function initializeMap() {
  appState.map = L.map('map', {
    zoomControl: true,
    preferCanvas: true,
    tap: true,
    scrollWheelZoom: true
  });

  appState.baseTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(appState.map);

  appState.map.setView([23.5, 88.5], 7);
  setTimeout(() => appState.map.invalidateSize(), 100);
}

function startApp() {
  loadSuggestions();
  initializeMap();
  registerEvents();
  loadDefaultRoute();
  renderSuggestionPanels();
}

document.addEventListener('DOMContentLoaded', startApp);
