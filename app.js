// Pulsar Audio Web Profile Engine
const REPO = "darkangle4022211-cpu/pulser-audio";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
const REVIEWS_API = `https://api.github.com/repos/${REPO}/issues?labels=review&state=all&per_page=20`;

const CACHE_KEY = "pulsar_releases_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

// Workspace Captions
const WORKSPACE_DATA = [
  {
    title: "All Tracks Library",
    file: "./assets/all-tracks.jpg",
    caption: "Offline Library console: 98 local tracks, instant metadata search, custom tags, and duration sorting."
  },
  {
    title: "Navigation Drawer",
    file: "./assets/navigation-drawer.jpg",
    caption: "Collapsible drawer with custom multi-language playlists, library folder watcher, and automated JSON backups."
  },
  {
    title: "Discover & Flow",
    file: "./assets/discover-flow.jpg",
    caption: "Local mood classification pills (Chill, Lofi, Workout, Focus), Listen Again history, and offline queueing."
  },
  {
    title: "Now Playing Studio",
    file: "./assets/now-playing.jpg",
    caption: "Immersive full-screen player with dynamic album backdrop blur, Up Next queue, and synchronized lyrics."
  },
  {
    title: "Daylight Mode",
    file: "./assets/light-mode.jpg",
    caption: "Pearlescent high-contrast light theme engineered for daytime clarity with zero application reload."
  }
];

// Helper: Format Bytes to MB
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Helper: Format Date
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Helper: Escape HTML
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Classify Asset Type
function classifyAsset(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".appimage")) return { platform: "linux", type: "AppImage", label: "Linux AppImage", priority: 1 };
  if (lower.endsWith(".snap")) return { platform: "linux", type: "Snap", label: "Linux Snap", priority: 2 };
  if (lower.endsWith(".deb")) return { platform: "linux", type: "deb", label: "Debian / Ubuntu (.deb)", priority: 3 };
  if (lower.endsWith(".exe") && !lower.includes("blockmap")) {
    if (lower.includes("portable")) return { platform: "windows", type: "Portable", label: "Windows Portable (.exe)", priority: 4 };
    return { platform: "windows", type: "Setup", label: "Windows Installer (.exe)", priority: 5 };
  }
  if (lower.endsWith(".appx")) return { platform: "windows", type: "AppX", label: "Windows Store (.appx)", priority: 6 };
  return { platform: "other", type: "other", label: name, priority: 99 };
}

// Global cached releases
let gReleases = [];

// Fetch Releases with Cache
async function fetchReleases() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        gReleases = parsed.data;
        renderReleases(gReleases);
        return;
      }
    }
  } catch (_) {}

  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github.v3+json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      gReleases = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
      } catch (_) {}
      renderReleases(gReleases);
    }
  } catch (err) {
    console.warn("Using fallback release metadata:", err);
    renderFallbackReleases();
  }
}

// Fallback release if offline / rate-limited
function renderFallbackReleases() {
  const fallback = [
    {
      tag_name: "v1.1.15",
      name: "v1.1.15 - Production Release",
      published_at: "2026-11-04T17:39:49Z",
      body: "Updated Linux Snap packages, Windows AppX builds, and improved audio buffer handling.",
      assets: [
        {
          name: "pulsar-music-player_1.1.15_amd64.snap",
          size: 94994432,
          browser_download_url: "https://github.com/darkangle4022211-cpu/pulser-audio/releases/download/v1.1.15/pulsar-music-player_1.1.15_amd64.snap"
        },
        {
          name: "Pulsar.Music.Player.1.1.15.appx",
          size: 207218285,
          browser_download_url: "https://github.com/darkangle4022211-cpu/pulser-audio/releases/download/v1.1.15/Pulsar.Music.Player.1.1.15.appx"
        }
      ]
    },
    {
      tag_name: "v1.1.10",
      name: "v1.1.10 - Fixed Listen Again Playback",
      published_at: "2026-10-24T16:39:31Z",
      body: "Performance boost for local audio indexing and 10-band equalizer curve calculations.",
      assets: [
        {
          name: "Pulsar-Music-Player-1.1.10.AppImage",
          size: 227259668,
          browser_download_url: "https://github.com/darkangle4022211-cpu/pulser-audio/releases/download/v1.1.10/Pulsar-Music-Player-1.1.10.AppImage"
        },
        {
          name: "Pulsar-Music-Player-Setup-1.1.10.exe",
          size: 170605709,
          browser_download_url: "https://github.com/darkangle4022211-cpu/pulser-audio/releases/download/v1.1.10/Pulsar-Music-Player-Setup-1.1.10.exe"
        }
      ]
    }
  ];
  gReleases = fallback;
  renderReleases(fallback);
}

// Render Releases to UI
function renderReleases(releases) {
  if (!releases || releases.length === 0) return;
  const latest = releases[0];

  // Update header and hero tags
  const headerTag = document.getElementById("header-release-tag");
  const heroTag = document.getElementById("hero-release-tag");
  if (headerTag) headerTag.textContent = latest.tag_name;
  if (heroTag) heroTag.textContent = latest.tag_name;

  // Find installable assets across releases
  let appImageAsset = null;
  let snapAsset = null;
  let debAsset = null;
  let exeAsset = null;

  for (const rel of releases) {
    for (const a of rel.assets || []) {
      const lower = a.name.toLowerCase();
      if (!appImageAsset && lower.endsWith(".appimage")) appImageAsset = { ...a, tag: rel.tag_name };
      if (!snapAsset && lower.endsWith(".snap")) snapAsset = { ...a, tag: rel.tag_name };
      if (!debAsset && lower.endsWith(".deb")) debAsset = { ...a, tag: rel.tag_name };
      if (!exeAsset && lower.endsWith(".exe") && !lower.includes("blockmap")) exeAsset = { ...a, tag: rel.tag_name };
    }
  }

  // Update Primary Download CTA Button
  const heroDownloadBtn = document.getElementById("hero-download-btn");
  const headerDownloadBtn = document.getElementById("header-download-btn");
  const defaultTarget = appImageAsset || snapAsset || (latest.assets && latest.assets[0]);

  if (defaultTarget) {
    const dlUrl = defaultTarget.browser_download_url;
    const sizeStr = formatBytes(defaultTarget.size);
    if (heroDownloadBtn) {
      heroDownloadBtn.href = dlUrl;
      heroDownloadBtn.innerHTML = `<span>Download ${escapeHtml(defaultTarget.tag || latest.tag_name)}</span> <span class="mono" style="opacity:0.8;font-size:0.75rem;">(${sizeStr})</span>`;
    }
    if (headerDownloadBtn) {
      headerDownloadBtn.href = dlUrl;
      headerDownloadBtn.textContent = `Download ${latest.tag_name}`;
    }
  }

  // Populate Platform Selector options
  const platformSelect = document.getElementById("platform-select");
  if (platformSelect) {
    platformSelect.innerHTML = "";
    const options = [
      appImageAsset && { label: `Linux AppImage (${appImageAsset.tag})`, url: appImageAsset.browser_download_url, size: appImageAsset.size },
      snapAsset && { label: `Linux Snap (${snapAsset.tag})`, url: snapAsset.browser_download_url, size: snapAsset.size },
      debAsset && { label: `Debian / Ubuntu .deb (${debAsset.tag})`, url: debAsset.browser_download_url, size: debAsset.size },
      exeAsset && { label: `Windows Installer .exe (${exeAsset.tag})`, url: exeAsset.browser_download_url, size: exeAsset.size }
    ].filter(Boolean);

    options.forEach((opt, idx) => {
      const el = document.createElement("option");
      el.value = opt.url;
      el.textContent = `${opt.label} • ${formatBytes(opt.size)}`;
      if (idx === 0) el.selected = true;
      platformSelect.appendChild(el);
    });

    platformSelect.addEventListener("change", (e) => {
      if (heroDownloadBtn && e.target.value) {
        heroDownloadBtn.href = e.target.value;
      }
    });
  }

  // Render Highlighted Release Details
  const relTagEl = document.getElementById("highlight-release-tag");
  const relDateEl = document.getElementById("highlight-release-date");
  if (relTagEl) relTagEl.textContent = latest.tag_name;
  if (relDateEl) relDateEl.textContent = formatDate(latest.published_at);

  // Render Asset Cards Grid
  const assetGrid = document.getElementById("release-assets-grid");
  if (assetGrid) {
    const assetsToShow = (latest.assets || []).filter(a => !a.name.endsWith(".json") && !a.name.endsWith(".yml"));
    assetGrid.innerHTML = assetsToShow.map(a => {
      const info = classifyAsset(a.name);
      return `
        <a href="${escapeHtml(a.browser_download_url)}" class="asset-download-card" download>
          <div>
            <div class="asset-name">${escapeHtml(info.label)}</div>
            <div class="asset-size">${formatBytes(a.size)}</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-cyan);">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      `;
    }).join("");
  }

  // Render Releases History Table
  const historyTbody = document.getElementById("releases-history-tbody");
  if (historyTbody) {
    historyTbody.innerHTML = releases.slice(0, 10).map(rel => {
      const assetCount = (rel.assets || []).length;
      return `
        <tr>
          <td style="font-weight:700;color:var(--color-cyan);">${escapeHtml(rel.tag_name)}</td>
          <td style="color:var(--color-muted);">${formatDate(rel.published_at)}</td>
          <td>${escapeHtml(rel.name || rel.tag_name)}</td>
          <td style="color:var(--color-muted);">${assetCount} files</td>
          <td><a href="${escapeHtml(rel.html_url)}" target="_blank" rel="noopener" style="color:var(--color-accent);text-decoration:none;">View on GitHub &rarr;</a></td>
        </tr>
      `;
    }).join("");
  }
}

// Setup Interactive 10-Band Equalizer
const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0],
  electronic: [5, 4, 2, 0, -2, 2, 1, 3, 4, 5],
  acoustic: [3, 2, 1, 1, 2, 2, 3, 3, 4, 3]
};

let currentEqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function initEqualizer() {
  const container = document.getElementById("eq-sliders-row");
  const svgCurve = document.getElementById("eq-svg-curve");
  if (!container || !svgCurve) return;

  container.innerHTML = EQ_FREQS.map((freq, idx) => {
    const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
    return `
      <div class="eq-slider-col">
        <span class="eq-db-label" id="eq-val-${idx}">0dB</span>
        <input type="range" class="eq-range-input" id="eq-slider-${idx}" min="-12" max="12" step="1" value="0" orient="vertical">
        <span class="eq-freq-label">${label}</span>
      </div>
    `;
  }).join("");

  EQ_FREQS.forEach((_, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`);
    slider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      currentEqGains[idx] = val;
      const label = document.getElementById(`eq-val-${idx}`);
      if (label) label.textContent = `${val > 0 ? "+" : ""}${val}dB`;
      updateEqSvgCurve();
      clearActivePreset();
    });
  });

  // Preset Buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      const gains = EQ_PRESETS[presetKey];
      if (!gains) return;

      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      gains.forEach((gain, idx) => {
        currentEqGains[idx] = gain;
        const slider = document.getElementById(`eq-slider-${idx}`);
        const label = document.getElementById(`eq-val-${idx}`);
        if (slider) slider.value = gain;
        if (label) label.textContent = `${gain > 0 ? "+" : ""}${gain}dB`;
      });
      updateEqSvgCurve();
    });
  });

  updateEqSvgCurve();
}

function clearActivePreset() {
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
}

function updateEqSvgCurve() {
  const svg = document.getElementById("eq-svg-curve");
  if (!svg) return;

  const w = 800;
  const h = 90;
  const midY = h / 2;

  // Calculate coordinates for 10 points
  const points = currentEqGains.map((gain, idx) => {
    const x = (idx / (EQ_FREQS.length - 1)) * (w - 60) + 30;
    // -12dB -> bottom (h - 10), +12dB -> top (10)
    const y = midY - (gain / 12) * (midY - 14);
    return { x, y };
  });

  // Construct smooth SVG path
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Draw smooth path with gradient stroke
  svg.innerHTML = `
    <defs>
      <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    </defs>
    <line x1="0" y1="${midY}" x2="${w}" y2="${midY}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="4 4" />
    <path d="${d}" fill="none" stroke="url(#curveGrad)" stroke-width="3" stroke-linecap="round" />
    ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="#06b6d4" stroke-width="2" />`).join("")}
  `;
}

// Setup Interactive Canvas Audio Visualizer
let isPlaying = false;
let animFrameId = null;

function initVisualizer() {
  const canvas = document.getElementById("visualizer-canvas");
  const playBtn = document.getElementById("player-play-btn");
  if (!canvas || !playBtn) return;

  const ctx = canvas.getContext("2d");
  const numBars = 36;
  const barHeights = new Array(numBars).fill(4);

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function renderFrame() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / numBars) - 3;
    const grad = ctx.createLinearGradient(0, height, 0, 0);
    grad.addColorStop(0, "#8b5cf6");
    grad.addColorStop(1, "#06b6d4");

    for (let i = 0; i < numBars; i++) {
      if (isPlaying) {
        // dynamic wave formula
        const target = Math.sin(Date.now() * 0.005 + i * 0.3) * (height * 0.4) + (height * 0.45) + (Math.random() * 8);
        barHeights[i] += (target - barHeights[i]) * 0.25;
      } else {
        barHeights[i] += (4 - barHeights[i]) * 0.1;
      }

      const x = i * (barWidth + 3);
      const bHeight = Math.max(3, barHeights[i]);
      const y = height - bHeight;

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, bHeight, [2, 2, 0, 0]);
      ctx.fill();
    }

    animFrameId = requestAnimationFrame(renderFrame);
  }

  renderFrame();

  // Play/Pause button action
  playBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;
    const playIcon = playBtn.querySelector("svg");
    if (isPlaying) {
      playBtn.setAttribute("aria-label", "Pause playback");
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
    } else {
      playBtn.setAttribute("aria-label", "Play track");
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    }
  });
}

// Setup Workspace Tabs (Scroll-Craft Walkthrough)
function initWorkspaceWalkthrough() {
  const tabs = document.querySelectorAll(".ws-tab");
  const imgEl = document.getElementById("ws-display-img");
  const captionEl = document.getElementById("ws-display-caption");
  if (!tabs.length || !imgEl || !captionEl) return;

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const item = WORKSPACE_DATA[idx];
      if (item) {
        imgEl.style.opacity = "0";
        setTimeout(() => {
          imgEl.src = item.file;
          imgEl.alt = item.title;
          captionEl.textContent = item.caption;
          imgEl.style.opacity = "1";
        }, 150);
      }
    });
  });
}

// Setup Theme Toggle (Dark Space & Daylight Pearlescent)
function initThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;

  const saved = localStorage.getItem("pulsar_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pulsar_theme", next);
  });
}

// Setup Terminal Copy Button
function initTerminalCopy() {
  const copyBtn = document.getElementById("terminal-copy-btn");
  const cmdText = document.getElementById("terminal-command-text");
  if (!copyBtn || !cmdText) return;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cmdText.textContent.trim());
      copyBtn.textContent = "COPIED!";
      setTimeout(() => {
        copyBtn.textContent = "COPY";
      }, 2000);
    } catch (_) {
      copyBtn.textContent = "DONE";
    }
  });
}

// Setup Release History Collapse Toggle
function initReleasesToggle() {
  const toggleBtn = document.getElementById("releases-history-toggle");
  const tableWrap = document.getElementById("releases-table-wrap");
  if (!toggleBtn || !tableWrap) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = tableWrap.classList.toggle("open");
    toggleBtn.textContent = isOpen ? "Hide release history ▲" : "View all 10 releases ▼";
  });
}

// Setup Review Submission Form
function initReviewForm() {
  const form = document.getElementById("review-form");
  const starContainer = document.getElementById("star-rating-picker");
  const starInput = document.getElementById("rating-stars-val");
  const feed = document.getElementById("reviews-feed");

  if (starContainer && starInput) {
    const stars = starContainer.querySelectorAll(".star-btn");
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.dataset.val, 10);
        starInput.value = rating;
        stars.forEach(s => {
          const val = parseInt(s.dataset.val, 10);
          s.style.opacity = val <= rating ? "1" : "0.3";
        });
      });
    });
  }

  if (form && feed) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("reviewer-name-input").value.trim() || "Anonymous Listener";
      const comment = document.getElementById("reviewer-comment-input").value.trim();
      const starsVal = parseInt(starInput.value, 10) || 5;

      if (!comment) return;

      const starStr = "★".repeat(starsVal) + "☆".repeat(5 - starsVal);

      // Prepend review to feed
      const newCard = document.createElement("div");
      newCard.className = "review-card";
      newCard.innerHTML = `
        <div class="review-header">
          <span class="reviewer-name">${escapeHtml(name)}</span>
          <span class="review-stars">${starStr}</span>
        </div>
        <p class="review-comment">${escapeHtml(comment)}</p>
      `;
      feed.prepend(newCard);

      // Open GitHub Issue in new tab
      const issueTitle = encodeURIComponent(`[Review] ${name} (${starsVal} Stars)`);
      const issueBody = encodeURIComponent(`### Rating: ${starStr}\n\n**Reviewer:** ${name}\n\n**Comment:**\n${comment}`);
      const issueUrl = `https://github.com/${REPO}/issues/new?title=${issueTitle}&body=${issueBody}&labels=review`;
      window.open(issueUrl, "_blank");

      form.reset();
      alert("Thank you! Your review has been added and prepared on GitHub.");
    });
  }
}

// DOM Ready Init
document.addEventListener("DOMContentLoaded", () => {
  fetchReleases();
  initThemeToggle();
  initVisualizer();
  initEqualizer();
  initWorkspaceWalkthrough();
  initTerminalCopy();
  initReleasesToggle();
  initReviewForm();
});
