
import EleventyFetch from "@11ty/eleventy-fetch";
import dotenv from 'dotenv';

export default async function() {

  const MASTODON_INSTANCE = process.env.MASTODON_INSTANCE || "social.lol";
  const MASTODON_USERNAME = process.env.MASTODON_USERNAME || "jasonm";
  
  const url = `https://${MASTODON_INSTANCE}/api/v1/accounts/lookup?acct=${MASTODON_USERNAME}`;
  
  try {
    const accountData = await EleventyFetch(url, {
      duration: "1h",
      type: "json"
    });
    
    const accountId = accountData.id;
    
    const statuses = await getAllStatuses(accountId, MASTODON_INSTANCE);
    
    return statuses.map(status => {
      return {
        id: status.id,
        content: status.content,
        created_at: status.created_at,
        url: status.url,
        media_attachments: status.media_attachments,
        favourites_count: status.favourites_count,
        reblogs_count: status.reblogs_count,
        plain_content: status.content.replace(/<[^>]*>?/gm, '')
      };
    });
    
  } catch (error) {
    console.error("Error fetching Mastodon posts:", error);
    return []; 
  }
}

const getAllStatuses = async (accountId, instance) => {
  let allStatuses = [];
  let maxId = null;
  let hasMore = true;
  
  while (hasMore && allStatuses.length < 100) { // Limit to 100 posts max
    let fetchUrl = `https://${instance}/api/v1/accounts/${accountId}/statuses?exclude_replies=true&exclude_reblogs=true&limit=40`;
    if (maxId) fetchUrl += `&max_id=${maxId}`;
    
    const batch = await EleventyFetch(fetchUrl, {
      duration: "3h",
      type: "json"
    });
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      allStatuses = [...allStatuses, ...batch];
      maxId = batch[batch.length - 1].id;
    }
  }
  
  return allStatuses;
};