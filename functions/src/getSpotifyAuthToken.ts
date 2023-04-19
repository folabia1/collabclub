import axios from "axios";
import * as qs from "qs";

type Token = {
  access_token: string;
};

export async function getSpotifyAuthToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";

  try {
    const response = await axios.post<Token>(
      "https://accounts.spotify.com/api/token",
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: clientId,
          password: clientSecret,
        },
      }
    );

    return response;
  } catch (error) {
    console.log(`Unable to retrieve Spotify API auth token - ${error}`);
    return;
  }
}
