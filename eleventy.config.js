import { IdAttributePlugin, InputPathToUrlTransformPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import { EleventyRenderPlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginNavigation from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import 'dotenv/config';
import markdownit from "markdown-it";
import markdownItGitHubAlerts from 'markdown-it-github-alerts';
import markdownItAttrs from "markdown-it-attrs";
import markdownItFootnote from 'markdown-it-footnote';
import { full as emoji } from 'markdown-it-emoji';
import eleventyLucideicons from "@grimlink/eleventy-plugin-lucide-icons";
import pluginFilters from "./_config/filters.js";
import eleventyAutoCacheBuster from "eleventy-auto-cache-buster";
import Image from '@11ty/eleventy-img';
import dayjs from 'dayjs';
import sanitizeHTML from 'sanitize-html';
import path from 'node:path';

// Setup markdown-it configuration
const setupMarkdown = () => {
  const options = {
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
  };

  const md = markdownit(options)
    .use(markdownItGitHubAlerts)
    .use(markdownItFootnote)
    .use(markdownItAttrs)
    .use(emoji);

  md.renderer.rules.footnote_block_open = () => (
    '<section class="footnotes">\n' +
    '<h4>Footnotes</h4>\n' +
    '<ol class="footnotes-list">\n'
  );

  return md;
};

// Feed configuration helpers
const createFeedConfig = (options) => {
  const baseConfig = {
    stylesheet: "pretty-atom-feed.xsl",
    metadata: {
      language: "en",
      title: "stuff&things",
      subtitle: "Just some stuff about things.",
      base: "https://stuffandthings.lol/",
      author: {
        name: "Jason"
      }
    }
  };
  
  return { ...baseConfig, ...options };
};

// Webmention utility functions
export const toISOString = dateString => dayjs(dateString).toISOString();

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
    .filter(mention => mention["wm-target"] === "https://stuffandthings.lol" + url)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .map(sanitize);

  const likes = pageWebmentions
    .filter(mention => allowedTypes.likes.includes(mention["wm-property"]))
    .filter(like => like.author)
    .map(like => like.author);

  const reposts = pageWebmentions
    .filter(mention => allowedTypes.reposts.includes(mention["wm-property"]))
    .filter(repost => repost.author)
    .map(repost => repost.author);

  const comments = pageWebmentions
    .filter(mention => allowedTypes.comments.includes(mention["wm-property"]))
    .filter(comment => {
      const { author, published, content } = comment;
      return author && author.name && published && content;
    });

  const mentionCount = likes.length + reposts.length + comments.length;
  return { likes, reposts, comments, mentionCount };
};

export const plainDate = (isoDate) => {
  const date = new Date(isoDate);
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function(eleventyConfig) {
  // --- File passthrough configuration ---
  eleventyConfig.addPassthroughCopy({
    "./public/": "/",
    "./node_modules/prismjs/themes/prism-okaidia.css": "/css/prism-okaidia.css"
  });
  eleventyConfig.addPassthroughCopy("./site/feed/pretty-atom-feed.xsl");
  eleventyConfig.addPassthroughCopy("site/assets/**/*");
  eleventyConfig.addPassthroughCopy("admin");

  // --- Markdown configuration ---
  const md = setupMarkdown();
  eleventyConfig.setLibrary('md', md);
  
  // --- Watch configuration ---
  eleventyConfig.addWatchTarget("site/**/*.{svg,webp,png,jpeg}");
  
  // --- Bundle configuration ---
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("js");

  // --- Official Eleventy plugins ---
  eleventyConfig.addPlugin(pluginSyntaxHighlight, {
    preAttributes: { tabindex: 0 }
  });
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(eleventyAutoCacheBuster);
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  eleventyConfig.addPlugin(pluginFilters);
  eleventyConfig.addPlugin(IdAttributePlugin);
  
  // --- Icon plugin ---
  eleventyConfig.addPlugin(eleventyLucideicons, {
    "class": "svg",
    "stroke": "currentColor"
  });

  // --- Feed plugins ---
  eleventyConfig.addPlugin(feedPlugin, createFeedConfig({
    type: "atom",
    outputPath: "/feed/feed.xml",
    templateData: {
      eleventyNavigation: {
        key: "Feed",
        order: 7
      }
    },
    collection: {
      name: "posts",
      limit: 10,
    }
  }));

  eleventyConfig.addPlugin(feedPlugin, createFeedConfig({
    type: "rss",
    outputPath: "/feed/notesfeed.xml",
    collection: {
      name: "notes",
      limit: 10,
    }
  }));

  // --- Image optimization ---
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    formats: ["avif", "webp", "jpg", "png", "auto"],
    widths: ["auto"],
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    }
  });

  // --- Custom filters ---
  eleventyConfig.addFilter("contentImgUrlFilter", contentImgUrlFilter);
  eleventyConfig.addFilter("webmentionsByUrl", webmentionsByUrl);
  eleventyConfig.addFilter("plainDate", plainDate);
  eleventyConfig.addFilter("dateToFormat", function(date, format) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  process.env.ELEVENTY_FETCH_TIMEOUT = 10000;

  // --- Custom shortcodes ---
  eleventyConfig.addShortcode("currentBuildDate", () => new Date().toISOString());
  eleventyConfig.addShortcode("lucide", function(eleventyLucideicons) { /* … */ });

  // --- Custom collections ---
  eleventyConfig.addCollection("posts", collections => 
    collections.getFilteredByGlob("site/blog/**/*.md")
  );

  eleventyConfig.addCollection("notes", collections => 
    collections.getFilteredByGlob("site/notes/**/*.md")
  );

  // Image processing function for content
  async function contentImgUrlFilter(src) {
    const inputDir = path.dirname(this.page.inputPath);
    const imagePath = path.resolve(inputDir, src);
    const outputDir = path.dirname(this.page.outputPath);
    const urlPath = this.page.url;
  
    const stats = await Image(imagePath, {
      widths: [1200],
      formats: ["jpg", "png"],
      outputDir: outputDir,
      urlPath: urlPath,
      filenameFormat: (hash, src, width, format) => `${hash}-${width}.${format}`,
    });
    
    return stats.jpeg[0].url;
  }
}

// Configuration object
export const config = {
  templateFormats: [
    "md",
    "njk",
    "html",
    "liquid",
    "11ty.js",
    "webc"
  ],
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  webcTemplateEngine: "webc",
  dir: {
    input: "site",
    includes: "/_includes",
    svg: "/svg",
    data: "/_data",
    output: "dist"
  },
};