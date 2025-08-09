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
import pluginFilters from "./_config/filters.js";
import eleventyAutoCacheBuster from "eleventy-auto-cache-buster";
import Image from '@11ty/eleventy-img';
import path from 'node:path';
import fs from "node:fs";

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
      base: "https://my.stuffandthings.lol/",
      author: {
        name: "Jason"
      }
    }
  };
  
  return { ...baseConfig, ...options };
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
  
  // --- Feed plugins ---
  eleventyConfig.addPlugin(feedPlugin, createFeedConfig({
    type: "atom",
    outputPath: "/feed/feed.xml",
    templateData: {
      eleventyNavigation: {
        key: "Feed",
        order: 8
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
    urlPath: "/img/built/",
		outputDir: ".cache/@11ty/img/",
    formats: ["avif", "webp", "jpg", "png", "auto"],
    widths: ["auto"],
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    }
  });

  // --- Custom filters ---
  eleventyConfig.addFilter("contentImgUrlFilter", contentImgUrlFilter);
  eleventyConfig.addFilter("dateToFormat", function(date, format) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  process.env.ELEVENTY_FETCH_TIMEOUT = 10000;

  // --- Custom shortcodes ---
  eleventyConfig.addShortcode("currentBuildDate", () => new Date().toISOString());

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