# nodejs-proxy-watcher

It is a component that is constantly observing a folder to determine which applications should automatically deploy to a local [pm2](https://github.com/Unitech/pm2) instance

So, each new folder \(application\) placed in the applications folder \(you can define your folder apps in '/lib/watcher.js'\, replace the next line with your folder name `var folder = 'nodeapps';`), the watcher automatically raises it as a new application on pm2



