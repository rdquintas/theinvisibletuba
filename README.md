

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