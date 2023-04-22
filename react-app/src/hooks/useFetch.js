import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from '../firebase-config';


export default function useFetch() {
  const searchForArtistOnSpotify = httpsCallable(functions, "searchForArtistOnSpotify");
  const [ data, setData ] = useState({
    slug: "",
    results: [],
  });

  useEffect(() => {
    if (data.slug.trim() !== "") {
      const timeoutId = setTimeout(() => {
        async function fetch() {
          try {
            const artistsData = await searchForArtistOnSpotify({"artistName": data.slug})
            setData((prevData) => {
              return {slug: prevData.slug, results: artistsData.data}
            })
          } catch (error) {
            console.log(`[useFetch] ${error}`)
          }
        }
        fetch()
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [data.slug]);

  return { data, setData };
};

 