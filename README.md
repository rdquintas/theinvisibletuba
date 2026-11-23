

This is the repo for the website: 

# [theinvisibletuba.com](http://www.theinvisibletuba.com)


## Some details
- uses [Nunjucks](https://mozilla.github.io/nunjucks/) templates (in ``/app``), rendered by ``build.js``
- uses [grt-youtube-popup](https://grt107.github.io/grt-youtube-popup/) GRT Youtube Popup - jQuery Plugin 



## How to build ?
- ``npm install`` once
- ``npm run build`` for a full build (images, html and sitemap), or ``npm run html`` for the html only
- or launch ``npm run watch`` and edit the files inside the ``/app`` folder: the html is rebuilt automatically into the root folder
- **NEVER EDIT** the html files on the root folder (or in ``/concerts``) as they will be overwritten by the build
- to add new html files just add them to ``PAGE_FILES`` in ``build.js``
- I have created a npm script on ``package.json`` that should be executed like this
  
  ``npm run git -- 'message here'``

  this will do a git add, git commit and git push

## How to deploy ?

The site is hosted on [Netlify](https://www.netlify.com/) (see ``netlify.toml``):

- every push to the deployed branch triggers a build (``npm run netlify``), which publishes the ``dist`` folder (the site without the development files)
- ``.avif`` / ``.webp`` images are **not** generated on Netlify: run ``npm run build`` locally and commit them
- the shop checkout is the Netlify Function ``netlify/functions/create-checkout-session.mjs``; set the ``STRIPE_SECRET_KEY`` environment variable in the Netlify site settings