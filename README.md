

This is the repo for the website: 

# [theinvisibletuba.com](http://www.theinvisibletuba.com)


## Some details
- uses [grunt-bake](https://github.com/roboshoes/grunt-bake) plugin, to concatenate all those boring html files
- uses [grt-youtube-popup](https://grt107.github.io/grt-youtube-popup/) GRT Youtube Popup - jQuery Plugin 



## How to build ?
- just launch ``grunt watch`` (or just run ``grunt bake`` for single operation only)
- and then edit the html files inside the ``/app`` folder and they will be concataned automatically to the root folder
- **NEVER EDIT** the html files on the root folder as they will be overwritten by the ``grunt watch``
- to add new html files just configure and add them to the file ``Gruntfile.js``
- I have created a npm script on ``package.json`` that should be executed like this
  
  ``npm run git -- 'message here'``

  this will do a git add, git commit and git push