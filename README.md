

This is the repo for the website:

# [theinvisibletuba.com](http://www.theinvisibletuba.com)


## Some details
- uses [grunt-bake](https://github.com/roboshoes/grunt-bake) plugin, to concatenate all those boring html files
- uses [git-ftp](https://github.com/git-ftp/git-ftp) to deploy using FTP from the console 


## How to build ?
- just launch ``grunt watch`` (or just run ``grunt bake`` for single operation only)
- and then edit the html files inside the ``/app`` folder and they will be concataned automatically to the root folder
- **NEVER EDIT** the html files on the root folder as they will be overwritten by the ``grunt watch``
- to add new html files just configure and add them to the file ``Gruntfile.js``

## How to deploy with GIT FTP ?

- ### Setup
  ``git config git-ftp.url "ftp://ftp.example.net:21/public_html"``

  ``git config git-ftp.user "ftp-user"``
  
  ``git config git-ftp.password "secr3t"``

- ### Or if the files are already there
  ``git ftp catchup``

- ### Work and deploy
  ``echo "new content" >> index.txt``

  ``git commit index.txt -m "Add new content"``

  ``git ftp push``