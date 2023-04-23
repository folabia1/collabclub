import axios from "axios";

type Token = {
  access_token: string;
};

export async function getSpotifyAuthToken() {
  const data = {
    grant_type: "client_credentials",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  };

  try {
    const response = await axios.post<Token>("https://accounts.spotify.com/api/token", new URLSearchParams(data).toString(), {
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
    });

    return response;
  } catch (error) {
    console.log(`Unable to retrieve Spotify API auth token - ${error}`);
    return;
  }
}
