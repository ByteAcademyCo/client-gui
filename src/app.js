"use strict";

var path = require('path');         // https://nodejs.org/api/path.html
var url = require('url');           // https://nodejs.org/api/url.html


const configureStore = require('./shared/store/configureStore');
const log = require('electron-log');
const platform = require('os').platform();

const { 
    ipcMain, app, protocol, Menu
} = require('electron');


// this should be placed at top of app.js to handle setup events quickly
if (handleSquirrelEvent(app)) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

// Squirrel event handler
function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            application.quit();
            return true;
    }
};


const { registry } = require('electron-redux');

const pages = require('./pages.js');

const { ipfsStop, isOnline } = require("./api/process_ipfs");

const actions = require("./shared/actions");

// we have to do this to ease remote-loading of the initial state :(
global.state = {};





var start = function start(){
    const store = configureStore(global.state, 'main');

    store.subscribe(() => {
        // updates global state to current state
        global.state = store.getState();
    });


    store.dispatch(actions.ipfs.start());


    var throttle = function(callback, wait){
        callback();
        setTimeout(throttle, wait, callback, wait);
    };

    // this should probably be an action itself 
    var syncIpfs = function(){
        store.dispatch(actions.ipfs.syncIpfs());
    };
    
    throttle(function(){
        if (!store.getState().ipfs.isOnline){
            store.dispatch(actions.ipfs.isOnline());
        } else {
            syncIpfs();
        }
    }, 2000);




    // macOS
    // https://electronjs.org/docs/api/app#appdockseticonimage-macos
    if (platform === "darwin"){
        // Seems to hate my .icns
        app.dock.setIcon(path.resolve(__dirname, "public/img/icon.png"));
    }

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }

        // Testing quit functionality on Mac
        app.quit();
    });

    app.on('quit', () => {
        // make this a dispatch?
        ipfsStop();
    });


    app.on('activate', (event, hasVisibleWindows) => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        // move
        if (!pages.hasWindows()) {
            pages.createMainWindow();
        } else if (hasVisibleWindows) {
            event.preventDefault();
        }
    });

    pages.createMainWindow();
};

app.on('ready', function(){
    
    start();


    if(platform==="darwin"){
     // Create the Application's main menu
     var template = [{
        label: "Application",
        submenu: [
            { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]}
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
});



