const REPO = "darkangle4022211-cpu/pulser-audio";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
const REVIEWS_API = `https://api.github.com/repos/${REPO}/issues?labels=review&state=all&per_page=20`;
const CACHE_KEY = "pulsar_releases_cache_v3";
const CACHE_TTL_MS = 5 * 60 * 1000;

const HERO_SCREENS = [
  {
    src: "./assets/discover-flow.jpg",
    alt: "Pulsar Audio Discover and Flow view with local genre pills and track grid",
    caption: "Offline mood classification sorts local libraries without external requests."
  },
  {
    src: "./assets/now-playing.jpg",
    alt: "Pulsar Audio Now Playing studio with album backdrop and queue sidebar",
    caption: "Full-screen Now Playing console with queue ordering and LRC lyrics."
  },
  {
    src: "./assets/all-tracks.jpg",
    alt: "Pulsar Audio All Tracks library table with metadata columns and inline actions",
    caption: "Instant folder scanning across FLAC, MP3, WAV, AAC, and OGG collections."
  },
  {
    src: "./assets/light-mode.jpg",
    alt: "Pulsar Audio Daylight theme showing high-contrast warm surface",
    caption: "Switch between nocturnal and daylight surfaces without interrupting audio."
  }
];

const WORKSPACE_DATA = [
  {
    title: "Library and tracks",
    file: "./assets/all-tracks.jpg",
    alt: "Pulsar Audio All Tracks library table with metadata columns and inline queue controls",
    caption: "Offline library table supporting instant metadata search, custom playlists, and FLAC decoding."
  },
  {
    title: "Navigation drawer",
    file: "./assets/navigation-drawer.jpg",
    alt: "Pulsar Audio collapsible navigation drawer showing custom playlists and backup triggers",
    caption: "Collapsible sidebar for playlists, library folder watching, and local JSON backups."
  },
  {
    title: "Discover and flow",
    file: "./assets/discover-flow.jpg",
    alt: "Pulsar Audio Discover and Flow mood channel filtering and recently played strip",
    caption: "Local mood filters (Chill, Lofi, Workout, Focus) and offline queue scheduling."
  },
  {
    title: "Now playing",
    file: "./assets/now-playing.jpg",
    alt: "Pulsar Audio Now Playing studio with Up Next queue and synchronized lyrics panel",
    caption: "Full-screen Now Playing view with Up Next ordering and synchronized LRC lyrics."
  },
  {
    title: "Daylight theme",
    file: "./assets/light-mode.jpg",
    alt: "Pulsar Audio Daylight pearlescent theme mode inside desktop window",
    caption: "High-contrast warm paper theme built for bright desktop environments."
  }
];

const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0],
  electronic: [5, 4, 2, 0, -2, 2, 1, 3, 4, 5],
  acoustic: [3, 2, 1, 1, 2, 2, 3, 3, 4, 3]
};

let currentEqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let activeOs = "linux";
let latestInstallMeta = {
  linuxCmd: "sudo snap install pulsar-music-player",
  linuxMeta: "Pulsar-Music-Player-1.1.10.AppImage (216.7 MB)",
  winCmd: "Pulsar-Music-Player-Setup-1.1.10.exe",
  winMeta: "Pulsar-Music-Player-Setup-1.1.10.exe (162.7 MB)"
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateHeroOsReadout() {
  const cmdEl = document.getElementById("terminal-command-text");
  const noteEl = document.getElementById("hero-os-note");
  if (!cmdEl || !noteEl) return;

  if (activeOs === "windows") {
    cmdEl.textContent = latestInstallMeta.winCmd;
    noteEl.innerHTML = `<span class="measured">${escapeHtml(latestInstallMeta.winMeta)}</span> plus Portable and AppX builds.`;
  } else {
    cmdEl.textContent = latestInstallMeta.linuxCmd;
    noteEl.innerHTML = `<span class="measured">${escapeHtml(latestInstallMeta.linuxMeta)}</span> plus Snap and Debian packages.`;
  }
}

function renderReleases(releases) {
  if (!Array.isArray(releases) || releases.length === 0) return;
  const latest = releases[0];

  const headerBtn = document.getElementById("header-download-btn");
  if (headerBtn) headerBtn.textContent = `Get ${latest.tag_name}`;

  const relTagEl = document.getElementById("highlight-release-tag");
  const relDateEl = document.getElementById("highlight-release-date");
  if (relTagEl) relTagEl.textContent = latest.tag_name;
  if (relDateEl) relDateEl.textContent = formatDate(latest.published_at);

  let appImageAsset = null;
  let snapAsset = null;
  let debAsset = null;
  let exeSetupAsset = null;
  let exePortableAsset = null;
  let appxAsset = null;

  for (const rel of releases) {
    for (const a of rel.assets || []) {
      const lower = a.name.toLowerCase();
      if (!appImageAsset && lower.endsWith(".appimage")) appImageAsset = a;
      if (!snapAsset && lower.endsWith(".snap")) snapAsset = a;
      if (!debAsset && lower.endsWith(".deb")) debAsset = a;
      if (!exeSetupAsset && lower.endsWith(".exe") && lower.includes("setup")) exeSetupAsset = a;
      if (!exePortableAsset && lower.endsWith(".exe") && lower.includes("portable")) exePortableAsset = a;
      if (!appxAsset && lower.endsWith(".appx")) appxAsset = a;
    }
  }

  const heroLinuxCta = document.getElementById("hero-linux-cta");
  if (heroLinuxCta && appImageAsset) {
    heroLinuxCta.href = appImageAsset.browser_download_url;
    heroLinuxCta.setAttribute("download", appImageAsset.name);
    latestInstallMeta.linuxMeta = `${appImageAsset.name} (${formatBytes(appImageAsset.size)})`;
  }

  const heroWindowsCta = document.getElementById("hero-windows-cta");
  if (heroWindowsCta && exeSetupAsset) {
    heroWindowsCta.href = exeSetupAsset.browser_download_url;
    heroWindowsCta.setAttribute("download", exeSetupAsset.name);
    latestInstallMeta.winCmd = exeSetupAsset.name;
    latestInstallMeta.winMeta = `${exeSetupAsset.name} (${formatBytes(exeSetupAsset.size)})`;
  }

  const pkgLinks = [
    ["pkg-appimage", appImageAsset],
    ["pkg-snap", snapAsset],
    ["pkg-deb", debAsset],
    ["pkg-win-setup", exeSetupAsset],
    ["pkg-win-portable", exePortableAsset],
    ["pkg-win-appx", appxAsset]
  ];
  pkgLinks.forEach(([id, asset]) => {
    const link = document.getElementById(id);
    if (!link || !asset) return;
    link.href = asset.browser_download_url;
    link.setAttribute("download", asset.name);
    const row = link.closest("tr");
    if (row && row.children[2]) row.children[2].textContent = formatBytes(asset.size);
  });

  updateHeroOsReadout();

  const historyTbody = document.getElementById("releases-history-tbody");
  if (historyTbody) {
    historyTbody.innerHTML = releases
      .slice(0, 10)
      .map((rel) => {
        const assetCount = (rel.assets || []).length;
        return `
          <tr>
            <td class="measured">${escapeHtml(rel.tag_name)}</td>
            <td class="measured muted">${escapeHtml(formatDate(rel.published_at))}</td>
            <td>${escapeHtml(rel.name || rel.tag_name)}</td>
            <td class="measured muted">${assetCount} files</td>
            <td><a href="${escapeHtml(rel.html_url)}" target="_blank" rel="noopener noreferrer">Release</a></td>
          </tr>
        `;
      })
      .join("");
  }
}

async function fetchReleases() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        renderReleases(parsed.data);
        return;
      }
    }
  } catch {
    // Ignore storage error
  }

  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch {
        // Ignore storage error
      }
      renderReleases(data);
    }
  } catch {
    updateHeroOsReadout();
  }
}

function initHeroControls() {
  const linuxBtn = document.getElementById("hero-os-linux-btn");
  const winBtn = document.getElementById("hero-os-windows-btn");
  const linuxPanel = document.getElementById("hero-linux-panel");
  const winPanel = document.getElementById("hero-windows-panel");

  if (linuxBtn && winBtn && linuxPanel && winPanel) {
    const setOs = (os) => {
      activeOs = os;
      const isWin = os === "windows";
      winBtn.setAttribute("aria-selected", isWin ? "true" : "false");
      linuxBtn.setAttribute("aria-selected", isWin ? "false" : "true");
      winPanel.hidden = !isWin;
      linuxPanel.hidden = isWin;
      updateHeroOsReadout();
    };

    linuxBtn.addEventListener("click", () => setOs("linux"));
    winBtn.addEventListener("click", () => setOs("windows"));
    const ua = (navigator.userAgent || "").toLowerCase();
    setOs(ua.includes("win") ? "windows" : "linux");
  }

  const stageImg = document.getElementById("hero-stage-img");
  const stageCaption = document.getElementById("hero-stage-caption");
  const stageBtns = Array.from(document.querySelectorAll("[data-hero-screen]"));
  stageBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-hero-screen"));
      const item = HERO_SCREENS[idx];
      if (!item || !stageImg || !stageCaption) return;
      stageBtns.forEach((b, i) => {
        const active = i === idx;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      stageImg.src = item.src;
      stageImg.alt = item.alt;
      stageCaption.textContent = item.caption;
    });
  });
}

function updateEqSvgCurve() {
  const svg = document.getElementById("eq-svg-curve");
  if (!svg) return;

  const w = 800;
  const h = 90;
  const midY = h / 2;

  const points = currentEqGains.map((gain, idx) => {
    const x = (idx / (EQ_FREQS.length - 1)) * (w - 60) + 30;
    const y = midY - (gain / 12) * (midY - 14);
    return { x, y };
  });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  svg.innerHTML = `
    <line x1="0" y1="${midY}" x2="${w}" y2="${midY}" stroke="var(--color-rule)" stroke-width="1" stroke-dasharray="4 4" />
    <path d="${d}" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" />
    ${points
      .map(
        (p) =>
          `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--color-paper-2)" stroke="var(--color-accent)" stroke-width="2" />`
      )
      .join("")}
  `;
}

function initEqualizer() {
  const container = document.getElementById("eq-sliders-row");
  if (!container) return;

  container.innerHTML = EQ_FREQS.map((freq, idx) => {
    const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
    return `
      <div class="eq-slider-col">
        <span class="eq-db-label" id="eq-val-${idx}">0 dB</span>
        <div class="eq-range-wrap">
          <input type="range" class="eq-range-input" id="eq-slider-${idx}" min="-12" max="12" step="1" value="0" aria-label="${label} Hz gain">
        </div>
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
      if (label) label.textContent = `${val > 0 ? "+" : ""}${val} dB`;
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("is-active"));
      updateEqSvgCurve();
    });
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gains = EQ_PRESETS[btn.dataset.preset];
      if (!gains) return;
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      gains.forEach((gain, idx) => {
        currentEqGains[idx] = gain;
        const slider = document.getElementById(`eq-slider-${idx}`);
        const label = document.getElementById(`eq-val-${idx}`);
        if (slider) slider.value = String(gain);
        if (label) label.textContent = `${gain > 0 ? "+" : ""}${gain} dB`;
      });
      updateEqSvgCurve();
    });
  });

  updateEqSvgCurve();
}

function initWorkspaceWalkthrough() {
  const tabs = Array.from(document.querySelectorAll(".ws-tab"));
  const imgEl = document.getElementById("ws-display-img");
  const captionEl = document.getElementById("ws-display-caption");
  if (!tabs.length || !imgEl || !captionEl) return;

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      const item = WORKSPACE_DATA[idx];
      if (!item) return;
      tabs.forEach((t, i) => {
        const active = i === idx;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      imgEl.src = item.file;
      imgEl.alt = item.alt;
      captionEl.textContent = item.caption;
    });
  });
}

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

function initTerminalCopy() {
  const copyBtn = document.getElementById("terminal-copy-btn");
  const cmdText = document.getElementById("terminal-command-text");
  const statusEl = document.getElementById("live-status");
  if (!copyBtn || !cmdText) return;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cmdText.textContent.trim());
      copyBtn.textContent = "Copied";
      if (statusEl) statusEl.textContent = "Command copied.";
      window.setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1600);
    } catch {
      copyBtn.textContent = "Failed";
    }
  });
}

function initReleasesToggle() {
  const toggleBtn = document.getElementById("releases-history-toggle");
  const tableWrap = document.getElementById("releases-table-wrap");
  if (!toggleBtn || !tableWrap) return;

  toggleBtn.addEventListener("click", () => {
    const willOpen = tableWrap.hasAttribute("hidden");
    if (willOpen) {
      tableWrap.removeAttribute("hidden");
      toggleBtn.textContent = "Hide release log";
    } else {
      tableWrap.setAttribute("hidden", "");
      toggleBtn.textContent = "Show release log";
    }
  });
}

function cleanReviewBody(body) {
  return String(body || "")
    .replace(/^###\s*Rating:.*$/gim, "")
    .replace(/^\*\*Reviewer:\*\*.*$/gim, "")
    .replace(/^\*\*Comment:\*\*$/gim, "")
    .trim();
}

function parseRatingLabel(title, body) {
  const m = `${title} ${body}`.match(/([1-5])\s*(?:Stars|\/ 5)/i);
  const val = m ? Number(m[1]) : 5;
  return `${val} / 5`;
}

async function fetchRealReviews() {
  const listEl = document.getElementById("reviews-list");
  const statusEl = document.getElementById("reviews-status");
  if (!listEl || !statusEl) return;

  try {
    const res = await fetch(REVIEWS_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return;
    const issues = await res.json();
    const reviews = Array.isArray(issues) ? issues.filter((i) => !i.pull_request) : [];
    statusEl.textContent = `${reviews.length} published`;

    if (!reviews.length) return;

    listEl.innerHTML = reviews
      .map((issue) => {
        const user = issue.user ? issue.user.login : "listener";
        const bodyText = cleanReviewBody(issue.body) || "No comment text provided.";
        return `
          <article class="review-item">
            <div class="review-meta">
              <span>@${escapeHtml(user)}</span>
              <span class="measured">${escapeHtml(parseRatingLabel(issue.title, issue.body))}</span>
            </div>
            <p>${escapeHtml(bodyText)}</p>
          </article>
        `;
      })
      .join("");
  } catch {
    // Keep default empty state
  }
}

function initReviewForm() {
  const form = document.getElementById("review-form");
  const help = document.getElementById("review-form-help");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reviewer-name-input").value.trim();
    const comment = document.getElementById("reviewer-comment-input").value.trim();
    const rating = document.getElementById("rating-stars-val").value;

    if (!name || !comment) {
      if (help) help.textContent = "Enter your handle and comment before opening GitHub.";
      return;
    }

    const params = new URLSearchParams({
      labels: "review",
      title: `[Review] ${name} (${rating} / 5)`,
      body: `**Rating:** ${rating} / 5\n\n**Reviewer:** ${name}\n\n${comment}`
    });

    if (help) help.textContent = "Prepared a pre-filled issue draft in a new GitHub tab.";
    window.open(`https://github.com/${REPO}/issues/new?${params.toString()}`, "_blank", "noopener,noreferrer");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchReleases();
  initHeroControls();
  initThemeToggle();
  initEqualizer();
  initWorkspaceWalkthrough();
  initTerminalCopy();
  initReleasesToggle();
  initReviewForm();
  fetchRealReviews();
});
