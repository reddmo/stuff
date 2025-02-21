// _data/mastodon.js
import EleventyFetch from "@11ty/eleventy-fetch";
import 'dotenv/config';

export default async function() {
  // Use environment variables with fallbacks
  const MASTODON_INSTANCE = 'social.lol';
  const MASTODON_USERNAME = 'jasonm';
  
  // API endpoint to get your account info
  const url = `https://${MASTODON_INSTANCE}/api/v1/accounts/lookup?acct=${MASTODON_USERNAME}`;
  
  try {
    // First get your account ID
    const accountData = await EleventyFetch(url, {
      duration: "1h",
      type: "json"
    });
    
    const accountId = accountData.id;
    
    // Get all statuses with pagination
    const statuses = await getAllStatuses(accountId, MASTODON_INSTANCE);
    
    // Process the statuses to extract relevant data
    return statuses.map(status => {
      return {
        id: status.id,
        content: status.content,
        created_at: status.created_at,
        url: status.url,
        media_attachments: status.media_attachments,
        favourites_count: status.favourites_count,
        reblogs_count: status.reblogs_count,
        // Strip HTML from content for a plain text version
        plain_content: status.content.replace(/<[^>]*>?/gm, '')
      };
    });
    
  } catch (error) {
    console.error("Error fetching Mastodon posts:", error);
    return []; // Return empty array on error
  }
}

// Pagination function to get all statuses
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