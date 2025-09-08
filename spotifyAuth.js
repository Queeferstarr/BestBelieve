// Render deployment: https://coffinfm1.onrender.com (SPOTIFY_REDIRECT_URI must match)
const express = require('express')
const SpotifyWebApi = require('spotify-web-api-node');
const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8888;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

app.get('/login', (req, res) => {
  const scopes = [
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'user-read-recently-played',
    'user-modify-playback-state'
  ];
  console.log('[AUTH] /login called');
  console.log('[AUTH] Query params:', req.query);
  console.log('[AUTH] Using redirectUri:', process.env.SPOTIFY_REDIRECT_URI);
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, req.query.state || '');
  console.log('[AUTH] Redirecting to:', authorizeURL);
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const discordId = req.query.state; // Pass Discord ID as state
  console.log('[AUTH] /callback called');
  console.log('[AUTH] Query params:', req.query);
  if (!code) {
    console.error('[AUTH] No code provided in callback');
    return res.status(400).send('No code provided.');
  }
  if (!discordId) {
    console.error('[AUTH] No Discord ID (state) provided in callback');
    return res.status(400).send('No Discord ID provided.');
  }
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;
    console.log('[AUTH] Received tokens:', { access_token, refresh_token, expires_in });
    // Save tokens to user in DB
    if (discordId) {
      const updateResult = await User.updateOne(
        { discordId },
        { $set: { spotify: { access_token, refresh_token, expires_in, updated: new Date() } } },
        { upsert: true }
      );
      console.log('[AUTH] MongoDB update result:', updateResult);
    }
    res.send('Spotify authentication successful! You can close this window.');
  } catch (err) {
    console.error('[AUTH] Error in /callback:', err);
    res.status(500).send('Spotify authentication failed.');
  }
});

app.listen(PORT, () => {
  console.log(`Spotify auth server running on port ${PORT}`);
});
