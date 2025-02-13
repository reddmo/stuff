---
title: O(M)G Images
description: Getting og:image to work with a plugin and some grit
date: 2025-01-15
draft: false
tags:
 - og-image
 - 11ty
image: openg.png
---
> [!NOTE]
> 02/13/2025
> I no longer use this method but, rather, have used [this helpful article](https://notes.jays.net/blog/11ty/) instead.


This was a tricky one. A few days ago I started working on opengraph images for my website. I hit a snag and after a quick post on the [11ty](https://11ty.dev) Discord channel, it was resolved. I wasn't passing the absolute URL for my site to it and, at the time, I was just using a static image for all posts. 

Fast forward a day and I wanted to automate it. The goal from the beginning was to eventually use the [Eleventy Plugin Og Image](https://github.com/KiwiKilian/eleventy-plugin-og-image). I had read a few posts, including [Robb Knight's](https://rknight.me/blog/generating-and-caching-open-graph-images-with-eleventy/) on the matter and figured I'd spin it up quickly. I wasn't quite yet interested in caching because a lengthier build time isn't a deal-breaker for me at the moment. I can push the changes and let Cloudflare do its thing and move on. (Right now build time is about 10 minutes. I will eventually work on caching this but that's for another day. Maybe today, who knows.) 