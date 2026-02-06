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
  const zone = el.getAttribute('data-zone');
  el.className = "seat";
  if (zone) el.setAttribute('data-zone', zone);
  el.innerHTML = `<strong>${seat}</strong>`;
}

function applyUpcomingColor(el, mins) {
  // Orange: 15 mins before start time
  // Light green: 5-15 mins before start
  // Green: <=5 mins before start
  if (mins <= 5) el.classList.add("upcoming-5");
  else if (mins <= 15) el.classList.add("upcoming-15");
  else el.classList.add("upcoming-orange"); // Orange when >15 mins before start
}

function applyOngoingColor(el, minsLeft) {
  // Remove all ongoing color classes first
  el.classList.remove("ongoing", "ongoing-15-end", "ongoing-5-end", "ongoing-orange");
  
  if (minsLeft <= 5) {
    el.classList.add("ongoing-5-end"); // Flashing red
  } else if (minsLeft <= 15) {
    el.classList.add("ongoing-15-end"); // Red
  } else {
    el.classList.add("ongoing-orange"); // Orange for >15 mins remaining
  }
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
    let nextUpcomingSession = null;

    sessions.forEach(s => {
      const start = new Date(s.dateTime);
      const end = new Date(start.getTime() + s.minutes * 60000);
      const removeAt = new Date(end.getTime() + 2 * 60000);

      // Check if this session is currently ongoing
      if (now >= start && now <= removeAt && !ongoingSession) {
        ongoingSession = { ...s, start, end };
      } 
      // If no ongoing session, check if this is the next upcoming one
      else if (start > now && !nextUpcomingSession) {
        nextUpcomingSession = { ...s, start, end };
      }
    });

    // ===== ONGOING =====
    if (ongoingSession) {
      const minsLeft = minutesDiff(ongoingSession.end);
      const timeLeftMs = ongoingSession.end - now;

      // Determine ongoing color class:
      // Green: after start time (ongoing session)
      // Red: when 15 mins left to end
      // Flashing red: when 5 mins left to end
      let ongoingColorClass = "";
      if (minsLeft <= 5) {
        ongoingColorClass = "ongoing-5-end"; // Flashing red when <=5 mins remaining
      } else if (minsLeft <= 15) {
        ongoingColorClass = "ongoing-15-end"; // Red when 5-15 mins remaining (15 mins to end)
      } else {
        ongoingColorClass = "ongoing"; // Green when >15 mins remaining (after start time)
      }

      el.innerHTML += `
      <div class="ongoing-content ${ongoingColorClass}">
        <div class="ongoing-header">
          <strong>${ongoingSession.apprentice.firstName}</strong>
          <span class="timer">${formatTimer(timeLeftMs)}</span>
        </div>
        <em class="ongoing-task">${ongoingSession.project?.name || ongoingSession.mission?.title}</em>
      </div>
    `;
    }

    // ===== NEXT UPCOMING (only one) =====
    if (nextUpcomingSession) {
      const mins = minutesDiff(nextUpcomingSession.start);
      const msLeft = nextUpcomingSession.start - now;

      const div = document.createElement("div");
      div.className = "upcoming-item";
      div.innerHTML = `
        ${nextUpcomingSession.apprentice.firstName}
        <span class="timer">(${formatTimer(msLeft)})</span>
      `;

      applyUpcomingColor(div, mins);
      el.appendChild(div);
    }
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

function getZoneForSeat(seatNum, layoutNum) {
  const map = layoutNum === 1 ? stationMapLayout1 : stationMapLayout2;
  for (const [zone, seats] of Object.entries(map)) {
    if (seats.includes(seatNum)) return zone;
  }
  return null;
}

function updateLayout(layoutNum) {
  currentLayout = layoutNum;
  stationMap = layoutNum === 1 ? stationMapLayout1 : stationMapLayout2;
  
  const stationsContainer = document.getElementById('stations');
  stationsContainer.innerHTML = '';
  
  // Physical layout structure matching the image
  // Left side: 2 square blocks (2x2 each)
  // Right side: 3 rectangular blocks (3x2 each)
  
  const leftBlocks = [
    { seats: [13, 14, 12, 11], grid: 'grid-2x2' }, // Top-left block
    { seats: [9, 10, 8, 7], grid: 'grid-2x2' }     // Bottom-left block
  ];
  
  const rightBlocks = [
    { seats: [17, 16, 15, 18, 6, 5], grid: 'grid-3x2' },      // Top-right block
    { seats: [19, 3, 4, 20, 2, 1], grid: 'grid-3x2' },        // Middle-right block
    { seats: [24, 23, 25, 21, 22, 26], grid: 'grid-3x2' }    // Bottom-right block
  ];
  
  // Create left column
  const leftColumn = document.createElement('div');
  leftColumn.className = 'physical-blocks-left';
  
  leftBlocks.forEach(block => {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'physical-block';
    
    const gridDiv = document.createElement('div');
    gridDiv.className = `grid ${block.grid}`;
    
    block.seats.forEach(seatNum => {
      const seatDiv = document.createElement('div');
      seatDiv.className = 'seat';
      seatDiv.setAttribute('data-seat', seatNum);
      const zone = getZoneForSeat(seatNum, layoutNum);
      if (zone) seatDiv.setAttribute('data-zone', zone);
      gridDiv.appendChild(seatDiv);
    });
    
    blockDiv.appendChild(gridDiv);
    leftColumn.appendChild(blockDiv);
  });
  
  // Create right column
  const rightColumn = document.createElement('div');
  rightColumn.className = 'physical-blocks-right';
  
  rightBlocks.forEach(block => {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'physical-block';
    
    const gridDiv = document.createElement('div');
    gridDiv.className = `grid ${block.grid}`;
    
    block.seats.forEach(seatNum => {
      const seatDiv = document.createElement('div');
      seatDiv.className = 'seat';
      seatDiv.setAttribute('data-seat', seatNum);
      const zone = getZoneForSeat(seatNum, layoutNum);
      if (zone) seatDiv.setAttribute('data-zone', zone);
      gridDiv.appendChild(seatDiv);
    });
    
    blockDiv.appendChild(gridDiv);
    rightColumn.appendChild(blockDiv);
  });
  
  stationsContainer.appendChild(leftColumn);
  stationsContainer.appendChild(rightColumn);
  
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

// Initialize layout on page load
updateLayout(1);

refresh();
setInterval(refresh, 60 * 1000); // reload data every 1 min
setInterval(render, 1000);        // update timers every second
setInterval(updateCurrentTime, 1000); // update current time every second
updateCurrentTime(); // initial call

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
  const end = new Date(start.getTime() + s.minutes * 60000);
  const diffMin = Math.round((now - start) / 60000);
  const zone = getStationBySeat(s.workStation);

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

  // Calculate time remaining or time until start
  let timeInfo = "";
  let timeInfoColor = "#4caf50";
  if (status === "Ongoing") {
    const minsLeft = Math.floor((end - now) / 60000);
    timeInfo = `${minsLeft} min remaining`;
    if (minsLeft <= 5) timeInfoColor = "#f44336";
    else if (minsLeft <= 15) timeInfoColor = "#ff9800";
  } else if (status === "Upcoming") {
    const minsUntil = Math.floor((start - now) / 60000);
    timeInfo = `Starts in ${minsUntil} min`;
    if (minsUntil <= 5) timeInfoColor = "#4caf50";
    else if (minsUntil <= 15) timeInfoColor = "#2196f3";
  }

  // Determine what to show for time
  let timeDisplay = "";
  let timeDisplayColor = "#4caf50";
  if (status === "Ongoing") {
    const minsLeft = Math.floor((end - now) / 60000);
    timeDisplay = `${minsLeft} min remaining`;
    if (minsLeft <= 5) timeDisplayColor = "#f44336";
    else if (minsLeft <= 15) timeDisplayColor = "#ff9800";
  } else if (status === "Upcoming") {
    const minsUntil = Math.floor((start - now) / 60000);
    timeDisplay = `Starts in ${minsUntil} min`;
    if (minsUntil <= 5) timeDisplayColor = "#4caf50";
    else if (minsUntil <= 15) timeDisplayColor = "#2196f3";
  } else {
    // For finished sessions, show timing
    timeDisplay = timing;
    timeDisplayColor = timingColor;
  }
  
  box.innerHTML = `
    <div class="search-header">
      <div class="search-name">${s.apprentice.firstName} ${s.apprentice.lastName}</div>
    </div>
    
    <div class="search-info-simple">
      <div class="info-row">
        <span class="info-label">Station:</span>
        <span class="info-value">${s.workStation}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Time:</span>
        <span class="info-value" style="color: ${timeDisplayColor}; font-weight: 600;">${timeDisplay}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Available:</span>
        <span class="info-value" style="color: ${occupied ? '#f44336' : '#4caf50'}; font-weight: 600;">
          ${occupied ? "NO" : "YES"}
        </span>
      </div>
    </div>
  `;

  box.style.display = "block";
  box.classList.add("show");
}

function toggleSearchBox() {
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
}

// Toggle search box visibility
document.getElementById("searchToggle").addEventListener("click", toggleSearchBox);

// Keyboard shortcuts to open search (Ctrl+F, Cmd+F, or Tab)
document.addEventListener("keydown", (e) => {
  // Ctrl+F or Cmd+F
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault(); // Prevent browser's default find dialog
    toggleSearchBox();
  }
  // Tab key (only if search box is not already visible and input is not focused)
  else if (e.key === "Tab" && !e.shiftKey) {
    const searchBox = document.getElementById("searchBox");
    const searchInput = document.getElementById("searchInput");
    const isVisible = searchBox.classList.contains("search-box-visible");
    
    // Only activate if search box is hidden and input is not focused
    if (!isVisible && document.activeElement !== searchInput) {
      e.preventDefault();
      toggleSearchBox();
    }
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
