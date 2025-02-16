import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from 'dotenv';

export default async function () {
const url = `https://webmention.io/api/mentions.jf2?token=${process.env.WEBMENTION_IO_TOKEN}`;
const res = await EleventyFetch(url, {
    duration: "1h",
    type: "json",
  });
  const webmentions = res;
  return {
    mentions: webmentions.children,
  };
 }