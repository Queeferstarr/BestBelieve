const fetch = require('node-fetch');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';
const LASTFM_USER = 'ToxicHumans';

let lastTrack = null;

module.exports = {
    name: 'trackScrobble',
    once: false,
    async execute(client) {
        setInterval(async () => {
            try {
                const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(LASTFM_USER)}&api_key=${API_KEY}&format=json&limit=1`;
                const res = await fetch(url);
                if (!res.ok) return;
                const data = await res.json();
                const track = data.recenttracks && data.recenttracks.track && data.recenttracks.track[0];
                if (!track || !track.name) return;
                const trackString = `${track.artist['#text']} - ${track.name}`;
                if (trackString !== lastTrack) {
                    lastTrack = trackString;
                    client.user.setActivity(`${track.name} by ${track.artist['#text']}`, { type: 2 });
                }
            } catch (err) {
                // Silent fail
            }
        }, 15000); // Check every 15 seconds
    }
};
