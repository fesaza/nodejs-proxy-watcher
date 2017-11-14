'use strict';
var chokidar = require('chokidar');
var client = require('./store');
var pm2 = require('pm2');
var colors = require('colors/safe');

//aplications folder name, defaults 'nodeapps'
var folder = 'nodeapps'; 
//ignore some paths like node_modules, eg:
var ignores = ['client','package.json','node_modules','.DS_Store','nodeapps'] 
//cache to avoid duplicate applications
var cache = []; 

pm2.connect(err =>{
    if (err) {
        console.error(err);
        process.exit(2);
    }
});

var flushapp = (app)=>{
   cache.splice(cache.indexOf(app),1);
};

var flushcache = () => {
    console.log('cleaning cache');
    while(cache.length > 0) {
        cache.pop();
    }
}

var cacheapp = (app)=>{
    cache.push(app);
}

var addApp = (path)=>{
    path = path.replace(`${folder}/`,'');
    //Ignore subdir
    if(path.split('/').length > 1) return; 
    if(ignores.some(x => x == path)) return;
    if(cache.some(x=> x == path)) return;
    cacheapp(path);
    pm2.describe(path,(err,processDescription)=>{
        if(err) {
            console.log(colors.red('error on status application search' + path));
            return;
        };
        var port, _data;
        _data = {
            appname: path
        }
        if(processDescription.length == 0 || processDescription[0].pm2_env.status != 'online'){        
            var max = process.env.MAXPORT || 9500;
            var min = process.env.MINPORT || 9092;
            port = Math.floor(Math.random() * (max - min) + min);
            _data.port= port;
            startapp(_data);
        }else{
            port = processDescription[0].pm2_env.PORT;
            console.log(colors.green(`The application ${path} is already running on port ${port}`));
            _data.port= port;
            flushapp(path);
        }
        
        var data = client.findOne({'name':path});
        if (!data) {
            client.insert(_data);
            console.log(`Application ${path} inserted on port ${port}`);
        }else{
            data.port = port;
            client.update(data);
            console.log('Port updated');
        }
    });
};

var startapp = (app)=>{
    
    console.log(`Starting ${app.appname}`);
    pm2.start({
        name: app.appname,
        script    : `${folder}/${app.appname}/index.js`,         // Script to be run
        exec_mode : 'fork',        // Allows your app to be clustered
        instances : 1,                // Optional: Scales your app by 4
        max_memory_restart : '400M',   // Optional: Restarts your app if it reaches 100Mo
        watch: true,
        env: {
            "NODE_ENV": 'development',
            "PORT": app.port,
            //Here you can define all variable needed by your application, e.g:
            //"URLNOTIFICATIONS": process.env.URLNOTIFICATIONS
        },
        //define environments
        env_production : {
            "NODE_ENV": "production",
            "PORT": app.port,
        }

    }, (err, apps) => {
        flushapp(app.appname);
        if (err) console.error(colors.red(`Error starting ${app.appname}, details: ${err}`));
        else console.log(colors.blue(`Application ${app.appname} started.`));
    });
}

var removeApp = (path) =>{
    path = path.replace(`${folder}/`,'');
    pm2.describe(path,(err,processDescription)=>{
        if(err) {
            console.log(colors.red('error getting application status' + path));
            return;
        };
        pm2.delete(path, (err, apps)=> {
            if(err)
                console.log(colors.red(`Error deleting ${path}, details: ${err}`));
            else{
                var data = client.findOne({'name':path});
                if(data){
                    client.remove(data);
                }
                console.log(`Application ${path} deleted`);
            }
        });
    });
};

var watcher = function (pathfolder){
    if(pathfolder)
        folder = pathfolder;

    flushcache();
    var watcher = chokidar.watch(folder, {
        //files ignored on watch events
        ignored: [/(^|[\/\\])\../,/node_modules/,/client/,'package.json'],
        persistent: true
    });

    //Subscribe events
    //When a dir was added to be watched on folder apps
    watcher.on('addDir', addApp);
    //when a dir was removed
    watcher.on('unlinkDir',removeApp);
}

module.exports = watcher;
