import EleventyFetch from '@11ty/eleventy-fetch';
import codeStyleHooks from 'eleventy-plugin-code-style-hooks';
import sanitizeHTML from 'sanitize-html';
import dayjs from 'dayjs';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import { feedPlugin } from '@11ty/eleventy-plugin-rss';

const getSimilarTags = (categoriesA, categoriesB) => {
  if (!categoriesA) return [];
  return categoriesA.filter(Set.prototype.has, new Set(categoriesB)).length;
};

const getUniquePosts = (posts) => {
  const field = "url";
  const uniqueValues = new Set();
  return posts.filter((item) => {
    if (!uniqueValues.has(item[field])) {
      uniqueValues.add(item[field]);
      return true;
    }
    return false;
  });
};

export default async function (eleventyConfig) {
  // Copy the contents of the `public` folder to the output folder
  // For example, `./public/css/` ends up in `_site/css/`
  eleventyConfig.addPassthroughCopy({
    "./public/": "/",
  });
  
  eleventyConfig.addPassthroughCopy("src/assets/fonts");    
  eleventyConfig.addWatchTarget("src/img");  
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addWatchTarget("src/assets/css");   

  eleventyConfig.addPlugin(codeStyleHooks, {
    lineNumbers: false,
  });

  eleventyConfig.addPlugin(feedPlugin, {
	type: "atom", // or "rss", "json"
	outputPath: "feed.xml",
	collection: {
		name: "articles", // iterate over `collections.posts`
		limit: 0,     // 0 means no limit
	},
	metadata: {
		language: "en",
		title: "stuff&things",
		subtitle: "Some writings on stuff & things.",
		base: "https://stuffandthings.lol/",
		author: {
			name: "Jason",
			email: "", // Optional
		}
	}
  });
                 
  // Run Eleventy when these files change:

  // https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets  

  // Watch content images for the image pipeline.
  
  eleventyConfig.addWatchTarget("src/**/*.{svg,webp,png,jpeg}");

  eleventyConfig.addFilter("postTags", (tags) => {
    return Object.keys(tags)
      .filter((k) => k !== "posts")
      .filter((k) => k !== "all")
      .filter((k) => k !== "articles")
      .map((k) => ({ name: k, count: tags[k].length }))
      .sort((a, b) => b.count - a.count);
  });
  
    eleventyConfig.addFilter("webmentionsByUrl", webmentionsByUrl);
    eleventyConfig.addFilter("plainDate", plainDate);
  
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/**/*.md").reverse();
  });
  
    eleventyConfig.addCollection("articles", function (collectionsApi) {
    return collectionsApi.getFilteredByGlob("src/posts/**/*.md");
  });

  eleventyConfig.addLiquidFilter(
    "similarPosts",
    function (collection, path, tags) {
      if (!collection) return [];
      let similarPosts = collection
        .filter((post) => {
          return (
            getSimilarTags(post.data.tags, tags) >= 1 &&
            post.data.page.inputPath !== path
          );
        })
        .sort((a, b) => {
          return (
            getSimilarTags(b.data.tags, tags) -
            getSimilarTags(a.data.tags, tags)
          );
        });
      if (similarPosts.length < 4) {
        similarPosts = similarPosts
          .concat(collection.slice(0, 3))
          .filter((post) => post.data.page.inputPath !== path);
      }
      return getUniquePosts(similarPosts);
    }
  );
  
  return {
    // Control which files Eleventy will process
    // e.g.: *.md, *.njk, *.html, *.liquid
    templateFormats: ["md", "njk", "html", "liquid"],

    // Pre-process *.md files with: (default: `liquid`)
    markdownTemplateEngine: "njk",

    // Pre-process *.html files with: (default: `liquid`)
    htmlTemplateEngine: "njk",

    // These are all optional:
    dir: {
      input: "src", // default: "."
    },

    // -----------------------------------------------------------------
    // Optional items:
    // -----------------------------------------------------------------

    // If your site deploys to a subdirectory, change `pathPrefix`.
    // Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

    // When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
    // it will transform any absolute URLs in your HTML to include this
    // folder name and does **not** affect where things go in the output folder.
    pathPrefix: "/",
  };
};

// Convert a date string to ISO string using dayjs
export const toISOString = dateString => dayjs(dateString).toISOString();

// Filter and sort webmentions by URL, and sanitize HTML content
export const webmentionsByUrl = (webmentions, url) => {
  const allowedTypes = {
    likes: ["like-of"],
    reposts: ["repost-of"],
    comments: ["mention-of", "in-reply-to"],
  };

  const sanitize = (entry) => {
    if (entry.content && entry.content.html) {
      entry.content = sanitizeHTML(entry.content.html, {
        allowedTags: ["b", "i", "em", "strong", "a"],
      });
    }
    return entry;
  };

  const pageWebmentions = webmentions
    .filter(
      (mention) => mention["wm-target"] === "https://stuffandthings.lol" + url
    )
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .map(sanitize);

  const likes = pageWebmentions
    .filter((mention) => allowedTypes.likes.includes(mention["wm-property"]))
    .filter((like) => like.author)
    .map((like) => like.author);

  const reposts = pageWebmentions
    .filter((mention) => allowedTypes.reposts.includes(mention["wm-property"]))
    .filter((repost) => repost.author)
    .map((repost) => repost.author);

  const comments = pageWebmentions
    .filter((mention) => allowedTypes.comments.includes(mention["wm-property"]))
    .filter((comment) => {
      const { author, published, content } = comment;
      return author && author.name && published && content;
    });

  const mentionCount = likes.length + reposts.length + comments.length;
  const data = { likes, reposts, comments, mentionCount };
  return data;
};


// Create a plain date from an ISO date for webmentions
export const plainDate = (isoDate) => {
  let date = new Date(isoDate);
  let options = { year: "numeric", month: "long", day: "numeric" };
  let formattedDate = date.toLocaleDateString("en-US", options);
  return formattedDate;
};


