const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const app = express();
const PORT = 8888;

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
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, req.query.state || '');
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const discordId = req.query.state; // Pass Discord ID as state
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;
    // Save tokens to user in DB
    if (discordId) {
      await User.updateOne(
        { discordId },
        { $set: { spotify: { access_token, refresh_token, expires_in, updated: new Date() } } },
        { upsert: true }
      );
    }
    res.send('Spotify authentication successful! You can close this window.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Spotify authentication failed.');
  }
});

app.listen(PORT, () => {
  console.log(`Spotify auth server running on ${process.env.SPOTIFY_REDIRECT_URI.replace('/callback', '')}`);
});
