import './sounds.js';

export function injectNavbar() {
    const container = document.getElementById('navbar-container');
    if (!container) return;
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";

    container.innerHTML = `
        <nav>
            <div class="brand" onclick="window.location.href='index.html'" role="button" tabindex="0" aria-label="Go to homepage">
                <img class="brand-logo" src="assets/logo.jpg" alt="myHQ Arcade logo">
                <strong class="brand-name">myHQ Arcade</strong>
            </div>
            <div class="nav-links">
                <a href="index.html" class="${page === 'index.html' ? 'active' : ''}">Lobby</a>
                <a href="mini-games.html" class="${page === 'mini-games.html' ? 'active' : ''}">Mini Games</a>
                <a href="calendar.html" class="${page === 'calendar.html' ? 'active' : ''}">Calendar</a>
                <a href="loot-room.html" class="${page === 'loot-room.html' ? 'active' : ''}">Loot Room</a>
                <a href="hall-of-fame.html" class="${page === 'hall-of-fame.html' ? 'active' : ''}">Hall of Fame</a>
                <a href="player.html" class="${page === 'player.html' ? 'active' : ''}">Player</a>
            </div>
        </nav>
        <div class="ticker-wrap">
            <div class="ticker">
                ⚡ Welcome to myHQ Arcade! ⚡ Check the Calendar for upcoming battles! ⚡ Play Mini Games for fun! ⚡ See what's new in the Loot Room! ⚡
            </div>
        </div>
    `;
}