import axios from "axios";
import * as qs from "qs";

export async function getSpotifyAuth() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const headers = {
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: clientId,
      password: clientSecret,
    },
  };
  const data = {
    grant_type: "client_credentials",
  };

  try {
    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        qs.stringify(data),
        headers
    );
    return response;
  } catch (error) {
    console.log(error);
    return error;
  }
}
