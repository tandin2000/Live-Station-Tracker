let cachedSessions = [];
 
async function loadSessions() {
  const res = await fetch("data.json");
  const json = await res.json();
  cachedSessions = json.data.sessions;
}

function minutesDiff(target) {
  return Math.floor((target - new Date()) / 60000);
}

function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function resetSeat(el, seat) {
  el.className = "seat";
  el.innerHTML = `<strong>${seat}</strong>`;
}

function applyUpcomingColor(el, mins) {
  if (mins <= 5) el.classList.add("upcoming-5");
  else if (mins <= 15) el.classList.add("upcoming-15");
}

function applyOngoingColor(el, minsLeft) {
  if (minsLeft <= 5) el.classList.add("ongoing-5-end");
  else if (minsLeft <= 15) el.classList.add("ongoing-15-end");
  else el.classList.add("ongoing");
}

function render() {
  const now = new Date();

  document.querySelectorAll(".seat").forEach(el => {
    const seat = Number(el.dataset.seat);
    resetSeat(el, seat);

    const sessions = cachedSessions
      .filter(s => s.workStation === seat)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    let ongoingSession = null;
    let upcomingSessions = [];

    sessions.forEach(s => {
      const start = new Date(s.dateTime);
      const end = new Date(start.getTime() + s.minutes * 60000);
      const removeAt = new Date(end.getTime() + 2 * 60000);

      if (now >= start && now <= removeAt && !ongoingSession) {
        ongoingSession = { ...s, start, end };
      } else if (start > now) {
        upcomingSessions.push({ ...s, start });
      }
    });

    // ===== ONGOING =====
    if (ongoingSession) {
      const minsLeft = minutesDiff(ongoingSession.end);
      const timeLeftMs = ongoingSession.end - now;

      el.innerHTML += `
      <div>
        <strong>${ongoingSession.apprentice.firstName}</strong><br>
        <em>${ongoingSession.mission?.title || ongoingSession.project?.name}</em><br>
        <span class="timer">${formatTimer(timeLeftMs)}</span>
      </div>
    `;


      applyOngoingColor(el, minsLeft);
    }

    // ===== UPCOMING LIST =====
    upcomingSessions.forEach(s => {
      const mins = minutesDiff(s.start);
      const msLeft = s.start - now;

      const div = document.createElement("div");
      div.className = "upcoming-item";
      div.innerHTML = `
        ${s.apprentice.firstName}
        <span class="timer">(${formatTimer(msLeft)})</span>
      `;

      applyUpcomingColor(div, mins);
      el.appendChild(div);
    });
  });
}

/* ===== INIT ===== */
async function refresh() {
  await loadSessions();
  render();
}

// Update current time
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = timeString;
  }
}

function updateLayout(layoutNum) {
  currentLayout = layoutNum;
  stationMap = layoutNum === 1 ? stationMapLayout1 : stationMapLayout2;
  
  const stationsContainer = document.getElementById('stations');
  stationsContainer.innerHTML = '';
  
  const layout = layoutNum === 1 ? {
    1: { seats: [1,2,3,4,19,20], grid: 'grid-3x2' },
    2: { seats: [5,6,15,16,17,18], grid: 'grid-3x2' },
    3: { seats: [9,10,11,12,13,14], grid: 'grid-3x2' },
    4: { seats: [7,8,21,22,23,24,25,26], grid: 'grid-4x2' }
  } : {
    1: { seats: [1,2,3,4,19,20], grid: 'grid-3x2' },
    2: { seats: [5,6,15,16,17,18], grid: 'grid-3x2' },
    3: { seats: [7,8,9,10,11,12,13,14], grid: 'grid-4x2' },
    4: { seats: [21,22,23,24,25,26], grid: 'grid-3x2' }
  };
  
  Object.keys(layout).forEach(zoneNum => {
    const zone = layout[zoneNum];
    const stationDiv = document.createElement('div');
    stationDiv.className = 'station';
    stationDiv.innerHTML = `<h2>Zone ${zoneNum}</h2>`;
    
    const gridDiv = document.createElement('div');
    gridDiv.className = `grid ${zone.grid}`;
    
    zone.seats.forEach(seatNum => {
      const seatDiv = document.createElement('div');
      seatDiv.className = 'seat';
      seatDiv.setAttribute('data-seat', seatNum);
      gridDiv.appendChild(seatDiv);
    });
    
    stationDiv.appendChild(gridDiv);
    stationsContainer.appendChild(stationDiv);
  });
  
  render();
}

// Layout toggle buttons
document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const layoutNum = parseInt(btn.dataset.layout);
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateLayout(layoutNum);
  });
});

refresh();
setInterval(refresh, 60 * 1000); // reload data every 1 min
setInterval(render, 1000);        // update timers every second
setInterval(updateCurrentTime, 1000); // update current time every second
updateCurrentTime(); // initial call


const stationMapLayout1 = {
  1: [1,2,3,4,19,20],
  2: [5,6,15,16,17,18],
  3: [9,10,11,12,13,14],
  4: [7,8,21,22,23,24,25,26]
};

const stationMapLayout2 = {
  1: [1,2,3,4,19,20],
  2: [5,6,15,16,17,18],
  3: [7,8,9,10,11,12,13,14],
  4: [21,22,23,24,25,26]
};

let currentLayout = 1;
let stationMap = stationMapLayout1;

function getStationBySeat(seat) {
  for (const [station, seats] of Object.entries(stationMap)) {
    if (seats.includes(seat)) return station;
  }
  return "Unknown";
}

function sessionStatus(session, now) {
  const start = new Date(session.dateTime);
  const end = new Date(start.getTime() + session.minutes * 60000);

  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Finished";
}

function seatOccupied(seat, excludeSession, now) {
  return cachedSessions.some(s => {
    if (s === excludeSession) return false;
    if (s.workStation !== seat) return false;
    const start = new Date(s.dateTime);
    const end = new Date(start.getTime() + s.minutes * 60000);
    return now >= start && now <= end;
  });
}

function performSearch() {
  const input = document.getElementById("searchInput");
  const q = input.value.trim().toLowerCase();
  const box = document.getElementById("searchResult");

  if (!q) {
    box.classList.remove("show");
    box.style.display = "none";
    return;
  }

  const now = new Date();

  const matches = cachedSessions.filter(s =>
    `${s.apprentice.firstName} ${s.apprentice.lastName}`
      .toLowerCase()
      .includes(q)
  );

  if (matches.length === 0) {
    box.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary);">
        <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
        <div>No session found</div>
      </div>
    `;
    box.style.display = "block";
    box.classList.add("show");
    return;
  }

  const s = matches[0];
  const start = new Date(s.dateTime);
  const diffMin = Math.round((now - start) / 60000);

  let timing;
  let timingColor = "#4caf50";
  if (diffMin < 0) {
    timing = `Early by ${Math.abs(diffMin)} min`;
    timingColor = "#2196f3";
  } else if (diffMin > 0) {
    timing = `Late by ${diffMin} min`;
    timingColor = "#ff9800";
  } else {
    timing = "On time";
  }

  const occupied = seatOccupied(s.workStation, s, now);
  const status = sessionStatus(s, now);
  let statusColor = "#4caf50";
  if (status === "Upcoming") statusColor = "#2196f3";
  else if (status === "Finished") statusColor = "#757575";

  box.innerHTML = `
    <strong>${s.apprentice.firstName} ${s.apprentice.lastName}</strong>
    <div class="result-item">
      <span class="result-label">Station:</span>
      <span class="result-value">${s.workStation}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Starts at:</span>
      <span class="result-value">${start.toLocaleTimeString()}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Status:</span>
      <span class="result-value" style="color: ${statusColor};">${status}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Timing:</span>
      <span class="result-value" style="color: ${timingColor};">${timing}</span>
    </div>
    <div class="result-item">
      <span class="result-label">Seat occupied:</span>
      <span class="result-value" style="color: ${occupied ? '#f44336' : '#4caf50'};">${occupied ? "YES ⚠️" : "NO ✓"}</span>
    </div>
  `;

  box.style.display = "block";
  box.classList.add("show");
}

// Toggle search box visibility
document.getElementById("searchToggle").addEventListener("click", () => {
  const searchBox = document.getElementById("searchBox");
  const isVisible = searchBox.classList.contains("search-box-visible");
  
  if (isVisible) {
    searchBox.classList.remove("search-box-visible");
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResult").style.display = "none";
  } else {
    searchBox.classList.add("search-box-visible");
    setTimeout(() => {
      document.getElementById("searchInput").focus();
    }, 100);
  }
});

// Search on input
document.getElementById("searchInput").addEventListener("input", performSearch);

// Search on button click
document.getElementById("searchButton").addEventListener("click", performSearch);

// Search on Enter key
document.getElementById("searchInput").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    performSearch();
  }
});
